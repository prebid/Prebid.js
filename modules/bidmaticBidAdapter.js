import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { replaceAuctionPrice, isNumber, deepAccess, isFn } from '../src/utils.js';

export const END_POINT = 'https://adapter.bidmatic.io/ortb-client';
const BIDDER_CODE = 'bidmatic';
const DEFAULT_CURRENCY = 'USD';

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 290,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const floorInfo = isFn(bidRequest.getFloor) ? bidRequest.getFloor({
      currency: context.currency || 'USD',
      size: '*',
      mediaType: '*'
    }) : {
      floor: imp.bidfloor || deepAccess(bidRequest, 'params.bidfloor') || 0,
      currency: DEFAULT_CURRENCY
    };

    if (floorInfo) {
      imp.bidfloor = floorInfo.floor;
      imp.bidfloorcur = floorInfo.currency;
    }
    imp.tagid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid') || bidRequest.adUnitCode;

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    if (!request.cur) {
      request.cur = [DEFAULT_CURRENCY];
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
    return isNumber(deepAccess(bid, 'params.source'))
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
          withCredentials: true,
        }
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse || !serverResponse.body) return [];
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
