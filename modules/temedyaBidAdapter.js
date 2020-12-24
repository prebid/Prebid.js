import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { NATIVE } from '../src/mediaTypes.js';

const BIDDER_CODE = 'temedya';
const ENDPOINT_URL = 'https://adm.vidyome.com/';
const ENDPOINT_METHOD = 'GET';
const CURRENCY = 'TRY';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [NATIVE],
  /**
  * Determines whether or not the given bid request is valid.
  *
  * @param {BidRequest} bid The bid params to validate.
  * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function (bid) {
    return !!(bid.params.widgetId && bid.params.count);
  },
  /**
  * Make a server request from the list of BidRequests.
  *
  * @param {validBidRequests[]} - an array of bids
  * @return ServerRequest Info describing the request to the server.
  */
  buildRequests: function (validBidRequests, bidderRequest) {
    let requests = [];
    utils._each(validBidRequests, function(bid) {
      requests.push({
        method: ENDPOINT_METHOD,
        options: { withCredentials: false, requestId: bid.bidId },
        url: ENDPOINT_URL + '?wid=' + bid.params.widgetId + '&type=native&count=' + bid.params.count + '&v=' + bid.bidId
      });
    });
    return requests;
  },

  /**
  * Unpack the response from the server into a list of bids.
  *
  * @param {ServerResponse} serverResponse A successful response from the server.
  * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: function (serverResponse, bidRequest) {
    try {
      const bidResponse = serverResponse.body;
      const bidResponses = [];

      if (bidResponse) {
        bidResponse.ads.forEach(function(ad) {
          bidResponses.push({
            requestId: bidRequest.options.requestId,
            cpm: ad.assets.cpm,
            width: 320,
            height: 240,
            creativeId: ad.assets.id,
            currency: CURRENCY,
            netRevenue: false,
            ttl: 360,
            native: {
              title: ad.assets.title,
              body: ad.assets.body || '',
              image: {
                url: ad.assets.files[0],
                width: 320,
                height: 240
              },
              privacyLink: '',
              clickUrl: ad.assets.click_url,
              displayUrl: ad.assets.click_url,
              cta: '',
              sponsoredBy: ad.assets.sponsor || '',
              impressionTrackers: [bidResponse.base.widget.impression + '&ids=' + ad.id + ':' + ad.assets.id],
            },
          });
        });
      }
      return bidResponses;
    } catch (err) {
      utils.logError(err);
      return [];
    }
  }

}
registerBidder(spec);
