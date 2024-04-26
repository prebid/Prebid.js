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

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) { return !!bid.params?.site },
  buildRequests: function(bidRequests, bidderRequest) {
    const region = config.getConfig('optable.region') ?? DEFAULT_REGION
    const origin = config.getConfig('optable.origin') ?? DEFAULT_ORIGIN
    const requestURL = `${origin}/${region}/ortb2/v1/ssp/bid`
    const data = converter.toORTB({ bidRequests, bidderRequest, context: { mediaType: BANNER } });

    return { method: 'POST', url: requestURL, data }
  },
  interpretResponse: function(response, request) {
    const bids = converter.fromORTB({ response: response.body, request: request.data }).bids
    const auctionConfigs = (response.body.ext?.optable?.fledge?.auctionconfigs ?? []).map((cfg) => {
      const { impid, ...config } = cfg;
      return { bidId: impid, config }
    })

    return { bids, fledgeAuctionConfigs: auctionConfigs }
  },
  supportedMediaTypes: [BANNER]
}
registerBidder(spec);
