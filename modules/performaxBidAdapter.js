import { deepSetValue, deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js'
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'performax';
const BIDDER_SHORT_CODE = 'px';
const GVLID = 732
const ENDPOINT = 'https://dale.performax.cz/ortb'
export const converter = ortbConverter({

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'tagid', bidRequest.params.tagid);
    return imp;
  },

  bidResponse(buildBidResponse, bid, context) {
    context.netRevenue = deepAccess(bid, 'netRevenue');
    context.mediaType = deepAccess(bid, 'mediaType');
    context.currency = deepAccess(bid, 'currency');

    return buildBidResponse(bid, context)
  },

  context: {
    ttl: 360,
  }
})

export const spec = {
  code: BIDDER_CODE,
  aliases: [BIDDER_SHORT_CODE],
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!bid.params.tagid;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    let data = converter.toORTB({bidderRequest, bidRequests})
    return [{
      method: 'POST',
      url: ENDPOINT,
      options: {'contentType': 'application/json'},
      data: data
    }]
  },

  interpretResponse: function (bidderResponse, request) {
    if (!bidderResponse.body) return [];
    const response = bidderResponse.body
    const data = {

      seatbid: response.seatbid.map(seatbid => ({
        seat: seatbid.seat,
        bid: seatbid.bid.map(bid => ({
          impid: bid.imp_id,
          w: bid.w,
          h: bid.h,
          requestId: request.data.id,
          price: bid.price,
          currency: response.cur,
          adm: bid.adm,
          crid: bid.id,
          netRevenue: true,
          mediaType: BANNER,
        }))
      }))
    };
    return converter.fromORTB({ response: data, request: request.data }).bids
  },

}

registerBidder(spec);
