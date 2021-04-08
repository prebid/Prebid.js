import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'adprime';
const AD_URL = 'https://delta.adprime.com/?c=o&m=multi';
const SYNC_URL = 'https://delta.adprime.com/?c=rtb&m=sync';

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

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

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
      utils.logMessage(e);
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
      let sizes
      let identeties = {}
      if (bid.mediaTypes) {
        if (bid.mediaTypes[BANNER] && bid.mediaTypes[BANNER].sizes) {
          sizes = bid.mediaTypes[BANNER].sizes
        } else if (bid.mediaTypes[VIDEO] && bid.mediaTypes[VIDEO].playerSize) {
          sizes = bid.mediaTypes[VIDEO].playerSize
        }
      }
      if (bid.userId && bid.userId.idl_env) {
        identeties.identityLink = bid.userId.idl_env
      }

      placements.push({
        placementId: bid.params.placementId,
        bidId: bid.bidId,
        sizes: sizes || [],
        wPlayer: sizes ? sizes[0] : 0,
        hPlayer: sizes ? sizes[1] : 0,
        traffic: bid.params.traffic || BANNER,
        schain: bid.schain || {},
        keywords: bid.params.keywords || [],
        identeties
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
        response.push(resItem);
      }
    }
    return response;
  },

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    let syncUrl = SYNC_URL
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
    return [{
      type: 'image',
      url: syncUrl
    }];
  }

};

registerBidder(spec);
