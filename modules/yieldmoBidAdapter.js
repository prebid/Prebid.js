import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'yieldmo';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 300;
const NET_REVENUE = true;
const SERVER_ENDPOINT = 'https://ads.yieldmo.com/exchange/prebid';
const localWindow = utils.getWindowTop();

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner'],
  /**
   * Determines whether or not the given bid request is valid.
   * @param {object} bid, bid to validate
   * @return boolean, true if valid, otherwise false
   */
  isBidRequestValid: function (bid) {
    return !!(bid && bid.adUnitCode && bid.bidId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    let serverRequest = {
      pbav: '$prebid.version$',
      p: [],
      page_url: bidderRequest.refererInfo.referer,
      bust: new Date().getTime().toString(),
      pr: bidderRequest.refererInfo.referer,
      scrd: localWindow.devicePixelRatio || 0,
      dnt: getDNT(),
      description: getPageDescription(),
      title: localWindow.document.title || '',
      w: localWindow.innerWidth,
      h: localWindow.innerHeight,
      userConsent: JSON.stringify({
        // case of undefined, stringify will remove param
        gdprApplies: utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies') || '',
        cmp: utils.deepAccess(bidderRequest, 'gdprConsent.consentString') || ''
      }),
      us_privacy: utils.deepAccess(bidderRequest, 'uspConsent') || ''
    };

    const mtp = window.navigator.maxTouchPoints;
    if (mtp) {
      serverRequest.mtp = mtp;
    }

    bidRequests.forEach(request => {
      serverRequest.p.push(addPlacement(request));
      const pubcid = getId(request, 'pubcid');
      if (pubcid) {
        serverRequest.pubcid = pubcid;
      } else if (request.crumbs) {
        if (request.crumbs.pubcid) {
          serverRequest.pubcid = request.crumbs.pubcid;
        }
      }
      const tdid = getId(request, 'tdid');
      if (tdid) {
        serverRequest.tdid = tdid;
      }
      const criteoId = getId(request, 'criteoId');
      if (criteoId) {
        serverRequest.cri_prebid = criteoId;
      }
      if (request.schain) {
        serverRequest.schain =
          JSON.stringify(request.schain);
      }
    });
    serverRequest.p = '[' + serverRequest.p.toString() + ']';
    return {
      method: 'GET',
      url: SERVER_ENDPOINT,
      data: serverRequest
    };
  },
  /**
   * Makes Yieldmo Ad Server response compatible to Prebid specs
   * @param serverResponse successful response from Ad Server
   * @return {Bid[]} an array of bids
   */
  interpretResponse: function (serverResponse) {
    let bids = [];
    let data = serverResponse.body;
    if (data.length > 0) {
      data.forEach(response => {
        if (response.cpm && response.cpm > 0) {
          bids.push(createNewBid(response));
        }
      });
    }
    return bids;
  },
  getUserSyncs: function () {
    return [];
  }
};
registerBidder(spec);

/***************************************
 * Helper Functions
 ***************************************/

/**
 * Adds placement information to array
 * @param request bid request
 */
function addPlacement(request) {
  const placementInfo = {
    placement_id: request.adUnitCode,
    callback_id: request.bidId,
    sizes: request.mediaTypes.banner.sizes
  };
  if (request.params) {
    if (request.params.placementId) {
      placementInfo.ym_placement_id = request.params.placementId;
    }
    if (request.params.bidFloor) {
      placementInfo.bidFloor = request.params.bidFloor;
    }
  }
  return JSON.stringify(placementInfo);
}

/**
 * creates a new bid with response information
 * @param response server response
 */
function createNewBid(response) {
  return {
    requestId: response['callback_id'],
    cpm: response.cpm,
    width: response.width,
    height: response.height,
    creativeId: response.creative_id,
    currency: CURRENCY,
    netRevenue: NET_REVENUE,
    ttl: TIME_TO_LIVE,
    ad: response.ad,
  };
}

/**
 * Detects whether dnt is true
 * @returns true if user enabled dnt
 */
function getDNT() {
  return (
    window.doNotTrack === '1' || window.navigator.doNotTrack === '1' || false
  );
}

/**
 * get page description
 */
function getPageDescription() {
  if (document.querySelector('meta[name="description"]')) {
    return document
      .querySelector('meta[name="description"]')
      .getAttribute('content'); // Value of the description metadata from the publisher's page.
  } else {
    return '';
  }
}

/**
 * Gets an id from the userId object if it exists
 * @param {*} request
 * @param {*} idType
 * @returns an id if there is one, or undefined
 */
function getId(request, idType) {
  return (typeof utils.deepAccess(request, 'userId') === 'object') ? request.userId[idType] : undefined;
}
