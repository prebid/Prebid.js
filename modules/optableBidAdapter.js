import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
const converter = ortbConverter({
  context: { netRevenue: true, ttl: 300 },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    utils.mergeDeep(imp, {
      tagid: bidRequest.params.site,
    });
    return imp;
  }
});
const BIDDER_CODE = 'optable';
const DEFAULT_REGION = 'ca'
const DEFAULT_ORIGIN = 'https://ads.optable.co'

function getOrigin() {
  return config.getConfig('optable.origin') ?? DEFAULT_ORIGIN;
}

function getBaseUrl() {
  const region = config.getConfig('optable.region') ?? DEFAULT_REGION;
  return `${getOrigin()}/${region}`
}

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) { return !!bid.params?.site },
  buildRequests: function(bidRequests, bidderRequest) {
    const requestURL = `${getBaseUrl()}/ortb2/v1/ssp/bid`
    const data = converter.toORTB({ bidRequests, bidderRequest, context: { mediaType: BANNER } });
    return { method: 'POST', url: requestURL, data }
  },
  interpretResponse: function(response, request) {
    const bids = converter.fromORTB({ response: response.body, request: request.data }).bids
    return { bids }
  },
  supportedMediaTypes: [BANNER]
}
registerBidder(spec);
