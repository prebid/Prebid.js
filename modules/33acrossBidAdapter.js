import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {
  deepAccess,
  getWindowSelf,
  getWindowTop,
  isArray,
  isGptPubadsDefined,
  logInfo,
  logWarn,
  mergeDeep,
  uniques
} from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {isSlotMatchingAdUnitCode} from '../libraries/gptUtils/gptUtils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { percentInView } from '../libraries/percentInView/percentInView.js';
import {getMinSize} from '../libraries/sizeUtils/sizeUtils.js';
import {isIframe} from '../libraries/omsUtils/index.js';

// **************************** UTILS ************************** //
const BIDDER_CODE = '33across';
const BIDDER_ALIASES = ['33across_mgni'];
const END_POINT = 'https://ssc.33across.com/api/v1/hb';
const SYNC_ENDPOINT = 'https://ssc-cms.33across.com/ps/?m=xch&rt=html&ru=deb';

const CURRENCY = 'USD';
const GVLID = 58;
const GUID_PATTERN = /^[a-zA-Z0-9_-]{22}$/;
const DEFAULT_TTL = 60;
const DEFAULT_NET_REVENUE = true;

const PRODUCT = {
  SIAB: 'siab',
  INVIEW: 'inview',
  INSTREAM: 'instream'
};

const VIDEO_ORTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'placement',
  'plcmt',
  'protocols',
  'startdelay',
  'skip',
  'skipmin',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity',
  'rqddurs',
  'maxseq',
  'poddur',
  'podid',
  'podseq',
  'mincpmpersec',
  'slotinpod'
];

const adapterState = {
  uniqueZoneIds: []
};

const NON_MEASURABLE = 'nm';

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_TTL,
    currency: CURRENCY
  }
});

function getTTXConfig() {
  return Object.assign({}, config.getConfig('ttxSettings'));
}

function collapseFalsy(obj) {
  const data = Array.isArray(obj) ? [ ...obj ] : Object.assign({}, obj);
  const falsyValuesToCollapse = [ null, undefined, '' ];

  for (const key in data) {
    if (falsyValuesToCollapse.includes(data[key]) || (Array.isArray(data[key]) && data[key].length === 0)) {
      delete data[key];
    } else if (typeof data[key] === 'object') {
      data[key] = collapseFalsy(data[key]);

      if (Object.entries(data[key]).length === 0) {
        delete data[key];
      }
    }
  }

  return data;
}

// **************************** VALIDATION *************************** //
function isBidRequestValid(bid) {
  return (
    hasValidBasicProperties(bid) &&
    hasValidBannerProperties(bid) &&
    hasValidVideoProperties(bid)
  );
}

function hasValidBasicProperties(bid) {
  if (!bid.params) {
    return false;
  }

  return hasValidGUID(bid);
}

function hasValidGUID(bid) {
  const zoneId = deepAccess(bid, 'params.zoneId', '') ||
    deepAccess(bid, 'params.siteId', '') ||
    '';

  return zoneId.trim().match(GUID_PATTERN) !== null;
}

function hasValidBannerProperties(bid) {
  const banner = deepAccess(bid, 'mediaTypes.banner');

  // If there's no banner no need to validate against banner rules
  if (banner === undefined) {
    return true;
  }

  return Array.isArray(banner.sizes);
}

function hasValidVideoProperties(bid) {
  const videoAdUnit = deepAccess(bid, 'mediaTypes.video');
  const videoBidderParams = deepAccess(bid, 'params.video', {});

  // If there's no video no need to validate against video rules
  if (videoAdUnit === undefined) {
    return true;
  }

  if (!Array.isArray(videoAdUnit.playerSize)) {
    return false;
  }

  if (!videoAdUnit.context) {
    return false;
  }

  const videoParams = {
    ...videoAdUnit,
    ...videoBidderParams
  };

  if (!Array.isArray(videoParams.mimes) || videoParams.mimes.length === 0) {
    return false;
  }

  if (!Array.isArray(videoParams.protocols) || videoParams.protocols.length === 0) {
    return false;
  }

  // If placement if defined, it must be a number
  if ([ videoParams.placement, videoParams.plcmt ].some(value => (
    typeof value !== 'undefined' &&
    typeof value !== 'number'
  ))) {
    return false;
  }

  // If startdelay is defined it must be a number
  if (
    videoAdUnit.context === 'instream' &&
    typeof videoParams.startdelay !== 'undefined' &&
    typeof videoParams.startdelay !== 'number'
  ) {
    return false;
  }

  return true;
}

