import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isFn, deepAccess, logMessage } from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'adprime';
const AD_URL = 'https://delta.adprime.com/pbjs';
const SYNC_URL = 'https://sync.adprime.com';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId ||
    !bid.ttl || !bid.currency || !bid.meta) {
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

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && bid.params.placementId);
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
      deviceWidth: winTop.screen.width,
      deviceHeight: winTop.screen.height,
      language: (navigator && navigator.language) ? navigator.language.split('-')[0] : '',
      secure: 1,
      host: location.host,
      page: location.pathname,
      placements: placements
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
      const { mediaTypes } = bid;
      const placement = {};
      let sizes
      let identeties = {}
      if (mediaTypes) {
        if (mediaTypes[BANNER] && mediaTypes[BANNER].sizes) {
          placement.adFormat = BANNER;
          sizes = mediaTypes[BANNER].sizes
        } else if (mediaTypes[VIDEO] && mediaTypes[VIDEO].playerSize) {
          placement.adFormat = VIDEO;
          sizes = mediaTypes[VIDEO].playerSize
          placement.minduration = mediaTypes[VIDEO].minduration;
          placement.maxduration = mediaTypes[VIDEO].maxduration;
          placement.mimes = mediaTypes[VIDEO].mimes;
          placement.protocols = mediaTypes[VIDEO].protocols;
          placement.startdelay = mediaTypes[VIDEO].startdelay;
          placement.placement = mediaTypes[VIDEO].placement;
          placement.skip = mediaTypes[VIDEO].skip;
          placement.skipafter = mediaTypes[VIDEO].skipafter;
          placement.minbitrate = mediaTypes[VIDEO].minbitrate;
          placement.maxbitrate = mediaTypes[VIDEO].maxbitrate;
          placement.delivery = mediaTypes[VIDEO].delivery;
          placement.playbackmethod = mediaTypes[VIDEO].playbackmethod;
          placement.api = mediaTypes[VIDEO].api;
          placement.linearity = mediaTypes[VIDEO].linearity;
        } else {
          placement.adFormat = NATIVE;
          placement.native = mediaTypes[NATIVE];
        }
      }
      if (bid.userId && bid.userId.idl_env) {
        identeties.identityLink = bid.userId.idl_env
      }

      placements.push({
        ...placement,
        placementId: bid.params.placementId,
        bidId: bid.bidId,
        sizes: sizes || [],
        wPlayer: sizes ? sizes[0] : 0,
        hPlayer: sizes ? sizes[1] : 0,
        schain: bid.schain || {},
        keywords: bid.params.keywords || [],
        audiences: bid.params.audiences || [],
        identeties,
        bidFloor: getBidFloor(bid)
      });
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

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    let syncType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let syncUrl = SYNC_URL + `/${syncType}?pbjs=1`;
    if (gdprConsent && gdprConsent.consentString) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        syncUrl += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        syncUrl += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
      }
    }
    if (uspConsent && uspConsent.consentString) {
      syncUrl += `&ccpa_consent=${uspConsent.consentString}`;
    }

    const coppa = config.getConfig('coppa') ? 1 : 0;
    syncUrl += `&coppa=${coppa}`;

    return [{
      type: syncType,
      url: syncUrl
    }];
  }
};

registerBidder(spec);
