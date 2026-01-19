import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
    buildRequestsBase,
    buildPlacementProcessingFunction,
} from '../libraries/teqblazeUtils/bidderUtils.js';

import { replaceAuctionPrice, deepAccess } from '../src/utils.js';

const BIDDER_CODE = 'aceex';
const GVLID = 1387;
const AD_REQUEST_URL = 'http://bl-us.aceex.io/?secret_key=prebidjs';

const addCustomFieldsToPlacement = (bid, bidderRequest, placement) => {
  placement.trafficType = placement.adFormat;
  placement.publisherId = bid.params.publisherId;
  placement.internalKey = bid.params.internalKey;
  placement.bidfloor = bid.params.bidfloor;
};

const placementProcessingFunction = buildPlacementProcessingFunction({ addCustomFieldsToPlacement });

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return !!(bid.bidId && bid.params?.publisherId && bid.params?.trafficType);
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    const base = buildRequestsBase({ adUrl: AD_REQUEST_URL, validBidRequests, bidderRequest, placementProcessingFunction });

    base.data.cat = deepAccess(bidderRequest, 'ortb2.cat');
    base.data.keywords = deepAccess(bidderRequest, 'ortb2.keywords');
    base.data.badv = deepAccess(bidderRequest, 'ortb2.badv');
    base.data.wseat = deepAccess(bidderRequest, 'ortb2.wseat');
    base.data.bseat = deepAccess(bidderRequest, 'ortb2.bseat');

    return base;
  },

   interpretResponse: (serverResponse, bidRequest) => {
    if (!serverResponse || !serverResponse.body || !Array.isArray(serverResponse.body.seatbid)) return [];

    const repackedBids = [];

    serverResponse.body.seatbid.forEach(seatbidItem => {
      const parsedBid = seatbidItem.bid.map((bidItem) => ({
        ...bidItem,
        adm: replaceAuctionPrice(bidItem.adm, bidItem.price),
        nurl: replaceAuctionPrice(bidItem.nurl, bidItem.price)
      }));

      parsedBid.forEach((bid) => {
        const originalPlacement = bidRequest.data.placements?.find(pl => pl.bidId === bid.id);

        const repackedBid = {
          cpm: bid.price,
          creativeId: bid.crid,
          currency: 'USD',
          dealId: bid.dealid,
          height: bid.h,
          width: bid.w,
          mediaType: originalPlacement.adFormat,
          netRevenue: true,
          requestId: bid.id,
          ttl: 1200,
          meta: {
            advertiserDomains: [ bid.adomain ]
          },
        };

        switch (originalPlacement.adFormat) {
          case 'video':
            repackedBid.vastXml = bid.adm;
            break;

          case 'banner':
            repackedBid.ad = bid.adm;
            break;

          case 'native':
            const nativeResponse = JSON.parse(bid.adm).native;

            const { assets, imptrackers, link } = nativeResponse;
            repackedBid.native = {
                ortb: { assets, imptrackers, link },
            };
            break;

          default: break;
        };

        repackedBids.push(repackedBid);
      })
    });

    return repackedBids;
  },
};

registerBidder(spec);
