import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'shinez';
const BIDDER_SHORT_CODE = 'shz';
const ADAPTER_VERSION = '1.0.0';

const TARGET_URL = 'https://shinez-ssp.shinez.workers.dev/prebid';

export const spec = {
  code: BIDDER_CODE,
  version: ADAPTER_VERSION,
  aliases: {
    code: BIDDER_SHORT_CODE
  },
  supportedMediaTypes: [ BANNER ],
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
};

export const internal = {
  TARGET_URL
}

function isBidRequestValid(bid) {
  return !!(bid && bid.params &&
    bid.params.placementId && typeof bid.params.placementId === 'string' &&
    (bid.params.unit == null || (typeof bid.params.unit === 'string' && bid.params.unit.length > 0))
  );
}

function buildRequests(validBidRequests, bidderRequest) {
  const utcOffset = (new Date()).getTimezoneOffset();
  const data = [];
  validBidRequests.forEach(function(bidRequest) {
    data.push(_buildServerBidRequest(bidRequest, bidderRequest, utcOffset));
  });
  const request = {
    method: 'POST',
    url: TARGET_URL,
    data: data
  };
  return request;
}

function interpretResponse(serverResponse, request) {
  const bids = [];
  serverResponse.body.forEach(function(serverBid) {
    bids.push(_convertServerBid(serverBid));
  });
  return bids;
}

function _buildServerBidRequest(bidRequest, bidderRequest, utcOffset) {
  return {
    bidId: bidRequest.bidId,
    transactionId: bidRequest.transactionId,
    crumbs: bidRequest.crumbs,
    mediaTypes: bidRequest.mediaTypes,
    refererInfo: bidderRequest.refererInfo,
    placementId: bidRequest.params.placementId,
    utcOffset: utcOffset,
    adUnitCode: bidRequest.adUnitCode,
    unit: bidRequest.params.unit
  }
}

function _convertServerBid(response) {
  return {
    requestId: response.bidId,
    cpm: response.cpm,
    currency: response.currency,
    width: response.width,
    height: response.height,
    ad: response.ad,
    ttl: response.ttl,
    creativeId: response.creativeId,
    netRevenue: response.netRevenue
  };
}

registerBidder(spec);
