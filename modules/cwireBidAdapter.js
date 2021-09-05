import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getRefererInfo } from '../src/refererDetection.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import { OUTSTREAM } from '../src/video.js';
import { Renderer } from '../src/Renderer.js';
import find from 'core-js-pure/features/array/find.js';
const utils = require('../src/utils.js');
// ------------------------------------
const BIDDER_CODE = 'cwire';
const ENDPOINT_URL = 'http://localhost:3002/api/prebid';
const RENDERER_URL = 'http://localhost:3002/static/fif/out.js';
// ------------------------------------
const _PAGE_VIEW_ID = utils.generateUUID();
const LS_CWID_KEY = 'cw_cwid';

/**
 * ------------------------------------
 * ------------------------------------
 * @param bid
 * @returns {Array<string>}
 */
function getSlotSizes(bid) {
  return utils.parseSizesInput(getAllMediaSizes(bid));
}

function _renderer(bid) {
  bid.renderer.push(() => {
    console.log('SIMPLE INSTALL');
    console.log(bid);
  });
}

/**
 * ------------------------------------
 * ------------------------------------
 * @param bid
 * @returns {*[]}
 */
function getAllMediaSizes(bid) {
  // eslint-disable-next-line no-debugger
  let playerSizes = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
  let videoSizes = utils.deepAccess(bid, 'mediaTypes.video.sizes');
  let bannerSizes = utils.deepAccess(bid, 'mediaTypes.banner.sizes');

  const sizes = [];

  if (utils.isArray(playerSizes)) {
    playerSizes.forEach((s) => {
      sizes.push(s);
    })
  }

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
    bidObj.mediaTypes = utils.getBidIdParameter('mediaTypes', bid);
    bidObj.transactionId = utils.getBidIdParameter('transactionId', bid);
    bidObj.sizes = getSlotSizes(bid);
    slots.push(bidObj);
  });

  return slots;
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],
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
  buildRequests: function(validBidRequests) {
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
      cwid: localStorage.getItem(LS_CWID_KEY),
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
      data: payload
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
      if (typeof bidRequest.data === 'string') {
        bidRequest.data = JSON.parse(bidRequest.data);
        console.log(JSON.stringify(bidRequest));
      }
      // eslint-disable-next-line no-console
      console.log(serverResponse);
      const serverBody = serverResponse.body;
      // const headerValue = serverResponse.headers.get('some-response-header');
      serverBody.bids.forEach((br) => {
        const bidReq = find(bidRequest.data.slots, bid => bid.bidId === br.requestId);

        let mediaType = BANNER;

        const bidResponse = {
          requestId: br.requestId,
          cpm: br.cpm,
          bidderCode: BIDDER_CODE,
          width: br.dimensions[0],
          height: br.dimensions[1],
          creativeId: br.creativeId,
          currency: br.currency,
          netRevenue: br.netRevenue,
          ttl: br.ttl,
          meta: {
            advertiserDomains: br.adomains ? br.advertiserDomains : [],
          },
          ad: br.html,
        };

        // ------------------------------------
        // IF VIDEO
        // ------------------------------------
        if (utils.deepAccess(bidReq, 'mediaTypes.video')) {
          mediaType = VIDEO;
          bidResponse.vastXml = br.vastXml;

          const mediaTypeContext = utils.deepAccess(bidReq, 'mediaTypes.video.context');
          if (mediaTypeContext === OUTSTREAM) {
            const r = Renderer.install({
              id: br.requestId,
              adUnitCode: br.adUnitCode,
              url: RENDERER_URL,
            });
            // eslint-disable-next-line no-console
            console.log('OUTSTREAM RENDERER INSTALL', r);

            br.renderer = r;
            br.renderer.setRender(_renderer);
          }
        }

        // bidResponse.mediaType = mediaType;

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
    // eslint-disable-next-line no-console
    console.log('TIMEOUT', data);
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function(bid) {
    // eslint-disable-next-line no-console
    console.log('BID WON!!!', bid);
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
