import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isFn, deepAccess, logMessage } from '../src/utils.js';

const BIDDER_CODE = 'e_volution';
const AD_URL = 'https://service.e-volution.ai/?c=o&m=multi';
const URL_SYNC = 'https://service.e-volution.ai/?c=o&m=sync';
const NO_SYNC = true;

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
      return Boolean(bid.native && bid.native.title && bid.native.image && bid.native.impressionTrackers);
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
  noSync: NO_SYNC,

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(parseInt(bid.params.placementId)));
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    let winTop = window;
    let location;
    try {
      location = new URL(bidderRequest.refererInfo.referer)
      winTop = window.top;
    } catch (e) {
      location = winTop.location;
      logMessage(e);
    };
    let placements = [];
    let request = {
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
      let bid = validBidRequests[i];

      const placement = {
        placementId: bid.params.placementId,
        bidId: bid.bidId,
        bidfloor: getBidFloor(bid)
      }

      if (bid.mediaTypes && bid.mediaTypes[BANNER] && bid.mediaTypes[BANNER].sizes) {
        placement.traffic = BANNER;
        placement.sizes = bid.mediaTypes[BANNER].sizes;
      } else if (bid.mediaTypes && bid.mediaTypes[VIDEO] && bid.mediaTypes[VIDEO].playerSize) {
        placement.traffic = VIDEO;
        placement.wPlayer = bid.mediaTypes[VIDEO].playerSize[0];
        placement.hPlayer = bid.mediaTypes[VIDEO].playerSize[1];
        placement.minduration = bid.mediaTypes[VIDEO].minduration;
        placement.maxduration = bid.mediaTypes[VIDEO].maxduration;
        placement.mimes = bid.mediaTypes[VIDEO].mimes;
        placement.protocols = bid.mediaTypes[VIDEO].protocols;
        placement.startdelay = bid.mediaTypes[VIDEO].startdelay;
        placement.placement = bid.mediaTypes[VIDEO].placement;
        placement.skip = bid.mediaTypes[VIDEO].skip;
        placement.skipafter = bid.mediaTypes[VIDEO].skipafter;
        placement.minbitrate = bid.mediaTypes[VIDEO].minbitrate;
        placement.maxbitrate = bid.mediaTypes[VIDEO].maxbitrate;
        placement.delivery = bid.mediaTypes[VIDEO].delivery;
        placement.playbackmethod = bid.mediaTypes[VIDEO].playbackmethod;
        placement.api = bid.mediaTypes[VIDEO].api;
        placement.linearity = bid.mediaTypes[VIDEO].linearity;
      } else if (bid.mediaTypes && bid.mediaTypes[NATIVE]) {
        placement.traffic = NATIVE;
        placement.native = bid.mediaTypes[NATIVE];
      }

      if (bid.schain) {
        placements.schain = bid.schain;
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
    if (NO_SYNC) {
      return false
    } else {
      return [{
        type: 'image',
        url: URL_SYNC
      }];
    }
  }

};

registerBidder(spec);
