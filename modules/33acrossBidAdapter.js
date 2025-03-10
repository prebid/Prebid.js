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

// **************************** UTILS ************************** //
const BIDDER_CODE = '33across';
const BIDDER_ALIASES = ['33across_mgni'];
const END_POINT = 'https://ssc.33across.com/api/v1/hb';
const SYNC_ENDPOINT = 'https://ssc-cms.33across.com/ps/?m=xch&rt=html&ru=deb';

const CURRENCY = 'USD';
const GVLID = 58;
const GUID_PATTERN = /^[a-zA-Z0-9_-]{22}$/;

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
  uniqueSiteIds: []
};

const NON_MEASURABLE = 'nm';

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
    _validateBasic(bid) &&
    _validateBanner(bid) &&
    _validateVideo(bid)
  );
}

function _validateBasic(bid) {
  if (!bid.params) {
    return false;
  }

  if (!_validateGUID(bid)) {
    return false;
  }

  return true;
}

function _validateGUID(bid) {
  const siteID = deepAccess(bid, 'params.siteId', '') || '';
  if (siteID.trim().match(GUID_PATTERN) === null) {
    return false;
  }

  return true;
}

function _validateBanner(bid) {
  const banner = deepAccess(bid, 'mediaTypes.banner');

  // If there's no banner no need to validate against banner rules
  if (banner === undefined) {
    return true;
  }

  if (!Array.isArray(banner.sizes)) {
    return false;
  }

  return true;
}

function _validateVideo(bid) {
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
  const {
    ttxSettings,
    gdprConsent,
    uspConsent,
    gppConsent,
    pageUrl,
    referer
  } = _buildRequestParams(bidRequests, bidderRequest);

  const groupedRequests = _buildRequestGroups(ttxSettings, bidRequests);

  const serverRequests = [];

  for (const key in groupedRequests) {
    serverRequests.push(
      _createServerRequest({
        bidRequests: groupedRequests[key],
        gdprConsent,
        uspConsent,
        gppConsent,
        pageUrl,
        referer,
        ttxSettings,
        bidderRequest,
      })
    )
  }

  return serverRequests;
}

