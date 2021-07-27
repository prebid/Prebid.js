import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import * as utils from '../src/utils.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = '33across';
const END_POINT = 'https://ssc.33across.com/api/v1/hb';
const SYNC_ENDPOINT = 'https://ssc-cms.33across.com/ps/?m=xch&rt=html&ru=deb';

const CURRENCY = 'USD';
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
  'protocols',
  'startdelay',
  'skip',
  'skipafter',
  'minbitrate',
  'maxbitrate',
  'delivery',
  'playbackmethod',
  'api',
  'linearity'
];

const adapterState = {
  uniqueSiteIds: []
};

const NON_MEASURABLE = 'nm';

// **************************** VALIDATION *************************** //
function isBidRequestValid(bid) {
  return (
    _validateBasic(bid) &&
    _validateBanner(bid) &&
    _validateVideo(bid)
  );
}

function _validateBasic(bid) {
  if (bid.bidder !== BIDDER_CODE || typeof bid.params === 'undefined') {
    return false;
  }

  if (!_validateGUID(bid)) {
    return false;
  }

  return true;
}

function _validateGUID(bid) {
  const siteID = utils.deepAccess(bid, 'params.siteId', '') || '';
  if (siteID.trim().match(GUID_PATTERN) === null) {
    return false;
  }

  return true;
}

