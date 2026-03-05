import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { triggerPixel, mergeDeep } from '../src/utils.js';

const BIDDER_CODE = 'floxis';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const DEFAULT_REGION = 'us-e';
const DEFAULT_PARTNER = BIDDER_CODE;
const PARTNER_REGION_WHITELIST = {
  [DEFAULT_PARTNER]: [DEFAULT_REGION],
};

function isAllowedPartnerRegion(partner, region) {
  return PARTNER_REGION_WHITELIST[partner]?.includes(region) || false;
}

function getEndpointUrl(seat, region, partner) {
  if (!isAllowedPartnerRegion(partner, region)) return null;
  const host = partner === BIDDER_CODE
    ? `${region}.floxis.tech`
    : `${partner}-${region}.floxis.tech`;
  return `https://${host}/pbjs?seat=${encodeURIComponent(seat)}`;
}

function normalizeBidParams(params = {}) {
  return {
    seat: params.seat,
    region: params.region ?? DEFAULT_REGION,
    partner: params.partner ?? DEFAULT_PARTNER
  };
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
          version: '$prebid.version$'
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
    const { seat, region, partner } = normalizeBidParams(params);
    if (typeof seat !== 'string' || !seat.length) return false;
    if (!isAllowedPartnerRegion(partner, region)) return false;
    return true;
  },

  buildRequests(validBidRequests = [], bidderRequest = {}) {
    if (!validBidRequests.length) return [];
    const filteredBidRequests = validBidRequests.filter((bidRequest) => spec.isBidRequestValid(bidRequest));
    if (!filteredBidRequests.length) return [];

    const bidRequestsByParams = filteredBidRequests.reduce((groups, bidRequest) => {
      const { seat, region, partner } = normalizeBidParams(bidRequest.params);
      const key = `${seat}|${region}|${partner}`;
      groups[key] = groups[key] || [];
      groups[key].push({
        ...bidRequest,
        params: {
          ...bidRequest.params,
          seat,
          region,
          partner
        }
      });
      return groups;
    }, {});

    return Object.values(bidRequestsByParams).map((groupedBidRequests) => {
      const { seat, region, partner } = groupedBidRequests[0].params;
      const url = getEndpointUrl(seat, region, partner);
      if (!url) return null;
      return {
        method: 'POST',
        url,
        data: CONVERTER.toORTB({ bidRequests: groupedBidRequests, bidderRequest }),
        options: {
          withCredentials: true,
          contentType: 'text/plain'
        }
      };
    }).filter(Boolean);
  },

  interpretResponse(response, request) {
    if (!response?.body || !request?.data) return [];
    return CONVERTER.fromORTB({ request: request.data, response: response.body })?.bids || [];
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