// **************************** BUILD REQUESTS *************************** //
function buildRequests(bidRequests, bidderRequest = {}) {
  const convertedORTB = converter.toORTB({bidRequests, bidderRequest});
  const {
    ttxSettings,
    gdprConsent,
    referer
  } = _buildRequestParams(bidRequests, bidderRequest);

  const groupedRequests = _buildRequestGroups(ttxSettings, bidRequests);

  const serverRequests = [];

  for (const key in groupedRequests) {
    serverRequests.push(
      _createServerRequest({
        bidRequests: groupedRequests[key],
        gdprConsent,
        referer,
        ttxSettings,
        convertedORTB
      })
    );
  }

  return serverRequests;
}

function _buildRequestParams(bidRequests, bidderRequest) {
  const ttxSettings = getTTXConfig();

  const gdprConsent = Object.assign({
    consentString: undefined,
    gdprApplies: false
  }, bidderRequest.gdprConsent);

  adapterState.uniqueZoneIds = bidRequests.map(req => (req.params.zoneId || req.params.siteId)).filter(uniques);

  return {
    ttxSettings,
    gdprConsent,
    referer: bidderRequest.refererInfo?.ref
  }
}

function _buildRequestGroups(ttxSettings, bidRequests) {
  const bidRequestsComplete = bidRequests.map(_inferProduct);
  const enableSRAMode = ttxSettings.enableSRAMode;
  const keyFunc = (enableSRAMode === true) ? _getSRAKey : _getMRAKey;

  return _groupBidRequests(bidRequestsComplete, keyFunc);
}

function _groupBidRequests(bidRequests, keyFunc) {
  const groupedRequests = {};

  bidRequests.forEach((req) => {
    const key = keyFunc(req);

    groupedRequests[key] = groupedRequests[key] || [];
    groupedRequests[key].push(req);
  });

  return groupedRequests;
}

function _getSRAKey(bidRequest) {
  const zoneId = bidRequest.params.zoneId || bidRequest.params.siteId;

  return `${zoneId}:${bidRequest.params.productId}`;
}

function _getMRAKey(bidRequest) {
  return `${bidRequest.bidId}`;
}

// Infer the necessary data from valid bid for a minimal ttxRequest and create HTTP request
function _createServerRequest({ bidRequests, gdprConsent = {}, referer, ttxSettings, convertedORTB }) {
  const firstBidRequest = bidRequests[0];
  const { siteId, zoneId = siteId, test } = firstBidRequest.params;
  const ttxRequest = collapseFalsy({
    imp: bidRequests.map(req => _buildImpORTB(req)),
    device: {
      ext: {
        ttx: {
          vp: getViewportDimensions()
        }
      },
    },
    regs: {
      gdpr: Number(gdprConsent.gdprApplies)
    },
    ext: {
      ttx: {
        prebidStartedAt: Date.now(),
        caller: [ {
          'name': 'prebidjs',
          'version': '$prebid.version$'
        } ]
      }
    },
    test: test === 1 ? 1 : null
  });

  if (convertedORTB.app) {
    ttxRequest.app = {
      ...convertedORTB.app,
      id: zoneId
    };
  } else {
    ttxRequest.site = {
      ...convertedORTB.site,
      id: zoneId,
      ref: referer
    };
  }
  // The imp attribute built from this adapter should be used instead of the converted one;
  // The converted one is based on SRA, whereas our adapter has to check if SRA is enabled or not.
  delete convertedORTB.imp;
  const data = JSON.stringify(mergeDeep(ttxRequest, convertedORTB));

  // Return the server request
  return {
    'method': 'POST',
    'url': ttxSettings.url || `${END_POINT}?guid=${zoneId}`, // Allow the ability to configure the HB endpoint for testing purposes.
    'data': data,
    'options': {
      contentType: 'text/plain',
      withCredentials: true
    }
  };
}

// BUILD REQUESTS: IMP
function _buildImpORTB(bidRequest) {
  return collapseFalsy({
    id: bidRequest.bidId,
    ext: {
      ttx: {
        prod: deepAccess(bidRequest, 'params.productId')
      },
      gpid: deepAccess(bidRequest, 'ortb2Imp.ext.gpid')
    },
    banner: deepAccess(bidRequest, 'mediaTypes.banner') ? { ..._buildBannerORTB(bidRequest) } : null,
    video: deepAccess(bidRequest, 'mediaTypes.video') ? _buildVideoORTB(bidRequest) : null
  });
}

