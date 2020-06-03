import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'segmento';
const URL = 'https://prebid-bidder.rutarget.ru/bid';
const SYNC_IFRAME_URL = 'https://tag.rutarget.ru/tag?event=otherPage&check=true&response=syncframe&synconly=true';
const SYNC_IMAGE_URL = 'https://tag.rutarget.ru/tag?event=otherPage&check=true&synconly=true';
const RUB = 'RUB';
const TIME_TO_LIVE = 0;

export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: (bid) => {
    return Boolean(bid && bid.params && !isNaN(bid.params.placementId));
  },
  buildRequests: (validBidRequests, bidderRequest) => {
    const payload = {
      places: [],
      settings: {
        currency: RUB,
        referrer: bidderRequest.refererInfo && bidderRequest.refererInfo.referer
      }
    };

    for (let i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i];

      payload.places.push({
        id: bid.bidId,
        placementId: bid.params.placementId,
        sizes: bid.sizes
      });
    }

    return {
      method: 'POST',
      url: URL,
      data: payload
    };
  },
  interpretResponse: (serverResponse) => {
    const bids = serverResponse.body && serverResponse.body.bids;
    if (!bids) {
      return [];
    }

    const bidResponses = [];

    for (let i = 0; i < bids.length; i++) {
      const bid = bids[i];

      bidResponses.push({
        requestId: bid.id,
        cpm: bid.cpm,
        width: bid.size.width,
        height: bid.size.height,
        creativeId: bid.creativeId,
        currency: RUB,
        netRevenue: true,
        ttl: TIME_TO_LIVE,
        adUrl: bid.displayUrl
      });
    }

    return bidResponses;
  },
  getUserSyncs: (syncOptions) => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: SYNC_IFRAME_URL
      }];
    }

    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: SYNC_IMAGE_URL
      }];
    }

    return [];
  }
};

registerBidder(spec);
