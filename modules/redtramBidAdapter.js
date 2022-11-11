import {
  isFn,
  isStr,
  deepAccess,
  getWindowTop,
  triggerPixel,
  logInfo
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'redtram';
const LOG_INFO_PREFIX = '[RT Info]: ';
const AD_URL = 'https://prebid.redtram.com/pbjs';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId ||
    !bid.ttl || !bid.currency || !bid.meta) {
    return false;
  }

  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    default:
      return false;
  }
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidFloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*',
    });
    return bidFloor.floor;
  } catch (_) {
    return 0
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && bid.params.placementId);
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const winTop = getWindowTop();
    const location = winTop.location;
    const placements = [];

    const request = {
      deviceWidth: winTop.screen.width,
      deviceHeight: winTop.screen.height,
      language: (navigator && navigator.language) ? navigator.language.split('-')[0] : '',
      host: location.host,
      page: location.pathname,
      placements: placements
    };

    if (bidderRequest) {
      if (bidderRequest.uspConsent) {
        request.ccpa = bidderRequest.uspConsent;
      }
      if (bidderRequest.gdprConsent) {
        request.gdpr = bidderRequest.gdprConsent;
      }
    }

    const len = validBidRequests.length;
    for (let i = 0; i < len; i++) {
      const bid = validBidRequests[i];
      const placement = {
        placementId: bid.params.placementId,
        bidId: bid.bidId,
        schain: bid.schain || {},
        bidfloor: getBidFloor(bid)
      };

      if (typeof bid.userId !== 'undefined') {
        placement.userId = bid.userId;
      }

      const mediaType = bid.mediaTypes;

      if (mediaType && mediaType[BANNER] && mediaType[BANNER].sizes) {
        placement.sizes = mediaType[BANNER].sizes;
        placement.adFormat = BANNER;
      }

      placements.push(placement);
    }

    return {
      method: 'POST',
      url: AD_URL,
      data: request
    };
  },

  interpretResponse: (serverResponse) => {
    let response = [];
    for (let i = 0; i < serverResponse.body.length; i++) {
      let resItem = serverResponse.body[i];
      if (isBidResponseValid(resItem)) {
        const advertiserDomains = resItem.adomain && resItem.adomain.length ? resItem.adomain : [];
        resItem.meta = { ...resItem.meta, advertiserDomains };

        response.push(resItem);
      }
    }
    return response;
  },

  getUserSyncs: (syncOptions, serverResponses) => {
    logInfo(LOG_INFO_PREFIX + `getUserSyncs`);
  },

  onBidWon: (bid) => {
    const cpm = deepAccess(bid, 'adserverTargeting.hb_pb') || '';
    if (isStr(bid.nurl) && bid.nurl !== '') {
      bid.nurl = bid.nurl.replace(/\${AUCTION_PRICE}/, cpm);
      triggerPixel(bid.nurl);
    }
  }
};

registerBidder(spec);
