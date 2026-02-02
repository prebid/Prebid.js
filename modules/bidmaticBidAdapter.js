import { registerBidder } from '../src/adapters/bidderFactory.js';
import {
  _map,
  cleanObj,
  deepAccess,
  flatten,
  getWinDimensions,
  isArray,
  isNumber,
  logWarn,
  parseSizesInput
} from '../src/utils.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { chunk } from '../libraries/chunk/chunk.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 */

const URL = 'https://adapter.bidmatic.io/bdm/auction';
const BIDDER_CODE = 'bidmatic';
const SYNCS_DONE = new Set();

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  gvlid: 1134,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    if (!bid.params) return false;
    if (bid.params.bidfloor && !isNumber(bid.params.bidfloor)) {
      logWarn('incorrect floor value, should be a number');
    }
    return isNumber(deepAccess(bid, 'params.source'))
  },
  getUserSyncs: getUserSyncsFn,
  /**
   * Make a server request from the list of BidRequests
   * @param bidRequests
   * @param adapterRequest
   */
  buildRequests: function (bidRequests, adapterRequest) {
    const adapterSettings = config.getConfig(adapterRequest.bidderCode)
    const chunkSize = deepAccess(adapterSettings, 'chunkSize', 5);
    const { tag, bids } = bidToTag(bidRequests, adapterRequest);
    const bidChunks = chunk(bids, chunkSize);

    return _map(bidChunks, (bids) => {
      return {
        data: Object.assign({}, tag, { BidRequests: bids }),
        adapterRequest,
        method: 'POST',
        url: URL
      };
    })
  },

  /**
   * Unpack the response from the server into a list of bids
   * @param {*} serverResponse
   * @param {Object} responseArgs
   * @param {*} responseArgs.adapterRequest
   * @return {Bid[]} An array of bids which were nested inside the server
   */
  interpretResponse: function (serverResponse, { adapterRequest }) {
    serverResponse = serverResponse.body;
    let bids = [];

    if (isArray(serverResponse)) {
      serverResponse.forEach(serverBidResponse => {
        bids = flatten(bids, parseResponseBody(serverBidResponse, adapterRequest));
      });
      return bids;
    }
    return parseResponseBody(serverResponse, adapterRequest);
  },

};

export function getResponseSyncs(syncOptions, bid) {
  const types = bid.cookieURLSTypes || [];
  const uris = bid.cookieURLs;
  if (!Array.isArray(uris)) return [];
  return uris.reduce((acc, uri, i) => {
    const type = types[i] || 'image';

    if ((!syncOptions.pixelEnabled && type === 'image') ||
      (!syncOptions.iframeEnabled && type === 'iframe') ||
      SYNCS_DONE.has(uri)) {
      return acc;
    }

    SYNCS_DONE.add(uri);
    acc.push({
      type: type,
      url: uri
    });
    return acc;
  }, [])
}

export function getUserSyncsFn(syncOptions, serverResponses) {
  let newSyncs = [];
  if (!isArray(serverResponses)) return newSyncs;
  if (!syncOptions.pixelEnabled && !syncOptions.iframeEnabled) return;
  serverResponses.forEach((response) => {
    if (!response.body) return
    if (isArray(response.body)) {
      response.body.forEach(b => {
        newSyncs = newSyncs.concat(getResponseSyncs(syncOptions, b));
      })
    } else {
      newSyncs = newSyncs.concat(getResponseSyncs(syncOptions, response.body));
    }
  })

  return newSyncs;
}

export function parseResponseBody(serverResponse, adapterRequest) {
  const responseBids = [];

  if (!isArray(deepAccess((serverResponse), 'bids'))) {
    return responseBids;
  }

  serverResponse.bids.forEach(serverBid => {
    // avoid errors with id mismatch
    const bidRequestMatch = ((adapterRequest.bids) || []).find((bidRequest) => {
      return bidRequest.bidId === serverBid.requestId;
    });

    if (bidRequestMatch) {
      responseBids.push(createBid(serverBid));
    }
  });

  return responseBids;
}