// BUILD REQUESTS: SIZE INFERENCE
function _transformSizes(sizes) {
  if (isArray(sizes) && sizes.length === 2 && !isArray(sizes[0])) {
    return [ _getSize(sizes) ];
  }

  return sizes.map(_getSize);
}

function _getSize(size) {
  return {
    w: parseInt(size[0], 10),
    h: parseInt(size[1], 10)
  }
}

// BUILD REQUESTS: PRODUCT INFERENCE
function _inferProduct(bidRequest) {
  return mergeDeep({}, bidRequest, {
    params: {
      productId: _getProduct(bidRequest)
    }
  });
}

function _getProduct(bidRequest) {
  const { params, mediaTypes } = bidRequest;

  const { banner, video } = mediaTypes;

  if ((video && !banner) && video.context === 'instream') {
    return PRODUCT.INSTREAM;
  }

  return (params.productId === PRODUCT.INVIEW) ? (params.productId) : PRODUCT.SIAB;
}

// BUILD REQUESTS: BANNER
function _buildBannerORTB(bidRequest) {
  const bannerAdUnit = deepAccess(bidRequest, 'mediaTypes.banner', {});
  const element = _getAdSlotHTMLElement(bidRequest.adUnitCode);

  const sizes = _transformSizes(bannerAdUnit.sizes);

  // We support size based bidfloors so obtain one if there's a rule associated
  const format = typeof bidRequest.getFloor === 'function'
    ? sizes.map((size) => {
      const bidfloors = _getBidFloors(bidRequest, size, BANNER);

      let formatExt;
      if (bidfloors) {
        formatExt = {
          ext: {
            ttx: {
              bidfloors: [ bidfloors ]
            }
          }
        }
      }

      return Object.assign({}, size, formatExt);
    })
    : sizes;

  const minSize = getMinSize(sizes);

  const viewabilityAmount = _isViewabilityMeasurable(element)
    ? _getViewability(element, getWindowTop(), minSize)
    : NON_MEASURABLE;

  return {
    format,
    ext: contributeViewability(viewabilityAmount)
  };
}

// BUILD REQUESTS: VIDEO
function _buildVideoORTB(bidRequest) {
  const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = deepAccess(bidRequest, 'params.video', {});

  const videoParams = {
    ...videoAdUnit,
    ...videoBidderParams // Bidder Specific overrides
  };

  const videoPlayerSize = _getSize(videoParams.playerSize[0]);
  const video = {
    w: videoPlayerSize.w,
    h: videoPlayerSize.h
  };

  // Obtain all ORTB params related video from Ad Unit
  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      video[param] = videoParams[param];
    }
  });

  if (_getProduct(bidRequest) === PRODUCT.INSTREAM) {
    video.startdelay = video.startdelay || 0;
  }

  // bidfloors
  if (typeof bidRequest.getFloor === 'function') {
    const bidfloors = _getBidFloors(bidRequest, { w: video.w, h: video.h }, VIDEO);

    if (bidfloors) {
      Object.assign(video, {
        ext: {
          ttx: {
            bidfloors: [ bidfloors ]
          }
        }
      });
    }
  }

  return video;
}

// BUILD REQUESTS: BIDFLOORS
function _getBidFloors(bidRequest, size, mediaType) {
  const bidFloors = bidRequest.getFloor({
    currency: CURRENCY,
    mediaType,
    size: [ size.w, size.h ]
  });

  if (!isNaN(bidFloors?.floor) && (bidFloors?.currency === CURRENCY)) {
    return bidFloors.floor;
  }
}

// BUILD REQUESTS: VIEWABILITY
function _isViewabilityMeasurable(element) {
  return !isIframe() && element !== null;
}

function _getViewability(element, topWin, { w, h } = {}) {
  return topWin.document.visibilityState === 'visible'
    ? percentInView(element, { w, h })
    : 0;
}

function _mapAdUnitPathToElementId(adUnitCode) {
  if (isGptPubadsDefined()) {
    // eslint-disable-next-line no-undef
    const adSlots = googletag.pubads().getSlots();
    const isMatchingAdSlot = isSlotMatchingAdUnitCode(adUnitCode);

    for (let i = 0; i < adSlots.length; i++) {
      if (isMatchingAdSlot(adSlots[i])) {
        const id = adSlots[i].getSlotElementId();

        logInfo(`[33Across Adapter] Map ad unit path to HTML element id: '${adUnitCode}' -> ${id}`);

        return id;
      }
    }
  }

  logWarn(`[33Across Adapter] Unable to locate element for ad unit code: '${adUnitCode}'`);

  return null;
}