function _validateBanner(bid) {
  const banner = utils.deepAccess(bid, 'mediaTypes.banner');
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
  const videoAdUnit = utils.deepAccess(bid, 'mediaTypes.video');
  const videoBidderParams = utils.deepAccess(bid, 'params.video', {});

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
  if (
    typeof videoParams.placement !== 'undefined' &&
    typeof videoParams.placement !== 'number'
  ) {
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
// NOTE: With regards to gdrp consent data, the server will independently
// infer the gdpr applicability therefore, setting the default value to false
function buildRequests(bidRequests, bidderRequest) {
  const gdprConsent = Object.assign({
    consentString: undefined,
    gdprApplies: false
  }, bidderRequest && bidderRequest.gdprConsent);

  const uspConsent = bidderRequest && bidderRequest.uspConsent;
  const pageUrl = (bidderRequest && bidderRequest.refererInfo) ? (bidderRequest.refererInfo.referer) : (undefined);

  adapterState.uniqueSiteIds = bidRequests.map(req => req.params.siteId).filter(utils.uniques);

  return bidRequests.map(bidRequest => _createServerRequest(
    {
      bidRequest,
      gdprConsent,
      uspConsent,
      pageUrl
    })
  );
}

// Infer the necessary data from valid bid for a minimal ttxRequest and create HTTP request
// NOTE: At this point, TTX only accepts request for a single impression
function _createServerRequest({bidRequest, gdprConsent = {}, uspConsent, pageUrl}) {
  const ttxRequest = {};
  const params = bidRequest.params;

  /*
   * Infer data for the request payload
   */
  ttxRequest.imp = [{}];

  if (utils.deepAccess(bidRequest, 'mediaTypes.banner')) {
    ttxRequest.imp[0].banner = {
      ..._buildBannerORTB(bidRequest)
    }
  }

  if (utils.deepAccess(bidRequest, 'mediaTypes.video')) {
    ttxRequest.imp[0].video = _buildVideoORTB(bidRequest);
  }

  ttxRequest.imp[0].ext = {
    ttx: {
      prod: _getProduct(bidRequest)
    }
  };

  ttxRequest.site = { id: params.siteId };

  if (pageUrl) {
    ttxRequest.site.page = pageUrl;
  }

  // Go ahead send the bidId in request to 33exchange so it's kept track of in the bid response and
  // therefore in ad targetting process
  ttxRequest.id = bidRequest.bidId;

  if (gdprConsent.consentString) {
    ttxRequest.user = setExtension(
      ttxRequest.user,
      'consent',
      gdprConsent.consentString
    )
  }

  if (Array.isArray(bidRequest.userIdAsEids) && bidRequest.userIdAsEids.length > 0) {
    ttxRequest.user = setExtension(
      ttxRequest.user,
      'eids',
      bidRequest.userIdAsEids
    )
  }

  ttxRequest.regs = setExtension(
    ttxRequest.regs,
    'gdpr',
    Number(gdprConsent.gdprApplies)
  );

  if (uspConsent) {
    ttxRequest.regs = setExtension(
      ttxRequest.regs,
      'us_privacy',
      uspConsent
    )
  }

  ttxRequest.ext = {
    ttx: {
      prebidStartedAt: Date.now(),
      caller: [ {
        'name': 'prebidjs',
        'version': '$prebid.version$'
      } ]
    }
  };

  if (bidRequest.schain) {
    ttxRequest.source = setExtension(
      ttxRequest.source,
      'schain',
      bidRequest.schain
    )
  }

  // Finally, set the openRTB 'test' param if this is to be a test bid
  if (params.test === 1) {
    ttxRequest.test = 1;
  }

  /*
   * Now construct the full server request
   */
  const options = {
    contentType: 'text/plain',
    withCredentials: true
  };

  // Allow the ability to configure the HB endpoint for testing purposes.
  const ttxSettings = config.getConfig('ttxSettings');
  const url = (ttxSettings && ttxSettings.url) || `${END_POINT}?guid=${params.siteId}`;

  // Return the server request
  return {
    'method': 'POST',
    'url': url,
    'data': JSON.stringify(ttxRequest),
    'options': options
  }
}

// BUILD REQUESTS: SET EXTENSIONS
function setExtension(obj = {}, key, value) {
  return Object.assign({}, obj, {
    ext: Object.assign({}, obj.ext, {
      [key]: value
    })
  });
}

// BUILD REQUESTS: SIZE INFERENCE
function _transformSizes(sizes) {
  if (utils.isArray(sizes) && sizes.length === 2 && !utils.isArray(sizes[0])) {
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
  const bannerAdUnit = utils.deepAccess(bidRequest, 'mediaTypes.banner', {});
  const element = _getAdSlotHTMLElement(bidRequest.adUnitCode);

  const sizes = _transformSizes(bannerAdUnit.sizes);

  let format;

  // We support size based bidfloors so obtain one if there's a rule associated
  if (typeof bidRequest.getFloor === 'function') {
    format = sizes.map((size) => {
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
    });
  } else {
    format = sizes;
  }

  const minSize = _getMinSize(sizes);

  const viewabilityAmount = _isViewabilityMeasurable(element)
    ? _getViewability(element, utils.getWindowTop(), minSize)
    : NON_MEASURABLE;

  const ext = contributeViewability(viewabilityAmount);

  return {
    format,
    ext
  }
}

// BUILD REQUESTS: VIDEO
// eslint-disable-next-line no-unused-vars
function _buildVideoORTB(bidRequest) {
  const videoAdUnit = utils.deepAccess(bidRequest, 'mediaTypes.video', {});
  const videoBidderParams = utils.deepAccess(bidRequest, 'params.video', {});

  const videoParams = {
    ...videoAdUnit,
    ...videoBidderParams // Bidder Specific overrides
  };

  const video = {}

  const {w, h} = _getSize(videoParams.playerSize[0]);
  video.w = w;
  video.h = h;

  // Obtain all ORTB params related video from Ad Unit
  VIDEO_ORTB_PARAMS.forEach((param) => {
    if (videoParams.hasOwnProperty(param)) {
      video[param] = videoParams[param];
    }
  });

  const product = _getProduct(bidRequest);

  // Placement Inference Rules:
  // - If no placement is defined then default to 2 (In Banner)
  // - If product is instream (for instream context) then override placement to 1
  video.placement = video.placement || 2;

  if (product === PRODUCT.INSTREAM) {
    video.startdelay = video.startdelay || 0;
    video.placement = 1;
  };

  // bidfloors
  if (typeof bidRequest.getFloor === 'function') {
    const bidfloors = _getBidFloors(bidRequest, {w: video.w, h: video.h}, VIDEO);

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

  if (!isNaN(bidFloors.floor) && (bidFloors.currency === CURRENCY)) {
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
  if (utils.isGptPubadsDefined()) {
    // eslint-disable-next-line no-undef
    const adSlots = googletag.pubads().getSlots();
    const isMatchingAdSlot = utils.isSlotMatchingAdUnitCode(adUnitCode);

    for (let i = 0; i < adSlots.length; i++) {
      if (isMatchingAdSlot(adSlots[i])) {
        const id = adSlots[i].getSlotElementId();

        utils.logInfo(`[33Across Adapter] Map ad unit path to HTML element id: '${adUnitCode}' -> ${id}`);

        return id;
      }
    }
  }

  utils.logWarn(`[33Across Adapter] Unable to locate element for ad unit code: '${adUnitCode}'`);

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
    return utils.getWindowSelf() !== utils.getWindowTop();
  } catch (e) {
    return true;
  }
}

// **************************** INTERPRET RESPONSE ******************************** //
// NOTE: At this point, the response from 33exchange will only ever contain one bid
// i.e. the highest bid
function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = [];

  // If there are bids, look at the first bid of the first seatbid (see NOTE above for assumption about ttx)
  if (serverResponse.body.seatbid.length > 0 && serverResponse.body.seatbid[0].bid.length > 0) {
    bidResponses.push(_createBidResponse(serverResponse.body));
  }

  return bidResponses;
}

// All this assumes that only one bid is ever returned by ttx
function _createBidResponse(response) {
  const isADomainPresent =
    response.seatbid[0].bid[0].adomain && response.seatbid[0].bid[0].adomain.length;
  const bid = {
    requestId: response.id,
    bidderCode: BIDDER_CODE,
    cpm: response.seatbid[0].bid[0].price,
    width: response.seatbid[0].bid[0].w,
    height: response.seatbid[0].bid[0].h,
    ad: response.seatbid[0].bid[0].adm,
    ttl: response.seatbid[0].bid[0].ttl || 60,
    creativeId: response.seatbid[0].bid[0].crid,
    mediaType: utils.deepAccess(response.seatbid[0].bid[0], 'ext.ttx.mediaType', BANNER),
    currency: response.cur,
    netRevenue: true
  }

  if (isADomainPresent) {
    bid.meta = {
      advertiserDomains: response.seatbid[0].bid[0].adomain
    };
  }

  if (bid.mediaType === VIDEO) {
    const vastType = utils.deepAccess(response.seatbid[0].bid[0], 'ext.ttx.vastType', 'xml');

    if (vastType === 'xml') {
      bid.vastXml = bid.ad;
    } else {
      bid.vastUrl = bid.ad;
    }
  }

  return bid;
}

// **************************** USER SYNC *************************** //
// Register one sync per unique guid so long as iframe is enable
// Else no syncs
// For logic on how we handle gdpr data see _createSyncs and module's unit tests
// '33acrossBidAdapter#getUserSyncs'
function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent) {
  const syncUrls = (
    (syncOptions.iframeEnabled)
      ? adapterState.uniqueSiteIds.map((siteId) => _createSync({ gdprConsent, uspConsent, siteId }))
      : ([])
  );

  // Clear adapter state of siteID's since we don't need this info anymore.
  adapterState.uniqueSiteIds = [];

  return syncUrls;
}

// Sync object will always be of type iframe for TTX
function _createSync({ siteId = 'zzz000000000003zzz', gdprConsent = {}, uspConsent }) {
  const ttxSettings = config.getConfig('ttxSettings');
  const syncUrl = (ttxSettings && ttxSettings.syncUrl) || SYNC_ENDPOINT;

  const { consentString, gdprApplies } = gdprConsent;

  const sync = {
    type: 'iframe',
    url: `${syncUrl}&id=${siteId}&gdpr_consent=${encodeURIComponent(consentString)}&us_privacy=${encodeURIComponent(uspConsent)}`
  };

  if (typeof gdprApplies === 'boolean') {
    sync.url += `&gdpr=${Number(gdprApplies)}`;
  }

  return sync;
}

export const spec = {
  NON_MEASURABLE,

  code: BIDDER_CODE,
  supportedMediaTypes: [ BANNER, VIDEO ],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
