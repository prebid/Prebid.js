import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { config } from '../src/config';

const BIDDER_CODE = 'oneplanetonly';
const EDNPOINT = '//show.oneplanetonly.com/prebid';

function createEndpoint(siteId) {
  return `${EDNPOINT}?siteId=${siteId}`;
}

function isBidRequestValid (bid) {
  return !!(bid.params.siteId && bid.params.adUnitId);
}

function buildRequests(bidReqs) {
  let firstBid = bidReqs[0] || {}
  let siteId = utils.getBidIdParameter('siteId', firstBid.params)
  let adUnits = bidReqs.map((bid) => {
    return {
      id: utils.getBidIdParameter('adUnitId', bid.params),
      bidId: bid.bidId,
      sizes: utils.parseSizesInput(bid.sizes),
    };
  });

  const bidRequest = {
    id: firstBid.auctionId,
    ver: 1,
    prebidVer: `$prebid.version$`,
    transactionId: firstBid.transactionId,
    currency: config.getConfig('currency.adServerCurrency'),
    timeout: config.getConfig('bidderTimeout'),
    siteId,
    domain: utils.getTopWindowLocation().hostname,
    page: config.getConfig('pageUrl') || utils.getTopWindowUrl(),
    referrer: utils.getTopWindowReferrer(),
    adUnits,
  };

  return {
    method: 'POST',
    url: createEndpoint(siteId),
    data: bidRequest,
    options: {contentType: 'application/json', withCredentials: true}
  };
}

function interpretResponse(serverResponse, request) {
  if (!serverResponse.body.bids) {
    return [];
  }
  return serverResponse.body.bids.map((bid) => {
    return {
      requestId: bid.requestId,
      cpm: bid.cpm,
      width: bid.width,
      height: bid.height,
      creativeId: bid.creativeId,
      currency: bid.currency,
      netRevenue: true,
      ad: bid.ad,
      ttl: bid.ttl
    };
  });
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['opo'], // short code
  isBidRequestValid,
  buildRequests,
  interpretResponse
}

registerBidder(spec);