function _getAdSlotHTMLElement(adUnitCode) {
  return document.getElementById(adUnitCode) ||
    document.getElementById(_mapAdUnitPathToElementId(adUnitCode));
}

/**
 * Viewability contribution to request..
 */
function contributeViewability(viewabilityAmount) {
  const amount = isNaN(viewabilityAmount) ? viewabilityAmount : Math.round(viewabilityAmount);

  return {
    ttx: {
      viewability: {
        amount
      }
    }
  };
}

// **************************** INTERPRET RESPONSE ******************************** //
function interpretResponse(serverResponse) {
  const { seatbid, cur = CURRENCY } = serverResponse.body;

  if (!isArray(seatbid)) {
    return [];
  }

  // Pick seats with valid bids and convert them into an Array of responses
  // in format expected by Prebid Core
  return seatbid
    .filter((seat) => (
      isArray(seat.bid) &&
      seat.bid.length > 0
    ))
    .reduce((acc, seat) => {
      return acc.concat(
        seat.bid.map((bid) => _createBidResponse(bid, cur))
      );
    }, []);
}

function _createBidResponse(bid, cur) {
  const isADomainPresent = bid.adomain?.length;
  const bidResponse = {
    requestId: bid.impid,
    cpm: bid.price,
    width: bid.w,
    height: bid.h,
    ad: bid.adm,
    ttl: bid.ttl || DEFAULT_TTL,
    creativeId: bid.crid,
    mediaType: deepAccess(bid, 'ext.ttx.mediaType', BANNER),
    currency: cur,
    netRevenue: true
  }

  if (isADomainPresent) {
    bidResponse.meta = {
      advertiserDomains: bid.adomain
    };
  }

  if (bidResponse.mediaType === VIDEO) {
    const vastType = deepAccess(bid, 'ext.ttx.vastType', 'xml');

    if (vastType === 'xml') {
      bidResponse.vastXml = bidResponse.ad;
    } else {
      bidResponse.vastUrl = bidResponse.ad;
    }
  }

  return bidResponse;
}

// **************************** USER SYNC *************************** //
// Register one sync per unique guid so long as iframe is enable
// Else no syncs
// For logic on how we handle gdpr data see _createSyncs and module's unit tests
// '33acrossBidAdapter#getUserSyncs'
function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
  const syncUrls = (
    (syncOptions.iframeEnabled)
      ? adapterState.uniqueZoneIds.map((zoneId) => _createSync({ gdprConsent, uspConsent, gppConsent, zoneId }))
      : ([])
  );

  // Clear adapter state of zone IDs since we don't need this info anymore.
  adapterState.uniqueZoneIds = [];

  return syncUrls;
}

// Sync object will always be of type iframe for TTX
function _createSync({ zoneId = 'zzz000000000003zzz', gdprConsent = {}, uspConsent, gppConsent = {} }) {
  const ttxSettings = getTTXConfig();
  const syncUrl = ttxSettings.syncUrl || SYNC_ENDPOINT;

  const { consentString, gdprApplies } = gdprConsent;
  const { gppString = '', applicableSections = [] } = gppConsent;

  const sync = {
    type: 'iframe',
    url: `${syncUrl}&id=${zoneId}&gdpr_consent=${encodeURIComponent(consentString)}&us_privacy=${encodeURIComponent(uspConsent)}&gpp=${encodeURIComponent(gppString)}&gpp_sid=${encodeURIComponent(applicableSections.join(','))}`
  };

  if (typeof gdprApplies === 'boolean') {
    sync.url += `&gdpr=${Number(gdprApplies)}`;
  }

  return sync;
}

function getTopMostAccessibleWindow() {
  let mostAccessibleWindow = getWindowSelf();

  try {
    while (mostAccessibleWindow.parent !== mostAccessibleWindow &&
      mostAccessibleWindow.parent.document) {
      mostAccessibleWindow = mostAccessibleWindow.parent;
    }
  } catch (err) {
    // Do not throw an exception if we can't access the topmost frame.
  }

  return mostAccessibleWindow;
}

function getViewportDimensions() {
  const topWin = getTopMostAccessibleWindow();
  const documentElement = topWin.document.documentElement;

  return {
    w: documentElement.clientWidth,
    h: documentElement.clientHeight,
  };
}

export const spec = {
  NON_MEASURABLE,

  code: BIDDER_CODE,
  aliases: BIDDER_ALIASES,
  supportedMediaTypes: [ BANNER, VIDEO ],
  gvlid: GVLID,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
