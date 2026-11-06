import { config } from '../src/config.js';
import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { isFn, logWarn } from '../src/utils.js';
const BIDDER_CODE = 'logly';
const ENDPOINT_URL = 'https://bid.logly.co.jp/prebid/client/v2';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */
export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.adspotId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return {ServerRequest} Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = [];
    for (let i = 0; i < validBidRequests.length; i++) {
      const request = {
        method: 'POST',
        url: ENDPOINT_URL + '?adspot_id=' + validBidRequests[i].params.adspotId,
        data: JSON.stringify(newBidRequest(validBidRequests[i], bidderRequest)),
        options: {},
        bidderRequest
      };
      requests.push(request);
    }
    return requests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const body = serverResponse.body;
    if (!body || body.error) {
      return [];
    }
    if (!Array.isArray(body.bids)) {
      return [];
    }
    body.bids.forEach(bid => {
      bidResponses.push(bid);
    });
    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    return syncs;
  },
};

function newBidRequest(bid, bidderRequest) {
  const currencyObj = config.getConfig('currency');
  const currency = (currencyObj && currencyObj.adServerCurrency) || 'USD';
  const eids = getEids(bid);
  const imUid = getImUid(eids);

  return {
    auctionId: bid.auctionId,
    bidderRequestId: bid.bidderRequestId,
    transactionId: bid.transactionId,
    adUnitCode: bid.adUnitCode,
    bidId: bid.bidId,
    mediaTypes: bid.mediaTypes,
    params: bid.params,
    prebidJsVersion: '$prebid.version$',
    url: bidderRequest.refererInfo.page,
    domain: config.getConfig('publisherDomain'),
    referer: bidderRequest.refererInfo.ref,
    auctionStartTime: bidderRequest.auctionStart,
    currency: currency,
    timeout: bidderRequest.timeout,
    ...(imUid ? { im_uid: imUid } : {}),
    ...getBidFloors(bid),
    eids
  };
}

function getBidFloors(bid) {
  if (!isFn(bid.getFloor)) {
    return {};
  }
  // Request the floor per size, not once with '*': the LOGLY server reads the floor of the size it bids with,
  // and a publisher may set floors only per size, in which case '*' returns no floor for an ad unit with several sizes.
  // LOGLY bids in JPY. getFloor returns the floor in the currency of the floors configuration when it cannot convert
  // (e.g. no currency module or no rates), so the currency is sent with each floor.
  const bidfloors = {};
  (bid.mediaTypes?.banner?.sizes || []).forEach(size => {
    let floorInfo;
    try {
      floorInfo = bid.getFloor({ currency: 'JPY', mediaType: BANNER, size });
    } catch (e) {
      // Leave out only the floor of this size: a throw here would drop every LOGLY bid in the auction.
      logWarn(`${BIDDER_CODE}: getFloor failed for size ${size[0]}x${size[1]}`, e);
      return;
    }
    if (Number.isFinite(floorInfo?.floor)) {
      bidfloors[`${size[0]}x${size[1]}`] = { floor: floorInfo.floor, currency: floorInfo.currency };
    }
  });
  return Object.keys(bidfloors).length > 0 ? { bidfloors } : {};
}

function getEids(bid) {
  const eids = bid.ortb2?.user?.ext?.eids;
  return Array.isArray(eids) ? eids : [];
}

function getImUid(eids) {
  const imEid = eids.find(eid => eid?.source === 'intimatemerger.com');

  return imEid?.uids?.[0]?.id;
}

registerBidder(spec);
