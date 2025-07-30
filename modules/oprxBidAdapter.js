import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
let converterInstance;

export const spec = {
  code: 'oprx',
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!(bid?.params?.key && bid?.params?.placement_id);
  },

  buildRequests(bidRequests, bidderRequest) {
    if (!bidRequests?.length) return [];

    const endpoint = `https://pb.optimizerx.com/pb`;
    const converter = converterInstance || defaultConverter;

    const requestData = converter.toORTB({
      bidderRequest,
      bidRequests,
    });

    return [{
      method: 'POST',
      url: endpoint,
      data: requestData,
      options: {
        contentType: 'application/json;charset=utf-8',
        withCredentials: false
      }
    }];
  },

  interpretResponse(serverResponse, request) {
    const converter = converterInstance || defaultConverter;
    const response = serverResponse?.body || {};
    const requestData = request?.data;
    return converter.fromORTB({ response, request: requestData }).bids || [];
  }
};

// defaultConverter = real one used in prod
const defaultConverter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 50,
    currency: 'USD',
    mediaType: BANNER,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.ext = {bidder: bidRequest.params};
    if (bidRequest.params.bid_floor) {
      imp.bidfloor = bidRequest.params.bid_floor;
    }
    return imp;
  },
});

// Allow test override
export function __setTestConverter(mockConverter) {
  converterInstance = mockConverter;
}

registerBidder(spec);
