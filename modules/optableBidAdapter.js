import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import {deepClone} from "../src/utils.js";
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
    const auctionConfigs = (response.body.ext?.optable?.fledge?.auctionconfigs ?? []).flatMap((cfg) => {
      const { impid, ...config } = cfg;
      const asnc = ['auctionSignals', 'sellerSignals', 'perBuyerSignals', 'perBuyerTimeouts', 'deprecatedRenderURLReplacements', 'directFromSellerSignals']
      const config2 = deepClone(config);
      Object.keys(config)
        .filter(key => asnc.includes(key))
        .forEach(key => {
          config[key] = ((val) => new Promise((resolve) => setTimeout(() => resolve(val), 2000)))(config[key]);
          config2[key] = ((val) => new Promise((resolve, reject) => setTimeout(() => resolve({}), 2000)))(config[key]);
        });
      return [{ bidId: impid, config }, {bidId: impid, config: config2}]
    })

    return { bids, paapi: auctionConfigs }
  },
  supportedMediaTypes: [BANNER]
}
registerBidder(spec);
