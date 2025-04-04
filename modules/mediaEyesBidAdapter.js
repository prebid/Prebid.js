import {
  BANNER
} from '../src/mediaTypes.js';
import {
  registerBidder
} from '../src/adapters/bidderFactory.js';
import { deepAccess, generateUUID } from '../src/utils.js';

const ENDPOINT_URL = 'https://delivery.upremium.asia/ortb/open/auction';

export const spec = {
  code: 'mediaeyes',
  supportedMediaTypes: BANNER,

  isBidRequestValid: (bid) => {
    return !!(bid.params.itemId);
  },

  buildRequests: (bidRequests, bidderRequest) => {
    let requests = [];

    bidRequests.map(bidRequest => {
      let {itemId} = bidRequest.params;
      let requestData = {
        id: generateUUID(),
        imp: [cookingImp(bidRequest)],
        device: bidRequest.ortb2?.device,
        site: bidRequest.ortb2?.site,
      }
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL + "?item_id=" + itemId,
        data: JSON.stringify(requestData),
        options: {
          contentType: 'application/json',
        }
      });
    })

    return requests
  },

  interpretResponse: (serverResponse, serverRequest) => {
    let response = serverResponse.body;
    if (!response.seatbid) {
      return [];
    }

    let rtbBids = response.seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    let data = rtbBids.map(rtbBid => {
      let prBid = {
        requestId: rtbBid.impid,
        cpm: rtbBid.price,
        creativeId: rtbBid.crid,
        currency: response.cur || 'USD',
        ttl: 360,
        netRevenue: true
      };

      prBid.mediaType = BANNER;
      prBid.width = rtbBid.w;
      prBid.height = rtbBid.h;
      prBid.ad = rtbBid.adm;

      return prBid
    });

    return data
  }
}

registerBidder(spec);

function cookingImp(bidReq) {
  let imp = {};
  if (bidReq) {
    let bidfloor = deepAccess(bidReq, 'params.bid_floor', 0)

    imp.id = bidReq.bidId;
    imp.bidfloor = bidfloor;
    imp.banner = cookImpBanner(bidReq);
  }
  return imp;
}

const cookImpBanner = ({ mediaTypes, params }) => {
  if (!mediaTypes?.banner) return {};

  const { sizes } = mediaTypes.banner;
  return {
    h: params.height || sizes?.[0]?.[1] || undefined,
    w: params.width || sizes?.[0]?.[0] || undefined,
  };
};
