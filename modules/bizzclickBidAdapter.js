import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'bizzclick';
const SOURCE_ID_MACRO = '[sourceid]';
const ACCOUNT_ID_MACRO = '[accountid]';
const HOST_MACRO = '[host]';
const URL = `https://${HOST_MACRO}.bizzclick.com/bid?rtb_seat_id=${SOURCE_ID_MACRO}&secret_key=${ACCOUNT_ID_MACRO}&integration_type=prebidjs`;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_HOST = 'us-e-node1';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 20,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp.bidfloor) imp.bidfloor = bidRequest.params.bidfloor || 0;
    imp.ext = {
      [BIDDER_CODE]: {
        accountId: bidRequest.params.accountId,
        sourceId: bidRequest.params.sourceId,
        host: bidRequest.params.host || DEFAULT_HOST,
      }
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bid = context.bidRequests[0];
    request.test = config.getConfig('debug') ? 1 : 0;
    if (!request.cur) request.cur = [bid.params.currency || DEFAULT_CURRENCY];
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.cur = bid.cur || DEFAULT_CURRENCY;
    return bidResponse;
  }
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
    const host = validBidRequests[0].params.host || 'USE';
    const endpointURL = URL.replace(HOST_MACRO, host || DEFAULT_HOST)
      .replace(ACCOUNT_ID_MACRO, accountId)
      .replace(SOURCE_ID_MACRO, sourceId);
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
