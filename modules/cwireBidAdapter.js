import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getStorageManager } from '../src/storageManager.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import { OUTSTREAM } from '../src/video.js';
import {
  isArray,
  isNumber,
  generateUUID,
  parseSizesInput,
  deepAccess,
  getParameterByName,
  getValue,
  getBidIdParameter,
  logError,
  logWarn,
} from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import find from 'prebidjs-polyfill/find.js';

// ------------------------------------
const BIDDER_CODE = 'cwire';
export const ENDPOINT_URL = 'https://embed.cwi.re/delivery/prebid';
export const RENDERER_URL = 'https://cdn.cwi.re/prebid/renderer/LATEST/renderer.min.js';
// ------------------------------------
export const CW_PAGE_VIEW_ID = generateUUID();
const LS_CWID_KEY = 'cw_cwid';
const CW_GROUPS_QUERY = 'cwgroups';
const CW_CREATIVE_QUERY = 'cwcreative';

const storage = getStorageManager();

/**
 * ------------------------------------
 * ------------------------------------
 * @param bid
 * @returns {Array<string>}
 */
export function getSlotSizes(bid) {
  return parseSizesInput(getAllMediaSizes(bid));
}

/**
 * ------------------------------------
 * ------------------------------------
 * @param bid
 * @returns {*[]}
 */
export function getAllMediaSizes(bid) {
  let playerSizes = deepAccess(bid, 'mediaTypes.video.playerSize');
  let videoSizes = deepAccess(bid, 'mediaTypes.video.sizes');
  let bannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');

  const sizes = [];

  if (isArray(playerSizes)) {
    playerSizes.forEach((s) => {
      sizes.push(s);
    })
  }

  if (isArray(videoSizes)) {
    videoSizes.forEach((s) => {
      sizes.push(s);
    })
  }

  if (isArray(bannerSizes)) {
    bannerSizes.forEach((s) => {
      sizes.push(s);
    })
  }
  return sizes;
}

const getQueryVariable = (variable) => {
  let value = getParameterByName(variable);
  if (value === '') {
    value = null;
  }
  return value;
};

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
    let placementId = getValue(bid.params, 'placementId');
    let pageId = getValue(bid.params, 'pageId');
    let adUnitElementId = getValue(bid.params, 'adUnitElementId');
    // get the rest of the auction/bid/transaction info
    bidObj.auctionId = getBidIdParameter('auctionId', bid);
    bidObj.adUnitCode = getBidIdParameter('adUnitCode', bid);
    bidObj.adUnitElementId = adUnitElementId;
    bidObj.bidId = getBidIdParameter('bidId', bid);
    bidObj.bidderRequestId = getBidIdParameter('bidderRequestId', bid);
    bidObj.placementId = placementId;
    bidObj.pageId = pageId;
    bidObj.mediaTypes = getBidIdParameter('mediaTypes', bid);
    bidObj.transactionId = getBidIdParameter('transactionId', bid);
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

    if (!bid.params.placementId || !isNumber(bid.params.placementId)) {
      logError('placementId not provided or invalid');
      return false;
    }

    if (!bid.params.pageId || !isNumber(bid.params.pageId)) {
      logError('pageId not provided');
      return false;
    }

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
      logWarn(e);
    }

    let refgroups = [];

    const cwCreativeId = getQueryVariable(CW_CREATIVE_QUERY);
    const rgQuery = getQueryVariable(CW_GROUPS_QUERY);
    if (rgQuery !== null) {
      refgroups = rgQuery.split(',');
    }

    const localStorageCWID = storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(LS_CWID_KEY) : null;

    const payload = {
      cwid: localStorageCWID,
      refgroups,
      cwcreative: cwCreativeId,
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

        if (deepAccess(bidReq, 'mediaTypes.banner')) {
          bidResponse.ad = br.html;
        }
        // ------------------------------------
        // IF VIDEO
        // ------------------------------------
        if (deepAccess(bidReq, 'mediaTypes.video')) {
          mediaType = VIDEO;
          bidResponse.vastXml = br.vastXml;
          bidResponse.videoScript = br.html;
          const mediaTypeContext = deepAccess(bidReq, 'mediaTypes.video.context');
          if (mediaTypeContext === OUTSTREAM) {
            const r = Renderer.install({
              id: bidResponse.requestId,
              adUnitCode: bidReq.adUnitCode,
              url: RENDERER_URL,
              loaded: false,
              config: {
                ...deepAccess(bidReq, 'mediaTypes.video'),
                ...deepAccess(br, 'outstream', {})
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
              logWarn('Prebid Error calling setRender on newRenderer', err);
            }
          }
        }

        bidResponse.mediaType = mediaType;
        bidResponses.push(bidResponse);
      });
    } catch (e) {
      logWarn(e);
    }

    return bidResponses;
  },
}
registerBidder(spec);
