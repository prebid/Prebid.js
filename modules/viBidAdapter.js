import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'vi';
const SUPPORTED_MEDIA_TYPES = [BANNER];

function isBidRequestValid(bid) {
  return !!(bid.params.pubId);
}

function buildRequests(bidReqs) {
  let imps = [];
  utils._each(bidReqs, function (bid) {
    imps.push({
      id: bid.bidId,
      sizes: utils.parseSizesInput(bid.sizes).map(size => size.split('x')),
      bidFloor: parseFloat(bid.params.bidFloor) > 0 ? bid.params.bidFloor : 0
    });
  });

  const bidRequest = {
    id: bidReqs[0].requestId,
    imps: imps,
    publisherId: utils.getBidIdParameter('pubId', bidReqs[0].params),
    siteId: utils.getBidIdParameter('siteId', bidReqs[0].params),
    cat: utils.getBidIdParameter('cat', bidReqs[0].params),
    language: utils.getBidIdParameter('lang', bidReqs[0].params),
    domain: utils.getTopWindowLocation().hostname,
    page: utils.getTopWindowUrl(),
    referrer: utils.getTopWindowReferrer()
  };
  return {
    method: 'POST',
    url: `//pb.vi-serve.com/prebid/bid`,
    data: JSON.stringify(bidRequest),
    options: {contentType: 'application/json', withCredentials: false}
  };
}

function interpretResponse(bids) {
  let responses = [];
  utils._each(bids.body, function(bid) {
    responses.push({
      requestId: bid.id,
      cpm: parseFloat(bid.price),
      width: parseInt(bid.width, 10),
      height: parseInt(bid.height, 10),
      creativeId: bid.creativeId,
      dealId: bid.dealId || null,
      currency: 'USD',
      netRevenue: true,
      mediaType: BANNER,
      ad: decodeURIComponent(`${bid.ad}`),
      ttl: 60000
    });
  });
  return responses;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  isBidRequestValid,
  buildRequests,
  interpretResponse
}

registerBidder(spec);
