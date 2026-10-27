import { config } from '../src/config.js';
import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
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
  const imUid = getImUid(bid);

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
    timeout: config.getConfig('bidderTimeout'),
    ...(imUid ? { im_uid: imUid } : {})
  };
}

function getImUid(bid) {
  const eids = bid.userIdAsEids || [];
  const imEid = eids.find(eid => eid.source === 'intimatemerger.com');

  return imEid?.uids?.[0]?.id;
}

registerBidder(spec);
