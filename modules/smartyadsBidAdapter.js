import { logMessage } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { ajax } from '../src/ajax.js';

const BIDDER_CODE = 'smartyads';
const GVLID = 534;
const adUrls = {
  US_EAST: 'https://n1.smartyads.com/?c=o&m=prebid&secret_key=prebid_js',
  EU: 'https://n2.smartyads.com/?c=o&m=prebid&secret_key=prebid_js',
  SGP: 'https://n6.smartyads.com/?c=o&m=prebid&secret_key=prebid_js'
}

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
      return Boolean(bid.vastUrl) || Boolean(bid.vastXml);
    case NATIVE:
      return Boolean(bid.native && bid.native.title && bid.native.image && bid.native.impressionTrackers);
    default:
      return false;
  }
}

function getAdUrlByRegion(bid) {
  let adUrl;

  if (bid.params.region && adUrls[bid.params.region]) {
    adUrl = adUrls[bid.params.region];
  } else {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const region = timezone.split('/')[0];

      switch (region) {
        case 'Europe':
          adUrl = adUrls['EU'];
          break;
        case 'Asia':
          adUrl = adUrls['SGP'];
          break;
        default: adUrl = adUrls['US_EAST'];
      }
    } catch (err) {
      adUrl = adUrls['US_EAST'];
    }
  }

  return adUrl;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.sourceid) && !isNaN(bid.params.accountid) && bid.params.host == 'prebid');
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

    let placements = [];
    let request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language : '',
      'secure': 1,
      'host': location.host,
      'page': location.pathname,
      'coppa': config.getConfig('coppa') === true ? 1 : 0,
      'placements': placements,
      'eeid': validBidRequests[0]?.userIdAsEids,
      'ifa': bidderRequest?.ortb2?.device?.ifa,
    };
    request.language.indexOf('-') != -1 && (request.language = request.language.split('-')[0])
    if (bidderRequest) {
      if (bidderRequest.uspConsent) {
        request.ccpa = bidderRequest.uspConsent;
      }
      if (bidderRequest.gdprConsent) {
        request.gdpr = bidderRequest.gdprConsent
      }
      if (bidderRequest.gppConsent) {
        request.gpp = bidderRequest.gppConsent;
      }
    }
    const len = validBidRequests.length;

    let adUrl;

    for (let i = 0; i < len; i++) {
      let bid = validBidRequests[i];

      if (i === 0) adUrl = getAdUrlByRegion(bid);

      let traff = bid.params.traffic || BANNER;
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
      url: adUrl,
      data: request
    }
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

  getUserSyncs: (syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '', gppConsent = '') => {
    let syncs = [];
    let { gdprApplies, consentString = '' } = gdprConsent;

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${URL_SYNC}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&type=iframe&us_privacy=${uspConsent}&gpp=${gppConsent}`
      });
    } else {
      syncs.push({
        type: 'image',
        url: `${URL_SYNC}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&type=image&us_privacy=${uspConsent}&gpp=${gppConsent}`
      });
    }

    return syncs
  },

  onBidWon: function(bid) {
    if (bid.winUrl) {
      ajax(bid.winUrl, () => {}, JSON.stringify(bid));
    } else {
      if (bid?.postData && bid?.postData[0] && bid?.postData[0].params && bid?.postData[0].params[0].host == 'prebid') {
        ajax('https://et-nd43.itdsmr.com/?c=o&m=prebid&secret_key=prebid_js&winTest=1', () => {}, JSON.stringify(bid));
      }
    }
  },

  onTimeout: function(bid) {
    if (bid?.postData && bid?.postData[0] && bid?.postData[0].params && bid?.postData[0].params[0].host == 'prebid') {
      ajax('https://et-nd43.itdsmr.com/?c=o&m=prebid&secret_key=prebid_js&bidTimeout=1', () => {}, JSON.stringify(bid));
    }
  },

  onBidderError: function(bid) {
    if (bid?.postData && bid?.postData[0] && bid?.postData[0].params && bid?.postData[0].params[0].host == 'prebid') {
      ajax('https://et-nd43.itdsmr.com/?c=o&m=prebid&secret_key=prebid_js&bidderError=1', () => {}, JSON.stringify(bid));
    }
  },

};

registerBidder(spec);
