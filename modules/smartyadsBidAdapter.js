import { logMessage } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'smartyads';
const AD_URL = 'https://n1.smartyads.com/?c=o&m=prebid&secret_key=prebid_js';
const URL_SYNC = 'https://as.ck-ie.com/prebidjs?p=7c47322e527cf8bdeb7facc1bb03387a';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId ||
    !bid.ttl || !bid.currency) {
    return false;
  }
  switch (bid['mediaType']) {
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

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.sourceid) && !isNaN(bid.params.accountid) && bid.params.host == 'prebid');
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
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
    let placements = [];
    let request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language : '',
      'secure': 1,
      'host': location.host,
      'page': location.pathname,
      'coppa': config.getConfig('coppa') === true ? 1 : 0,
      'placements': placements
    };
    request.language.indexOf('-') != -1 && (request.language = request.language.split('-')[0])
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
      let traff = bid.params.traffic || BANNER
      placements.push({
        placementId: bid.params.sourceid,
        bidId: bid.bidId,
        sizes: bid.mediaTypes && bid.mediaTypes[traff] && bid.mediaTypes[traff].sizes ? bid.mediaTypes[traff].sizes : [],
        traffic: traff,
        publisherId: bid.params.accountid
      });
      if (bid.schain) {
        placements.schain = bid.schain;
      }
    }
    return {
      method: 'POST',
      url: AD_URL,
      data: request
    };
  },

  interpretResponse: (serverResponse) => {
    let response = [];
    serverResponse = serverResponse.body;
    for (let i = 0; i < serverResponse.length; i++) {
      let resItem = serverResponse[i];
      if (isBidResponseValid(resItem)) {
        response.push(resItem);
      }
    }
    return response;
  },

  getUserSyncs: (syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '') => {
    let syncs = [];
    let { gdprApplies, consentString = '' } = gdprConsent;

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${URL_SYNC}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&type=iframe&us_privacy=${uspConsent}`
      });
    } else {
      syncs.push({
        type: 'image',
        url: `${URL_SYNC}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&type=image&us_privacy=${uspConsent}`
      });
    }

    return syncs
  }

};

registerBidder(spec);
