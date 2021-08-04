import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getRefererInfo } from '../src/refererDetection.js';
const utils = require('../src/utils.js');
const BIDDER_CODE = 'cwire';
const ENDPOINT_URL = 'http://localhost:3002/api/prebid';

const _PAGE_VIEW_ID = utils.generateUUID();

/**
 * ------------------------------------
 * ------------------------------------
 * @param bid
 * @returns {Array<string>}
 */
function getSlotSizes(bid) {
  return utils.parseSizesInput(getAllMediaSizes(bid));
}

/**
 * ------------------------------------
 * ------------------------------------
 * @param bid
 * @returns {*[]}
 */
function getAllMediaSizes(bid) {
  // eslint-disable-next-line no-debugger
  debugger;
  let videoSizes = utils.deepAccess(bid, 'mediaTypes.video.sizes');
  let bannerSizes = utils.deepAccess(bid, 'mediaTypes.banner.sizes');

  const sizes = [];

  if (utils.isArray(videoSizes)) {
    videoSizes.forEach((s) => {
      sizes.push(s);
    })
  }

  if (utils.isArray(bannerSizes)) {
    bannerSizes.forEach((s) => {
      sizes.push(s);
    })
  }

  // eslint-disable-next-line no-console
  console.log('RETURNING SIZES', sizes);
  return sizes;
}

/**
 * ------------------------------------
 * ------------------------------------
 * @param validBidRequests
 * @returns {*[]}
 */
const mapSlotsData = function(validBidRequests) {
  const slots = [];
  validBidRequests.forEach(bid => {
    const bidObj = {};
    // get the pacement and page ids
    let placementId = utils.getValue(bid.params, 'placementId');
    let pageId = utils.getValue(bid.params, 'pageId');
    // get the rest of the auction/bid/transaction info
    bidObj.auctionId = utils.getBidIdParameter('auctionId', bid);
    bidObj.adUnitCode = utils.getBidIdParameter('adUnitCode', bid);
    bidObj.bidId = utils.getBidIdParameter('bidId', bid);
    bidObj.bidderRequestId = utils.getBidIdParameter('bidderRequestId', bid);
    bidObj.placementId = parseInt(placementId, 10);
    bidObj.pageId = parseInt(pageId, 10);
    bidObj.transactionId = utils.getBidIdParameter('transactionId', bid);
    bidObj.sizes = getSlotSizes(bid);
    slots.push(bidObj);
  });

  return slots;
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['video', 'banner'],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    // eslint-disable-next-line no-debugger
    return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
  },

  /**
   * ------------------------------------
   * Make a server request from the
   * list of BidRequests.
   * ------------------------------------
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    let slots = [];
    let referer;
    try {
      referer = getRefererInfo().referer;
      slots = mapSlotsData(validBidRequests);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e);
    }

    const payload = {
      slots: slots,
      httpRef: referer || '',
      pageViewId: _PAGE_VIEW_ID,
    };
    const payloadString = JSON.stringify(payload);

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload, null, 2));

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    try {
      // eslint-disable-next-line no-console
      console.log(serverResponse);
      const serverBody = serverResponse.body;
      // const headerValue = serverResponse.headers.get('some-response-header');
      serverBody.bids.forEach((br) => {
        const bidResponse = {
          requestId: br.requestId,
          cpm: br.cpm,
          width: br.dimensions[0],
          height: br.dimensions[1],
          creativeId: br.creativeId,
          // dealId: br.DEAL_ID,
          currency: br.currency,
          netRevenue: br.netRevenue,
          ttl: br.ttl,
          // referrer: serverResponse.REFERER,
          ad: br.html,
        };
        bidResponses.push(bidResponse);
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(e);
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(bidResponses, null, 2));

    return bidResponses;
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: function(data) {
    // Bidder specifc code
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function(bid) {
    // Bidder specific code
  },

  /**
   * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
   * @param {Bid} The bid of which the targeting has been set
   */
  onSetTargeting: function(bid) {
    // Bidder specific code
  },
}
registerBidder(spec);
