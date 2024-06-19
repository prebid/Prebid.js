import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'smartyads';
const GVLID = 534;
const adUrls = {
  US_EAST: 'https://n1.smartyads.com/?c=o&m=prebid&secret_key=prebid_js',
  EU: 'https://n2.smartyads.com/?c=o&m=prebid&secret_key=prebid_js',
  SGP: 'https://n6.smartyads.com/?c=o&m=prebid&secret_key=prebid_js'
}

const URL_SYNC = 'https://as.ck-ie.com/prebidjs?p=7c47322e527cf8bdeb7facc1bb03387a';

function isBidResponseValid(bid) {
  if (!bid) return false;

  const { requestId, cpm, creativeId, ttl, currency } = bid;

  const isValid = [requestId, cpm, creativeId, ttl, currency].every(item => !!item);
  if (!isValid) return false;

  switch (bid.mediaType) {
    case BANNER:
      return !!(bid.ad && bid.width && bid.height);
    case VIDEO:
      return !!(bid.vastUrl || bid.vastXml);
    case NATIVE:
      const native = bid.native;
      return !!(native && native.image && native.impressionTrackers);
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
    location = bidderRequest?.refererInfo ?? null;
    let placements = [];
    let request = {
      'placements': placements,
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'host': location?.domain,
      'page': location?.page,
      'language': (navigator && navigator.language) ? navigator.language : '',
      'coppa': config.getConfig('coppa') === true ? 1 : 0,
      'eeid': validBidRequests[0]?.userIdAsEids,
      'ifa': bidderRequest?.ortb2?.device?.ifa,
    };

    if (bidderRequest) {
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

  interpretResponse: (response) => {
    let result = [];
    const respData = response.body;

    respData.forEach(resp => {
      if (isBidResponseValid(resp)) response.push(resp);
    });

    return result;
  },

  getUserSyncs: (syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '', gppConsent = '') => {
    let syncs = [];
    let { gdprApplies, consentString = '' } = gdprConsent;

    const type = syncOptions.iframeEnabled ? 'iframe' : 'image';
    const url = `${URL_SYNC}&gdpr=${gdprApplies ? 1 : 0}&gdpr_consent=${consentString}&type=${type}&us_privacy=&gpp=${gppConsent}`;

    syncs.push({ type, url });

    return syncs
  },
};

registerBidder(spec);
