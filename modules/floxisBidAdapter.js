import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { triggerPixel, mergeDeep } from '../src/utils.js';

const BIDDER_CODE = 'floxis';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

function getEndpointUrl(seat, region, partner) {
  const subdomain = partner === BIDDER_CODE ? region : `${partner}-${region}`;
  return `https://${subdomain}.floxis.tech/pbjs?seat=${encodeURIComponent(seat)}`;
}

const CONVERTER = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.secure = bidRequest.ortb2Imp?.secure ?? 1;

    let floorInfo;
    if (typeof bidRequest.getFloor === 'function') {
      try {
        floorInfo = bidRequest.getFloor({
          currency: DEFAULT_CURRENCY,
          mediaType: '*',
          size: '*'
        });
      } catch (e) { }
    }
    const floor = floorInfo?.floor;
    const floorCur = floorInfo?.currency || DEFAULT_CURRENCY;
    if (typeof floor === 'number' && !isNaN(floor)) {
      imp.bidfloor = floor;
      imp.bidfloorcur = floorCur;
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    mergeDeep(req, {
      at: 1,
      ext: {
        prebid: {
          adapter: BIDDER_CODE,
          adapterVersion: '2.0.0'
        }
      }
    });
    return req;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    const params = bid?.params;
    if (!params) return false;
    if (typeof params.seat !== 'string' || !params.seat.length) return false;
    if (typeof params.region !== 'string' || !params.region.length) return false;
    if (typeof params.partner !== 'string' || !params.partner.length) return false;
    return true;
  },

  buildRequests(validBidRequests = [], bidderRequest = {}) {
    if (!validBidRequests.length) return [];

    const firstBid = validBidRequests[0];
    const { seat, region, partner } = firstBid.params;
    const url = getEndpointUrl(seat, region, partner);
    const data = CONVERTER.toORTB({ bidRequests: validBidRequests, bidderRequest });

    return [{
      method: 'POST',
      url,
      data,
      options: {
        withCredentials: true,
        contentType: 'application/json'
      }
    }];
  },

  interpretResponse(response, request) {
    if (!response?.body) return [];
    return CONVERTER.fromORTB({ request: request.data, response: response.body }).bids;
  },

  getUserSyncs() {
    return [];
  },

  onBidWon(bid) {
    if (bid.burl) {
      triggerPixel(bid.burl);
    }
    if (bid.nurl) {
      triggerPixel(bid.nurl);
    }
  }
};

registerBidder(spec);
