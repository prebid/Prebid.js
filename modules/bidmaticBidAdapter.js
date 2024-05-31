import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { replaceAuctionPrice, isNumber, deepAccess } from '../src/utils.js';

const BIDDER_CODE = 'bidmatic';
const END_POINT = 'https://ads45.bidmatic.io/ortb-client/';
const DEFAULT_CURRENCY = 'USD';

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 290,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp.bidfloor) {
      imp.bidfloor = bidRequest.params.bidfloor || 0;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }
    imp.tagid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid') || bidRequest.adUnitCode;
    imp.ext.souce = bidRequest.params.source;

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

    let resMediaType;
    const reqMediaTypes = Object.keys(bidRequest.mediaTypes);
    if (reqMediaTypes.length === 1) {
      resMediaType = reqMediaTypes[0];
    } else {
      if (bid.adm.search(/^(<\?xml|<vast)/i) !== -1) {
        resMediaType = VIDEO;
      } else {
        resMediaType = BANNER;
      }
    }

    context.mediaType = resMediaType;

    return buildBidResponse(bid, context);
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: 1134,
  isBidRequestValid: function (bid) {
    if (isNumber(bid.params.source)) {
      return true;
    }
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const requestsBySource = validBidRequests.reduce((acc, bidRequest) => {
      acc[bidRequest.params.source] = acc[bidRequest.params.source] || [];
      acc[bidRequest.params.source].push(bidRequest);
      return acc;
    }, {});

    return Object.entries(requestsBySource).map(([source, bidRequests]) => {
      const data = converter.toORTB({ bidRequests, bidderRequest });
      const url = new URL(END_POINT);
      url.searchParams.append('source', source);
      return {
        method: 'POST',
        url: url.toString(),
        data: data,
        options: {
          withCredentials: false,
        }
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse.body) return [];
    const parsedSeatbid = serverResponse.body.seatbid.map(seatbidItem => {
      const parsedBid = seatbidItem.bid.map((bidItem) => ({
        ...bidItem,
        adm: replaceAuctionPrice(bidItem.adm, bidItem.price),
        nurl: replaceAuctionPrice(bidItem.nurl, bidItem.price)
      }));
      return { ...seatbidItem, bid: parsedBid };
    });

    const responseBody = { ...serverResponse.body, seatbid: parsedSeatbid };
    return converter.fromORTB({
      response: responseBody,
      request: bidRequest.data,
    }).bids;
  },

};
registerBidder(spec);
