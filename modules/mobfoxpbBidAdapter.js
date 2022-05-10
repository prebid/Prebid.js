import { isFn, deepAccess, getWindowTop } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'mobfoxpb';
const AD_URL = 'https://bes.mobfox.com/pbjs';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId ||
    !bid.ttl || !bid.currency) {
    return false;
  }
  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl);
    case NATIVE:
      return Boolean(bid.native && bid.native.impressionTrackers);
    default:
      return false;
  }
}

function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidfloor', 0);
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
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && bid.params.placementId);
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    const winTop = getWindowTop();
    const location = winTop.location;
    const placements = [];
    const request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language.split('-')[0] : '',
      'secure': 1,
      'host': location.host,
      'page': location.pathname,
      'placements': placements
    };

    if (bidderRequest) {
      if (bidderRequest.uspConsent) {
        request.ccpa = bidderRequest.uspConsent;
      }
      if (bidderRequest.gdprConsent) {
        request.gdpr = bidderRequest.gdprConsent
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
      const mediaType = bid.mediaTypes

      if (mediaType && mediaType[BANNER] && mediaType[BANNER].sizes) {
        placement.traffic = BANNER;
        placement.sizes = mediaType[BANNER].sizes;
      } else if (mediaType && mediaType[VIDEO] && mediaType[VIDEO].playerSize) {
        placement.traffic = VIDEO;
        placement.wPlayer = mediaType[VIDEO].playerSize[0];
        placement.hPlayer = mediaType[VIDEO].playerSize[1];
        placement.playerSize = mediaType[VIDEO].playerSize;
        placement.minduration = mediaType[VIDEO].minduration;
        placement.maxduration = mediaType[VIDEO].maxduration;
        placement.mimes = mediaType[VIDEO].mimes;
        placement.protocols = mediaType[VIDEO].protocols;
        placement.startdelay = mediaType[VIDEO].startdelay;
        placement.placement = mediaType[VIDEO].placement;
        placement.skip = mediaType[VIDEO].skip;
        placement.skipafter = mediaType[VIDEO].skipafter;
        placement.minbitrate = mediaType[VIDEO].minbitrate;
        placement.maxbitrate = mediaType[VIDEO].maxbitrate;
        placement.delivery = mediaType[VIDEO].delivery;
        placement.playbackmethod = mediaType[VIDEO].playbackmethod;
        placement.api = mediaType[VIDEO].api;
        placement.linearity = mediaType[VIDEO].linearity;
      } else if (mediaType && mediaType[NATIVE]) {
        placement.traffic = NATIVE;
        placement.native = mediaType[NATIVE];
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
        resItem.meta = resItem.meta || {};
        resItem.meta.advertiserDomains = resItem.adomain || [];

        response.push(resItem);
      }
    }
    return response;
  },
};

registerBidder(spec);
