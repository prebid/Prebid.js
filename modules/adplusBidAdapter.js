import { registerBidder } from '../src/adapters/bidderFactory.js';
import { cleanObj, isArray, isArrayOfNums, logError, logInfo, } from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';

// #region Constants
export const BIDDER_CODE = 'adplus';
export const ADPLUS_ENDPOINT = 'https://ssp.ad-plus.com.tr/server/headerBidding';
// #endregion

// #region Bid request validation
function isBidRequestValid(bid) {
  if (!bid) {
    logError(BIDDER_CODE, 'bid, can not be empty', bid);
    return false;
  }

  if (!bid.params) {
    logError(BIDDER_CODE, 'bid.params is required.');
    return false;
  }

  if (!bid.params.adUnitId || typeof bid.params.adUnitId !== 'string') {
    logError(
      BIDDER_CODE,
      'bid.params.adUnitId is missing or has wrong type.'
    );
    return false;
  }

  if (!bid.params.inventoryId || typeof bid.params.inventoryId !== 'string') {
    logError(
      BIDDER_CODE,
      'bid.params.inventoryId is missing or has wrong type.'
    );
    return false;
  }

  if (
    !bid.mediaTypes ||
    !bid.mediaTypes[BANNER] ||
    !isArray(bid.mediaTypes[BANNER].sizes) ||
    bid.mediaTypes[BANNER].sizes.length <= 0 ||
    !isArrayOfNums(bid.mediaTypes[BANNER].sizes[0])
  ) {
    logError(BIDDER_CODE, 'Wrong or missing size parameters.');
    return false;
  }

  return true;
}
// #endregion

// #region Building the bid requests
/**
 *
 * @param {object} bid
 * @returns
 */
function createBidRequest(bid, bidderRequest) {
  // Developer Params
  const {
    inventoryId,
    adUnitId,
    extraData,
    yearOfBirth,
    gender,
    categories,
    latitude,
    longitude,
    sdkVersion,
  } = bid.params;

  return {
    method: 'POST',
    url: ADPLUS_ENDPOINT,
    data: cleanObj({
      bidId: bid.bidId,
      inventoryId: parseInt(inventoryId),
      adUnitId: parseInt(adUnitId),
      adUnitWidth: bid.mediaTypes[BANNER].sizes[0][0],
      adUnitHeight: bid.mediaTypes[BANNER].sizes[0][1],
      pbAdUnitCode: bid.adUnitCode,
      pbAuctionId: bidderRequest?.auctionId || bid.auctionId,
      extraData,
      yearOfBirth,
      gender,
      categories,
      latitude,
      longitude,
      sdkVersion: sdkVersion || '1',
      interstitial: 0,
      secure: window.location.protocol === 'https:' ? 1 : 0,
      screenWidth: screen.width,
      screenHeight: screen.height,
      language: window.navigator.language || 'en-US',
      pageUrl: window.location.href,
      domain: window.location.hostname,
      referrer: window.location.referrer,
      adplusUid: bid?.userId?.adplusId,
      eids: bid?.userIdAsEids,
    }),
  };
}

function buildRequests(validBidRequests, bidderRequest) {
  return validBidRequests.map((req) => createBidRequest(req, bidderRequest));
}
// #endregion

// #region Interpreting Responses
/**
 *
 * @param {Object} responseData
 * @param { object } bidParams
 * @returns
 */
function createAdResponse(responseData, bidParams) {
  return {
    requestId: responseData.requestID,
    cpm: responseData.cpm,
    currency: responseData.currency,
    width: responseData.width,
    height: responseData.height,
    creativeId: responseData.creativeID,
    dealId: responseData.dealID,
    netRevenue: responseData.netRevenue,
    ttl: responseData.ttl,
    ad: responseData.ad,
    mediaType: responseData.mediaType,
    meta: {
      advertiserDomains: responseData.advertiserDomains,
      primaryCatId: isArray(responseData.categoryIDs) && responseData.categoryIDs.length > 0
        ? responseData.categoryIDs[0] : undefined,
      secondaryCatIds: responseData.categoryIDs,
    },
  };
}

function interpretResponse(response, request) {
  // In case of empty response
  if (
    response.body == null ||
    !isArray(response.body) ||
    response.body.length === 0
  ) {
    return [];
  }
  const bids = response.body.map((bid) => createAdResponse(bid));
  return bids;
}
// #endregion

// #region Bidder
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onTimeout(timeoutData) {
    logError('Adplus adapter timed out for the auction.', timeoutData);
  },
  onBidWon(bid) {
    logInfo(
      `Adplus adapter won the auction. Bid id: ${bid.bidId}, Ad Unit Id: ${bid.adUnitId}, Inventory Id: ${bid.inventoryId}`
    );
  },
};

registerBidder(spec);
// #endregion
