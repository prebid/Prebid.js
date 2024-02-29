import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const adpterVersion = '1.0';
export const REQUEST_URL = 'https://spicyrtb.com/auction/prebid';
export const DEFAULT_CURRENCY = 'USD';

export const spec = {
  code: 'adfusion',
  gvlid: 844,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  isBannerBid,
  isVideoBid,
};

registerBidder(spec);

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const floor = getBidFloor(bidRequest);
    if (floor) {
      imp.bidfloor = floor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    const bid = context.bidRequests[0];
    utils.mergeDeep(req, {
      at: 1,
      ext: {
        prebid: {
          accountid: bid.params.accountId,
          adapterVersion: `${adpterVersion}`,
        },
      },
    });
    return req;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const response = buildResponse(bidResponses, ortbResponse, context);
    return response.bids;
  },
});

function isBidRequestValid(bidRequest) {
  const isValid = bidRequest.params.accountId;
  if (!isValid) {
    utils.logError('AdFusion adapter bidRequest has no accountId');
    return false;
  }
  return true;
}

function buildRequests(bids, bidderRequest) {
  let videoBids = bids.filter((bid) => isVideoBid(bid));
  let bannerBids = bids.filter((bid) => isBannerBid(bid));
  let requests = bannerBids.length
    ? [createRequest(bannerBids, bidderRequest, BANNER)]
    : [];
  videoBids.forEach((bid) => {
    requests.push(createRequest([bid], bidderRequest, VIDEO));
  });
  return requests;
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  return {
    method: 'POST',
    url: REQUEST_URL,
    data: converter.toORTB({
      bidRequests,
      bidderRequest,
      context: { mediaType },
    }),
  };
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner');
}

function interpretResponse(resp, req) {
  return converter.fromORTB({ request: req.data, response: resp.body });
}

function getBidFloor(bid) {
  if (utils.isFn(bid.getFloor)) {
    let floor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: '*',
      size: '*',
    });
    if (
      utils.isPlainObject(floor) &&
      !isNaN(floor.floor) &&
      floor.currency === DEFAULT_CURRENCY
    ) {
      return floor.floor;
    }
  }
  return null;
}
