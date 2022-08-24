import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'loglylift';
const ENDPOINT_URL = 'https://bid.logly.co.jp/prebid/client/v1';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.adspotId);
  },

  buildRequests: function (bidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    bidRequests = convertOrtbRequestToProprietaryNative(bidRequests);

    const requests = [];
    for (let i = 0, len = bidRequests.length; i < len; i++) {
      const request = {
        method: 'POST',
        url: ENDPOINT_URL + '?adspot_id=' + bidRequests[i].params.adspotId,
        data: JSON.stringify(newBidRequest(bidRequests[i], bidderRequest)),
        options: {},
        bidderRequest
      };
      requests.push(request);
    }
    return requests;
  },

  interpretResponse: function (serverResponse, { bidderRequest }) {
    serverResponse = serverResponse.body;
    const bidResponses = [];
    if (!serverResponse || serverResponse.error) {
      return bidResponses;
    }
    serverResponse.bids.forEach(function (bid) {
      bidResponses.push(bid);
    })
    return bidResponses;
  },

  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];

    // sync if mediaType is native because not native ad itself has a function for sync
    if (syncOptions.iframeEnabled && serverResponses.length > 0 && serverResponses[0].body.bids[0].native) {
      syncs.push({
        type: 'iframe',
        url: 'https://sync.logly.co.jp/sync/sync.html'
      });
    }
    return syncs;
  }

};

function newBidRequest(bid, bidderRequest) {
  const currencyObj = config.getConfig('currency');
  const currency = (currencyObj && currencyObj.adServerCurrency) || 'USD';

  return {
    auctionId: bid.auctionId,
    bidderRequestId: bid.bidderRequestId,
    transactionId: bid.transactionId,
    adUnitCode: bid.adUnitCode,
    bidId: bid.bidId,
    mediaTypes: bid.mediaTypes,
    params: bid.params,
    prebidJsVersion: '$prebid.version$',
    url: window.location.href,
    domain: bidderRequest.refererInfo.domain,
    referer: bidderRequest.refererInfo.page,
    auctionStartTime: bidderRequest.auctionStart,
    currency: currency,
    timeout: config.getConfig('bidderTimeout')
  };
}

registerBidder(spec);
