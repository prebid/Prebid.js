import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
const BIDDER_CODE = 'dianomi';
const TIME_TO_LIVE = 360;

const URL = 'https://dev-prebid.dianomi.net/cgi-bin/smartads_prebid.pl';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['dia'], // short code
  supportedMediaTypes: ['banner'],
  isBidRequestValid: function (bid) {},
  buildRequests: function (validBidRequests, bidderRequest) {
    const payload = {
      validBidRequests: validBidRequests,
      bidderRequest: bidderRequest,
      coppa: config.getConfig('coppa'),
    };
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: URL,
      data: payloadString,
    };
  },
  interpretResponse: function (serverResponse, request) {
    const serverBody = serverResponse.body;
    const data = JSON.parse(serverBody);
    const bidResponses = [];
    const bidResponse = {
      requestId: data.bid_id,
      cpm: data.bid_amount,
      width: data.width,
      height: data.height,
      creativeId: data.crid,
      currency: data.bid_currency,
      netRevenue: true,
      ttl: TIME_TO_LIVE,
      ad: data.content,
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {},
  onTimeout: function (timeoutData) {},
  onBidWon: function (bid) {},
  onSetTargeting: function (bid) {},
};
registerBidder(spec);
