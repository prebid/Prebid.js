import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';

// #region Constants
export const BIDDER_CODE = 'adplus';
export const ADPLUS_ENDPOINT = 'https://ssp.ad-plus.com.tr/server/headerBidding';
export const DGID_CODE = 'adplus_dg_id';
export const SESSION_CODE = 'adplus_s_id';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
const COOKIE_EXP = 1000 * 60 * 60 * 24; // 1 day
// #endregion

// #region Helpers
export function isValidUuid (uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

function getSessionId() {
  let sid = storage.cookiesAreEnabled() && storage.getCookie(SESSION_CODE);

  if (
    !sid || !isValidUuid(sid)
  ) {
    sid = utils.generateUUID();
    setSessionId(sid);
  }

  return sid;
}

function setSessionId(sid) {
  if (storage.cookiesAreEnabled()) {
    const expires = new Date(Date.now() + COOKIE_EXP).toISOString();

    storage.setCookie(SESSION_CODE, sid, expires);
  }
}
// #endregion

// #region Bid request validation
function isBidRequestValid(bid) {
  if (!bid) {
    utils.logError(BIDDER_CODE, 'bid, can not be empty', bid);
    return false;
  }

  if (!bid.params) {
    utils.logError(BIDDER_CODE, 'bid.params is required.');
    return false;
  }

  if (!bid.params.adUnitId || typeof bid.params.adUnitId !== 'string') {
    utils.logError(
      BIDDER_CODE,
      'bid.params.adUnitId is missing or has wrong type.'
    );
    return false;
  }

  if (!bid.params.inventoryId || typeof bid.params.inventoryId !== 'string') {
    utils.logError(
      BIDDER_CODE,
      'bid.params.inventoryId is missing or has wrong type.'
    );
    return false;
  }

  if (
    !bid.mediaTypes ||
    !bid.mediaTypes[BANNER] ||
    !utils.isArray(bid.mediaTypes[BANNER].sizes) ||
    bid.mediaTypes[BANNER].sizes.length <= 0 ||
    !utils.isArrayOfNums(bid.mediaTypes[BANNER].sizes[0])
  ) {
    utils.logError(BIDDER_CODE, 'Wrong or missing size parameters.');
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
function createBidRequest(bid) {
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
    method: 'GET',
    url: ADPLUS_ENDPOINT,
    data: utils.cleanObj({
      bidId: bid.bidId,
      inventoryId,
      adUnitId,
      adUnitWidth: bid.mediaTypes[BANNER].sizes[0][0],
      adUnitHeight: bid.mediaTypes[BANNER].sizes[0][1],
      extraData,
      yearOfBirth,
      gender,
      categories,
      latitude,
      longitude,
      sdkVersion: sdkVersion || '1',
      session: getSessionId(),
      interstitial: 0,
      token: typeof window.top === 'object' && window.top[DGID_CODE] ? window.top[DGID_CODE] : undefined,
      secure: window.location.protocol === 'https:' ? 1 : 0,
      screenWidth: screen.width,
      screenHeight: screen.height,
      language: window.navigator.language || 'en-US',
      pageUrl: window.location.href,
      domain: window.location.hostname,
      referrer: window.location.referrer,
    }),
  };
}

function buildRequests(validBidRequests, bidderRequest) {
  return validBidRequests.map((req) => createBidRequest(req));
}
// #endregion

// #region Interpreting Responses
/**
 *
 * @param {HeaderBiddingResponse} responseData
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
      primaryCatId: utils.isArray(responseData.categoryIDs) && responseData.categoryIDs.length > 0
        ? responseData.categoryIDs[0] : undefined,
      secondaryCatIds: responseData.categoryIDs,
    },
  };
}

function interpretResponse(response, request) {
  // In case of empty response
  if (
    response.body == null ||
    !utils.isArray(response.body) ||
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
    utils.logError('Adplus adapter timed out for the auction.', timeoutData);
  },
  onBidWon(bid) {
    utils.logInfo(
      `Adplus adapter won the auction. Bid id: ${bid.bidId}, Ad Unit Id: ${bid.adUnitId}, Inventory Id: ${bid.inventoryId}`
    );
  },
};

registerBidder(spec);
// #endregion
