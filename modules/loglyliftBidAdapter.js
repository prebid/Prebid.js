import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { NATIVE } from '../src/mediaTypes.js';

const BIDDER_CODE = 'loglylift';
const ENDPOINT_URL = 'https://bid.logly.co.jp/prebid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [NATIVE],
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.adspotId);
  },
  buildRequests: function (bidRequests, bidderRequest) {
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
  interpretResponse: function (serverResponse, {bidderRequest}) {
    serverResponse = serverResponse.body;
    const bids = [];
    // eslint-disable-next-line no-console
    console.log(bidderRequest);
    if (!serverResponse || serverResponse.error) {
      return bids;
    }
    serverResponse.seatbid.forEach(function (bid) {
      // const native = {};
      // native.title = 'title';
      // native.url = 'https://cdn.logly.co.jp/images/000/194/300/normal.jpg';
      // bid.native = native;
      // bid.dealId = undefined;
      bids.push(bid);
    })
    // eslint-disable-next-line no-console
    console.dir(bids);
    return bids;
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
    domain: config.getConfig('publisherDomain'),
    referer: bidderRequest.refererInfo.referer,
    auctionStartTime: bidderRequest.auctionStart,
    currency: currency,
    timeout: config.getConfig('bidderTimeout')
  };
}

registerBidder(spec);