function _buildRequestParams(bidRequests, bidderRequest) {
  const ttxSettings = getTTXConfig();

  const gdprConsent = Object.assign({
    consentString: undefined,
    gdprApplies: false
  }, bidderRequest.gdprConsent);

  adapterState.uniqueSiteIds = bidRequests.map(req => req.params.siteId).filter(uniques);

  return {
    ttxSettings,
    gdprConsent,
    uspConsent: bidderRequest.uspConsent,
    gppConsent: bidderRequest.gppConsent,
    pageUrl: bidderRequest.refererInfo?.page,
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
  return `${bidRequest.params.siteId}:${bidRequest.params.productId}`;
}

function _getMRAKey(bidRequest) {
  return `${bidRequest.bidId}`;
}

// Infer the necessary data from valid bid for a minimal ttxRequest and create HTTP request
function _createServerRequest({ bidRequests, gdprConsent = {}, uspConsent, gppConsent = {}, pageUrl, referer, ttxSettings, bidderRequest }) {
  const firstBidRequest = bidRequests[0];
  const { siteId, test } = firstBidRequest.params;

  const ttxRequest = collapseFalsy({
    imp: bidRequests.map(req => _buildImpORTB(req)),
    site: {
      id: siteId,
      page: pageUrl,
      ref: referer
    },
    device: {
      ext: {
        ttx: {
          ...getScreenDimensions(),
          vp: getViewportDimensions(),
        }
      },
      sua: firstBidRequest.ortb2?.device?.sua
    },
    id: bidderRequest.bidderRequestId,
    user: {
      ext: {
        eids: firstBidRequest.userIdAsEids,
        consent: gdprConsent.consentString
      }
    },
    regs: {
      coppa: Number(!!config.getConfig('coppa')),
      gpp: gppConsent.gppString,
      gpp_sid: gppConsent.applicableSections,
      gdpr: Number(gdprConsent.gdprApplies),
      us_privacy: uspConsent
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
    source: {
      ext: {
        schain: firstBidRequest.schain
      }
    },
    test: test === 1 ? 1 : null
  });

  // Return the server request
  return {
    'method': 'POST',
    'url': ttxSettings.url || `${END_POINT}?guid=${siteId}`, // Allow the ability to configure the HB endpoint for testing purposes.
    'data': JSON.stringify(ttxRequest),
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

  const minSize = _getMinSize(sizes);

  const viewabilityAmount = _isViewabilityMeasurable(element)
    ? _getViewability(element, getWindowTop(), minSize)
    : NON_MEASURABLE;

  return {
    format,
    ext: contributeViewability(viewabilityAmount)
  };
}

// Placement Inference Rules:
// - If no placement is defined then default to 2 (In Banner)
// - If the old deprecated field is defined, use its value for the recent placement field
const calculateVideoPlcmtAttribute = (placement) => {
  const IN_BANNER_PLACEMENT_VALUE = 2;

  if (placement) {
    logWarn('[33Across Adapter] The ORTB field `placement` is deprecated, please use `plcmt` instead');

    return placement;
  }

  return IN_BANNER_PLACEMENT_VALUE;
}

// BUILD REQUESTS: VIDEO
// eslint-disable-next-line no-unused-vars
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

  video.plcmt ??= calculateVideoPlcmtAttribute(video.placement);

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
  return !_isIframe() && element !== null;
}

function _getViewability(element, topWin, { w, h } = {}) {
  return topWin.document.visibilityState === 'visible'
    ? _getPercentInView(element, topWin, { w, h })
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

function _getMinSize(sizes) {
  return sizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min);
}

function _getBoundingBox(element, { w, h } = {}) {
  let { width, height, left, top, right, bottom } = element.getBoundingClientRect();

  if ((width === 0 || height === 0) && w && h) {
    width = w;
    height = h;
    right = left + w;
    bottom = top + h;
  }

  return { width, height, left, top, right, bottom };
}

function _getIntersectionOfRects(rects) {
  const bbox = {
    left: rects[0].left,
    right: rects[0].right,
    top: rects[0].top,
    bottom: rects[0].bottom
  };

  for (let i = 1; i < rects.length; ++i) {
    bbox.left = Math.max(bbox.left, rects[i].left);
    bbox.right = Math.min(bbox.right, rects[i].right);

    if (bbox.left >= bbox.right) {
      return null;
    }

    bbox.top = Math.max(bbox.top, rects[i].top);
    bbox.bottom = Math.min(bbox.bottom, rects[i].bottom);

    if (bbox.top >= bbox.bottom) {
      return null;
    }
  }

  bbox.width = bbox.right - bbox.left;
  bbox.height = bbox.bottom - bbox.top;

  return bbox;
}

function _getPercentInView(element, topWin, { w, h } = {}) {
  const elementBoundingBox = _getBoundingBox(element, { w, h });

  // Obtain the intersection of the element and the viewport
  const elementInViewBoundingBox = _getIntersectionOfRects([ {
    left: 0,
    top: 0,
    right: topWin.innerWidth,
    bottom: topWin.innerHeight
  }, elementBoundingBox ]);

  let elementInViewArea,
    elementTotalArea;

  if (elementInViewBoundingBox !== null) {
    // Some or all of the element is in view
    elementInViewArea = elementInViewBoundingBox.width * elementInViewBoundingBox.height;
    elementTotalArea = elementBoundingBox.width * elementBoundingBox.height;

    return ((elementInViewArea / elementTotalArea) * 100);
  }

  // No overlap between element and the viewport; therefore, the element
  // lies completely out of view
  return 0;
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

function _isIframe() {
  try {
    return getWindowSelf() !== getWindowTop();
  } catch (e) {
    return true;
  }
}

// **************************** INTERPRET RESPONSE ******************************** //
function interpretResponse(serverResponse, bidRequest) {
  const { seatbid, cur = 'USD' } = serverResponse.body;

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
    ttl: bid.ttl || 60,
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
      ? adapterState.uniqueSiteIds.map((siteId) => _createSync({ gdprConsent, uspConsent, gppConsent, siteId }))
      : ([])
  );

  // Clear adapter state of siteID's since we don't need this info anymore.
  adapterState.uniqueSiteIds = [];

  return syncUrls;
}

// Sync object will always be of type iframe for TTX
function _createSync({ siteId = 'zzz000000000003zzz', gdprConsent = {}, uspConsent, gppConsent = {} }) {
  const ttxSettings = getTTXConfig();
  const syncUrl = ttxSettings.syncUrl || SYNC_ENDPOINT;

  const { consentString, gdprApplies } = gdprConsent;
  const { gppString = '', applicableSections = [] } = gppConsent;

  const sync = {
    type: 'iframe',
    url: `${syncUrl}&id=${siteId}&gdpr_consent=${encodeURIComponent(consentString)}&us_privacy=${encodeURIComponent(uspConsent)}&gpp=${encodeURIComponent(gppString)}&gpp_sid=${encodeURIComponent(applicableSections.join(','))}`
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

function getScreenDimensions() {
  const {
    innerWidth: windowWidth,
    innerHeight: windowHeight,
    screen
  } = getWindowSelf();

  const [biggerDimension, smallerDimension] = [
    Math.max(screen.width, screen.height),
    Math.min(screen.width, screen.height),
  ];

  if (windowHeight > windowWidth) { // Portrait mode
    return {
      w: smallerDimension,
      h: biggerDimension,
    };
  }

  // Landscape mode
  return {
    w: biggerDimension,
    h: smallerDimension,
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
