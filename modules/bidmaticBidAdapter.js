import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { replaceAuctionPrice } from '../src/utils.js';

const BIDDER_CODE = 'bidmatic';
const END_POINT = 'https://ghb.bidmatic.io/pbs/ortb';
const DEFAULT_CURRENCY = 'USD';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 290,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp.bidfloor) {
      imp.bidfloor = bidRequest.params.bidfloor || 0;
      imp.bidfloorcur = bidRequest.params.currency || DEFAULT_CURRENCY;
    }
    imp.ext.source = bidRequest.params.aid
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bid = context.bidRequests[0];
    if (!request.cur) {
      request.cur = [bid.params.currency || DEFAULT_CURRENCY];
    }
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest } = context;

    // let resMediaType;
    // const reqMediaTypes = Object.keys(bidRequest.mediaTypes);
    // if (reqMediaTypes.length === 1) {
    //   resMediaType = reqMediaTypes[0];
    // } else {
    //   if (bid.adm.search(/^(<\?xml|<vast)/i) !== -1) {
    //     resMediaType = VIDEO;
    //   } else if (bid.adm[0] === '{') {
    //     resMediaType = NATIVE;
    //   } else {
    //     resMediaType = BANNER;
    //   }
    // }
    //
    // context.mediaType = resMediaType;
    // context.cpm = bid.price;

    const bidResponse = buildBidResponse(bid, context);
    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function (bid) {
    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const data = converter.toORTB({ validBidRequests, bidderRequest });
    const url = new URL(END_POINT);
    url.searchParams.append('aid', validBidRequests[0].params.aid);
    return {
      method: 'POST',
      url: url.toString(),
      data: data,
      options: {
        withCredentials: false,
      }
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse.body) return [];
    const parsedSeatbid = serverResponse.body.seatbid.map(seatbidItem => {
      const parsedBid = seatbidItem.bid.map((bidItem) => ({
        ...bidItem,
        adm: replaceAuctionPrice(bidItem.adm, bidItem.price),
        nurl: replaceAuctionPrice(bidItem.nurl, bidItem.price)
      }));
      return {...seatbidItem, bid: parsedBid};
    });

    const responseBody = {...serverResponse.body, seatbid: parsedSeatbid};
    const bids = converter.fromORTB({
      response: responseBody,
      request: bidRequest.data,
    }).bids;
    return bids;
  },

};
registerBidder(spec);
