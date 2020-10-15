import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = '33across';
const END_POINT = 'https://ssc.33across.com/api/v1/hb';
const SYNC_ENDPOINT = 'https://ssc-cms.33across.com/ps/?m=xch&rt=html&ru=deb';
const MEDIA_TYPE = 'banner';
const CURRENCY = 'USD';

const adapterState = {
  uniqueSiteIds: []
};

const NON_MEASURABLE = 'nm';

// All this assumes that only one bid is ever returned by ttx
function _createBidResponse(response) {
  return {
    requestId: response.id,
    bidderCode: BIDDER_CODE,
    cpm: response.seatbid[0].bid[0].price,
    width: response.seatbid[0].bid[0].w,
    height: response.seatbid[0].bid[0].h,
    ad: response.seatbid[0].bid[0].adm,
    ttl: response.seatbid[0].bid[0].ttl || 60,
    creativeId: response.seatbid[0].bid[0].crid,
    currency: response.cur,
    netRevenue: true
  }
}

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

// Infer the necessary data from valid bid for a minimal ttxRequest and create HTTP request
// NOTE: At this point, TTX only accepts request for a single impression
function _createServerRequest({bidRequest, gdprConsent = {}, uspConsent, pageUrl}) {
  const ttxRequest = {};
  const params = bidRequest.params;
  const element = _getAdSlotHTMLElement(bidRequest.adUnitCode);
  const sizes = _transformSizes(bidRequest.sizes);

  let format;

  // We support size based bidfloors so obtain one if there's a rule associated
  if (typeof bidRequest.getFloor === 'function') {
    let getFloor = bidRequest.getFloor.bind(bidRequest);

    format = sizes.map((size) => {
      const formatExt = _getBidFloors(getFloor, size);

      return Object.assign({}, size, formatExt);
    });
  } else {
    format = sizes;
  }

  const minSize = _getMinSize(sizes);

  const viewabilityAmount = _isViewabilityMeasurable(element)
    ? _getViewability(element, utils.getWindowTop(), minSize)
    : NON_MEASURABLE;

  const contributeViewability = ViewabilityContributor(viewabilityAmount);

  /*
   * Infer data for the request payload
   */
  ttxRequest.imp = [];
  ttxRequest.imp[0] = {
    banner: {
      format
    },
    ext: {
      ttx: {
        prod: params.productId
      }
    }
  };
  ttxRequest.site = { id: params.siteId };

  if (pageUrl) {
    ttxRequest.site.page = pageUrl;
  }

  // Go ahead send the bidId in request to 33exchange so it's kept track of in the bid response and
  // therefore in ad targetting process
  ttxRequest.id = bidRequest.bidId;

  // Set GDPR related fields
  ttxRequest.user = {
    ext: {
      consent: gdprConsent.consentString
    }
  };
  ttxRequest.regs = {
    ext: {
      gdpr: (gdprConsent.gdprApplies === true) ? 1 : 0,
      us_privacy: uspConsent || null
    }
  };
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
    ttxRequest.source = {
      ext: {
        schain: bidRequest.schain
      }
    }
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
    'data': JSON.stringify(contributeViewability(ttxRequest)),
    'options': options
  }
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

function _getBidFloors(getFloor, size) {
  const bidFloors = getFloor({
    currency: CURRENCY,
    mediaType: MEDIA_TYPE,
    size: [ size.w, size.h ]
  });

  if (!isNaN(bidFloors.floor) && (bidFloors.currency === CURRENCY)) {
    return {
      ext: {
        ttx: {
          bidfloors: [ bidFloors.floor ]
        }
      }
    }
  }
}

function _getSize(size) {
  return {
    w: parseInt(size[0], 10),
    h: parseInt(size[1], 10)
  }
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

function _transformSizes(sizes) {
  if (utils.isArray(sizes) && sizes.length === 2 && !utils.isArray(sizes[0])) {
    return [ _getSize(sizes) ];
  }

  return sizes.map(_getSize);
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
function ViewabilityContributor(viewabilityAmount) {
  function contributeViewability(ttxRequest) {
    const req = Object.assign({}, ttxRequest);
    const imp = req.imp = req.imp.map(impItem => Object.assign({}, impItem));
    const banner = imp[0].banner = Object.assign({}, imp[0].banner);
    const ext = banner.ext = Object.assign({}, banner.ext);
    const ttx = ext.ttx = Object.assign({}, ext.ttx);

    ttx.viewability = { amount: isNaN(viewabilityAmount) ? viewabilityAmount : Math.round(viewabilityAmount) };

    return req;
  }

  return contributeViewability;
}

function _isIframe() {
  try {
    return utils.getWindowSelf() !== utils.getWindowTop();
  } catch (e) {
    return true;
  }
}

function isBidRequestValid(bid) {
  if (bid.bidder !== BIDDER_CODE || typeof bid.params === 'undefined') {
    return false;
  }

  if (typeof bid.params.siteId === 'undefined' || typeof bid.params.productId === 'undefined') {
    return false;
  }

  return true;
}

// NOTE: With regards to gdrp consent data,
// - the server independently infers gdpr applicability therefore, setting the default value to false
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

// NOTE: At this point, the response from 33exchange will only ever contain one bid i.e. the highest bid
function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = [];

  // If there are bids, look at the first bid of the first seatbid (see NOTE above for assumption about ttx)
  if (serverResponse.body.seatbid.length > 0 && serverResponse.body.seatbid[0].bid.length > 0) {
    bidResponses.push(_createBidResponse(serverResponse.body));
  }

  return bidResponses;
}

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

export const spec = {
  NON_MEASURABLE,

  code: BIDDER_CODE,

  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
