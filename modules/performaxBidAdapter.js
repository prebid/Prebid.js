import {logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const CLIENT = 'hellboy:v0.0.1'
const BIDDER_CODE = 'performax';
const BIDDER_SHORT_CODE = 'px';
const ENDPOINT = 'https://dale.performax.cz/hb';

export const spec = {
  code: BIDDER_CODE,
  aliases: [BIDDER_SHORT_CODE],

  isBidRequestValid: function (bid) {
    return !!bid.params.slotId;
  },

  buildUrl: function (validBidRequests, bidderRequest) {
    const slotIds = validBidRequests.map(request => request.params.slotId);
    let url = [`${ENDPOINT}?slotId[]=${slotIds.join()}`];
    url.push('client=' + CLIENT);
    url.push('auctionId=' + bidderRequest.auctionId);
    return url.join('&');
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return {
      method: 'POST',
      url: this.buildUrl(validBidRequests, bidderRequest),
      data: {'validBidRequests': validBidRequests, 'bidderRequest': bidderRequest},
      options: {contentType: 'application/json'},
    }
  },

  buildHtml: function (ad) {
    const keys = Object.keys(ad.data || {});
    return ad.code.replace(
      new RegExp('\\$(' + keys.join('|') + ')\\$', 'g'),
      (matched, key) => ad.data[key] || matched
    );
  },

  interpretResponse: function (serverResponse, request) {
    let bidResponses = [];
    for (let i = 0; i < serverResponse.body.length; i++) {
      const ad = serverResponse.body[i].ad;
      if (ad.type === 'empty') {
        logWarn(`One of ads is empty (reason=${ad.reason})`);
        continue;
      }
      serverResponse.body[i].ad = this.buildHtml(ad);
      bidResponses.push(serverResponse.body[i]);
    }
    return bidResponses;
  }
}
registerBidder(spec);
