import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getRefererInfo } from '../src/refererDetection.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import { OUTSTREAM } from '../src/video.js';
import { Renderer } from '../src/Renderer.js';
import find from 'core-js-pure/features/array/find.js';
const utils = require('../src/utils.js');
// ------------------------------------
const BIDDER_CODE = 'cwire';
export const ENDPOINT_URL = 'http://localhost:3002/api/prebid';
export const RENDERER_URL = 'http://localhost:3002/static/fif/outstreamRender.out.js';
// ------------------------------------
export const CW_PAGE_VIEW_ID = utils.generateUUID();
const LS_CWID_KEY = 'cw_cwid';

/**
 * ------------------------------------
 * ------------------------------------
 * @param bid
 * @returns {Array<string>}
 */
export function getSlotSizes(bid) {
  return utils.parseSizesInput(getAllMediaSizes(bid));
}

// ------------------------------------
// Extract GPT div id
// ------------------------------------
function autoDetectAdUnitElementIdFromGpt(adUnitCode) {
  const autoDetectedAdUnit = utils.getGptSlotInfoForAdUnitCode(adUnitCode);

  if (autoDetectedAdUnit && autoDetectedAdUnit.divId) {
    return autoDetectedAdUnit.divId;
  }
};

/**
 * ------------------------------------
 * ------------------------------------
 * @param bid
 * @returns {*[]}
 */
export function getAllMediaSizes(bid) {
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
  return sizes;
}

/**
 * ------------------------------------
 * ------------------------------------
 * @param validBidRequests
 * @returns {*[]}
 */
export const mapSlotsData = function(validBidRequests) {
  const slots = [];
  validBidRequests.forEach(bid => {
    const bidObj = {};
    // get the pacement and page ids
    let placementId = utils.getValue(bid.params, 'placementId');
    let pageId = utils.getValue(bid.params, 'pageId');
    let adUnitElementId = utils.getValue(bid.params, 'adUnitElementId');
    // get the rest of the auction/bid/transaction info
    bidObj.auctionId = utils.getBidIdParameter('auctionId', bid);
    bidObj.adUnitCode = utils.getBidIdParameter('adUnitCode', bid);
    bidObj.adUnitElementId = adUnitElementId;
    bidObj.bidId = utils.getBidIdParameter('bidId', bid);
    bidObj.bidderRequestId = utils.getBidIdParameter('bidderRequestId', bid);
    bidObj.placementId = placementId;
    bidObj.pageId = pageId;
    bidObj.mediaTypes = utils.getBidIdParameter('mediaTypes', bid);
    bidObj.transactionId = utils.getBidIdParameter('transactionId', bid);
    bidObj.sizes = getSlotSizes(bid);
    slots.push(bidObj);
  });

  return slots;
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    bid.params = bid.params || {};

    // if ad unit elemt id not provided - use adUnitCode by default
    if (!bid.params.adUnitElementId) {
      bid.params.adUnitElementId = bid.code;
    }

    if (bid.params.useGPTElementId) {
      bid.params.adUnitElementId = autoDetectAdUnitElementIdFromGpt(bid.adUnitCode);
    }

    if (!bid.params.placementId || !utils.isStr(bid.params.placementId)) {
      utils.logError('[CWIRE] placementId not provided or invalid');
      return false;
    }

    if (!bid.params.pageId || !utils.isStr(bid.params.pageId)) {
      utils.logError('[CWIRE] pageId not provided');
      return false;
    }

    console.log('VALID REQUEST');
    return true;
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
      utils.logWarn(e);
    }

    const payload = {
      cwid: localStorage.getItem(LS_CWID_KEY),
      slots: slots,
      httpRef: referer || '',
      pageViewId: CW_PAGE_VIEW_ID,
    };

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
      }
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

        };

        // ------------------------------------
        // IF BANNER
        // ------------------------------------

        if (utils.deepAccess(bidReq, 'mediaTypes.banner')) {
          bidResponse.ad = br.html;
        }
        // ------------------------------------
        // IF VIDEO
        // ------------------------------------
        if (utils.deepAccess(bidReq, 'mediaTypes.video')) {
          mediaType = VIDEO;
          bidResponse.vastXml = br.vastXml;
          // bidResponse.vastUrl = 'data:text/xml;charset=utf-8;base64,' + btoa(br.vastXml.replace(/\\"/g, '"'));
          // bidResponse.adResponse =  serverBody;
          bidResponse.videoScript = br.html;
          const mediaTypeContext = utils.deepAccess(bidReq, 'mediaTypes.video.context');
          if (mediaTypeContext === OUTSTREAM) {
            const r = Renderer.install({
              id: bidResponse.requestId,
              adUnitCode: bidReq.adUnitCode,
              url: RENDERER_URL,
              loaded: false,
              config: {
                ...utils.deepAccess(bidReq, 'mediaTypes.video'),
                ...utils.deepAccess(br, 'outstream', {})
              }
            });

            // set renderer
            try {
              bidResponse.renderer = r;
              bidResponse.renderer.setRender(function(bid) {
                if (window.CWIRE && window.CWIRE.outstream) {
                  window.CWIRE.outstream.renderAd(bid);
                }
              });
            } catch (err) {
              utils.logWarn('Prebid Error calling setRender on newRenderer', err);
            }
          }
        }

        bidResponse.mediaType = mediaType;

        bidResponses.push(bidResponse);
      });
    } catch (e) {
      utils.logWarn(e);
    }

    return bidResponses;
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
