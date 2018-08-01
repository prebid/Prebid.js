import * as utils from 'src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

export const BIDDER_CODE = 'nanointeractive';
export const ENGINE_BASE_URL = 'https://www.audiencemanager.de/hb';

export const DATA_PARTNER_PIXEL_ID = 'pid';
export const NQ = 'nq';
export const NQ_NAME = 'name';
export const CATEGORY = 'category';
export const CATEGORY_NAME = 'categoryName';
export const SUB_ID = 'subId';
export const REF = 'ref';
export const LOCATION = 'loc';

export const spec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid (bid) {
    const pid = bid.params[DATA_PARTNER_PIXEL_ID];
    return !!(pid);
  },
  buildRequests (bidRequests) {
    let payload = [];
    bidRequests.forEach(bid => payload.push(createSingleBidRequest(bid)));
    return {
      method: 'POST',
      url: ENGINE_BASE_URL,
      data: JSON.stringify(payload)
    };
  },
  interpretResponse (serverResponse) {
    const bids = [];
    serverResponse.body.forEach(serverBid => {
      if (isEngineResponseValid(serverBid)) {
        bids.push(createSingleBidResponse(serverBid));
      }
    });
    return bids;
  }
};

function createSingleBidRequest (bid) {
  return {
    [DATA_PARTNER_PIXEL_ID]: bid.params[DATA_PARTNER_PIXEL_ID],
    [NQ]: [createNqParam(bid)],
    [CATEGORY]: [createCategoryParam(bid)],
    [SUB_ID]: createSubIdParam(bid),
    [REF]: createRefParam(bid),
    sizes: bid.sizes.map(value => value[0] + 'x' + value[1]),
    bidId: bid.bidId,
    cors: utils.getOrigin(),
    [LOCATION]: createLocationParam(),
  };
}

function createSingleBidResponse (serverBid) {
  return {
    requestId: serverBid.id,
    cpm: serverBid.cpm,
    width: serverBid.width,
    height: serverBid.height,
    ad: serverBid.ad,
    ttl: serverBid.ttl,
    creativeId: serverBid.creativeId,
    netRevenue: serverBid.netRevenue || true,
    currency: serverBid.currency,
  };
}

function createNqParam (bid) {
  return bid.params[NQ_NAME] ? utils.getParameterByName(bid.params[NQ_NAME]) : bid.params[NQ] || null;
}

function createCategoryParam (bid) {
  return bid.params[CATEGORY_NAME] ? utils.getParameterByName(bid.params[CATEGORY_NAME]) : bid.params[CATEGORY] || null;
}

function createSubIdParam (bid) {
  return bid.params[SUB_ID] || null;
}

function createRefParam (bid) {
  return bid.params[REF] ? null : utils.getTopWindowReferrer() || null;
}

function createLocationParam () {
  return utils.getTopWindowLocation().href;
}

function isEngineResponseValid (response) {
  return !!response.cpm && !!response.ad;
}

registerBidder(spec);