export function remapBidRequest(bidRequests, adapterRequest) {
  const bidRequestBody = {
    Domain: deepAccess(adapterRequest, 'refererInfo.page'),
    ...getPlacementEnv()
  };

  bidRequestBody.USP = deepAccess(adapterRequest, 'uspConsent');
  bidRequestBody.Coppa = deepAccess(adapterRequest, 'ortb2.regs.coppa') ? 1 : 0;
  bidRequestBody.AgeVerification = deepAccess(adapterRequest, 'ortb2.regs.ext.age_verification');
  bidRequestBody.GPP = adapterRequest.gppConsent ? adapterRequest.gppConsent.gppString : adapterRequest.ortb2?.regs?.gpp
  bidRequestBody.GPPSid = adapterRequest.gppConsent ? adapterRequest.gppConsent.applicableSections?.toString() : adapterRequest.ortb2?.regs?.gpp_sid;
  bidRequestBody.Schain = deepAccess(bidRequests[0], 'schain');
  bidRequestBody.UserEids = deepAccess(bidRequests[0], 'userIdAsEids');
  bidRequestBody.UserIds = deepAccess(bidRequests[0], 'userId');
  bidRequestBody.Tmax = adapterRequest.timeout;
  if (deepAccess(adapterRequest, 'gdprConsent.gdprApplies')) {
    bidRequestBody.GDPRConsent = deepAccess(adapterRequest, 'gdprConsent.consentString');
    bidRequestBody.GDPR = 1;
  }

  return cleanObj(bidRequestBody);
}

export function bidToTag(bidRequests, adapterRequest) {
  // start publisher env
  const tag = remapBidRequest(bidRequests, adapterRequest);
  // end publisher env
  const bids = [];
  for (let i = 0, length = bidRequests.length; i < length; i++) {
    const bid = prepareBidRequests(bidRequests[i]);

    bids.push(bid);
  }

  return { tag, bids };
}

const getBidFloor = (bid) => {
  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });

    return bidFloor?.floor;
  } catch (err) {
    return isNumber(bid.params.bidfloor) ? bid.params.bidfloor : undefined;
  }
};

/**
 * @param bidReq {object}
 * @returns {object}
 */
export function prepareBidRequests(bidReq) {
  const mediaType = deepAccess(bidReq, 'mediaTypes.video') ? VIDEO : 'display'
  const sizes = mediaType === VIDEO ? deepAccess(bidReq, 'mediaTypes.video.playerSize') : deepAccess(bidReq, 'mediaTypes.banner.sizes');
  return cleanObj({
    'CallbackId': bidReq.bidId,
    'Aid': bidReq.params.source,
    'AdType': mediaType,
    'PlacementId': bidReq.adUnitCode,
    'Sizes': parseSizesInput(sizes).join(','),
    'BidFloor': getBidFloor(bidReq),
    'GPID': deepAccess(bidReq, 'ortb2Imp.ext.gpid'),
    ...getPlacementInfo(bidReq)
  });
}

/**
 * Configure new bid by response
 * @param bidResponse {object}
 * @returns {object}
 */
export function createBid(bidResponse) {
  return {
    requestId: bidResponse.requestId,
    creativeId: bidResponse.cmpId,
    height: bidResponse.height,
    currency: bidResponse.cur,
    width: bidResponse.width,
    cpm: bidResponse.cpm,
    netRevenue: true,
    mediaType: bidResponse.vastUrl ? VIDEO : BANNER,
    ttl: 300,
    ad: bidResponse.ad,
    adUrl: bidResponse.adUrl,
    vastUrl: bidResponse.vastUrl,
    meta: {
      advertiserDomains: bidResponse.adomain || []
    }
  };
}

function getPlacementInfo(bidReq) {
  const placementElementNode = document.getElementById(bidReq.adUnitCode);
  try {
    return cleanObj({
      AuctionsCount: bidReq.auctionsCount,
      DistanceToView: getViewableDistance(placementElementNode)
    });
  } catch (e) {
    logWarn('Error while getting placement info', e);
    return {};
  }
}

/**
 * @param element
 */
function getViewableDistance(element) {
  if (!element) return 0;
  const elementRect = getBoundingClientRect(element);

  if (!elementRect) {
    return 0;
  }

  const elementMiddle = elementRect.top + (elementRect.height / 2);
  const viewportHeight = getWinDimensions().innerHeight
  if (elementMiddle > window.scrollY + viewportHeight) {
    // element is below the viewport
    return Math.round(elementMiddle - (window.scrollY + viewportHeight));
  }
  // element is above the viewport -> negative value
  return Math.round(elementMiddle);
}

function getPageHeight() {
  return document.documentElement.scrollHeight || document.body.scrollHeight;
}

function getPlacementEnv() {
  return cleanObj({
    TimeFromNavigation: Math.floor(performance.now()),
    TabActive: document.visibilityState === 'visible',
    PageHeight: getPageHeight()
  })
}

registerBidder(spec);
