import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'escalax';
const ESCALAX_SOURCE_ID_MACRO = '[sourceId]';
const ESCALAX_ACCOUNT_ID_MACRO = '[accountId]';
const ESCALAX_SUBDOMAIN_MACRO = '[subdomain]';
const ESCALAX_URL = `https://${ESCALAX_SUBDOMAIN_MACRO}.escalax.io/bid?type=pjs&partner=${ESCALAX_SOURCE_ID_MACRO}&token=${ESCALAX_ACCOUNT_ID_MACRO}`;
const ESCALAX_DEFAULT_CURRENCY = 'USD';
const ESCALAX_DEFAULT_SUBDOMAIN = 'bidder_us';

function createImp(buildImp, bidRequest, context) {
  const imp = buildImp(bidRequest, context);
  imp.ext = {
    [BIDDER_CODE]: {
      sourceId: bidRequest.params.sourceId,
      accountId: bidRequest.params.accountId,
    }
  };
  if (!imp.bidfloor) imp.bidfloor = bidRequest.params.bidfloor;
  return imp;
}

function createRequest(buildRequest, imps, bidderRequest, context) {
  const request = buildRequest(imps, bidderRequest, context);
  const bid = context.bidRequests[0];
  request.test = config.getConfig('debug') ? 1 : 0;
  if (!request.cur) request.cur = [bid.params.currency || ESCALAX_DEFAULT_CURRENCY];
  return request;
}

function createBidResponse(buildBidResponse, bid, context) {
  const bidResponse = buildBidResponse(bid, context);
  bidResponse.cur = 'USD';
  return bidResponse;
}

function getSubdomain() {
  const regionMap = {
    'Europe': 'bidder_eu',
    'Africa': 'bidder_eu',
    'Atlantic': 'bidder_eu',
    'Arctic': 'bidder_eu',
    'Asia': 'bidder_apac',
    'Australia': 'bidder_apac',
    'Antarctica': 'bidder_apac',
    'Pacific': 'bidder_apac',
    'Indian': 'bidder_apac',
    'America': 'bidder_us'
  };

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const region = timezone.split('/')[0];
    return regionMap[region] || 'bidder_us';
  } catch (err) {
    return 'bidder_us';
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 20,
  },
  imp: createImp,
  request: createRequest,
  bidResponse: createBidResponse
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.params.sourceId) && Boolean(bid.params.accountId);
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    if (validBidRequests && validBidRequests.length === 0) return [];
    const { sourceId, accountId } = validBidRequests[0].params;
    const subdomain = getSubdomain();
    const endpointURL = ESCALAX_URL
      .replace(ESCALAX_SUBDOMAIN_MACRO, subdomain || ESCALAX_DEFAULT_SUBDOMAIN)
      .replace(ESCALAX_ACCOUNT_ID_MACRO, sourceId)
      .replace(ESCALAX_SOURCE_ID_MACRO, accountId);
    const request = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
    return {
      method: 'POST',
      url: endpointURL,
      data: request
    };
  },

  interpretResponse: (response, request) => {
    if (response?.body) {
      const bids = converter.fromORTB({ response: response.body, request: request.data }).bids;
      return bids;
    }
    return [];
  },
};

registerBidder(spec);
