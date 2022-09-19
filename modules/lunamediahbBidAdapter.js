import { logMessage } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'lunamediahb';
const AD_URL = 'https://balancer.lmgssp.com/?c=o&m=multi';
const SYNC_URL = 'https://cookie.lmgssp.com';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId ||
    !bid.ttl || !bid.currency) {
    return false;
  }
  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl) || Boolean(bid.vastXml);
    case NATIVE:
      return Boolean(bid.native && bid.native.impressionTrackers);
    default:
      return false;
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(parseInt(bid.params.placementId)));
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    let winTop = window;
    let location;
    // TODO: this odd try-catch block was copied in several adapters; it doesn't seem to be correct for cross-origin
    try {
      location = new URL(bidderRequest.refererInfo.page)
      winTop = window.top;
    } catch (e) {
      location = winTop.location;
      logMessage(e);
    };

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
      };
      const mediaType = bid.mediaTypes

      if (mediaType && mediaType[BANNER] && mediaType[BANNER].sizes) {
        placement.sizes = mediaType[BANNER].sizes;
        placement.traffic = BANNER;
      } else if (mediaType && mediaType[VIDEO]) {
        if (mediaType[VIDEO].playerSize) {
          placement.wPlayer = mediaType[VIDEO].playerSize[0];
          placement.hPlayer = mediaType[VIDEO].playerSize[1];
        }
        placement.traffic = VIDEO;
        placement.videoContext = mediaType[VIDEO].context || 'instream'
      } else if (mediaType && mediaType[NATIVE]) {
        placement.native = mediaType[NATIVE];
        placement.traffic = NATIVE;
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
