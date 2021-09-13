import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import {VIDEO} from '../src/mediaTypes.js';
import {INSTREAM} from '../src/video.js';

const BIDDER_CODE = 'kargo';
const HOST = 'https://krk.kargo.com';
const SYNC = 'https://crb.kargo.com/api/v1/initsyncrnd/{UUID}?seed={SEED}&idx={INDEX}&gdpr={GDPR}&gdpr_consent={GDPR_CONSENT}&us_privacy={US_PRIVACY}';
const SYNC_COUNT = 5;
const GVLID = 972;
const storage = getStorageManager(GVLID, BIDDER_CODE);
const VIDEO_OPENRTB_PARAMS = [
  'mimes',
  'minduration',
  'maxduration',
  'placement',
  'protocols',
  'startdelay',
  'skip',
  'skipafter',
  'delivery',
  'playbackmethod',
  'api',
  'linearity'
];

let sessionId,
  lastPageUrl,
  requestCounter;

export const spec = {
  gvlid: GVLID,
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (!bid || !bid.params) {
      return false;
    }
    return !!bid.params.placementId && _validateVideo(bid);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const currencyObj = config.getConfig('currency');
    const currency = (currencyObj && currencyObj.adServerCurrency) || 'USD';
    const bidIds = {};
    const bidSizes = {};
    utils._each(validBidRequests, bid => {
      // should there be scope for video params addition here?
      // video params must be included in the validBidRequests bid?
      bidIds[bid.bidId] = bid.params.placementId;
      bidSizes[bid.bidId] = bid.sizes;
    });
    let tdid;
    if (validBidRequests.length > 0 && validBidRequests[0].userId && validBidRequests[0].userId.tdid) {
      tdid = validBidRequests[0].userId.tdid;
    }
    if (utils.deepAccess(bidRequest, 'mediaTypes.video')) {
      validBidRequests[0].video = _buildVideoORTB(bidRequest);
    }
    const transformedParams = Object.assign({}, {
      sessionId: spec._getSessionId(),
      requestCount: spec._getRequestCount(),
      timeout: bidderRequest.timeout,
      currency: currency,
      cpmGranularity: 1,
      timestamp: (new Date()).getTime(),
      cpmRange: {
        floor: 0,
        ceil: 20
      },
      bidIDs: bidIds,
      bidSizes: bidSizes,
      prebidRawBidRequests: validBidRequests
    }, spec._getAllMetadata(tdid, bidderRequest.uspConsent, bidderRequest.gdprConsent));
    const encodedParams = encodeURIComponent(JSON.stringify(transformedParams));
    return Object.assign({}, bidderRequest, {
      method: 'GET',
      url: `${HOST}/api/v2/bid`,
      data: `json=${encodedParams}`,
      currency: currency
    });
  },
  interpretResponse: function(response, bidRequest) {
    let bids = response.body;
    const bidResponses = [];
    for (let bidId in bids) {
      let adUnit = bids[bidId];
      let meta;
      if (adUnit.metadata && adUnit.metadata.landingPageDomain) {
        meta = {
          clickUrl: adUnit.metadata.landingPageDomain,
          advertiserDomains: [adUnit.metadata.landingPageDomain]
        };
      }
      bidResponses.push({
        requestId: bidId,
        cpm: Number(adUnit.cpm),
        width: adUnit.width,
        height: adUnit.height,
        ad: adUnit.adm,
        ttl: 300,
        creativeId: adUnit.id,
        dealId: adUnit.targetingCustom,
        netRevenue: true,
        currency: bidRequest.currency,
        meta: meta
      });
    }
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, responses, gdprConsent, usPrivacy) {
    const syncs = [];
    const seed = spec._generateRandomUuid();
    const clientId = spec._getClientId();
    var gdpr = (gdprConsent && gdprConsent.gdprApplies) ? 1 : 0;
    var gdprConsentString = (gdprConsent && gdprConsent.consentString) ? gdprConsent.consentString : '';
    // don't sync if opted out via usPrivacy
    if (typeof usPrivacy == 'string' && usPrivacy.length == 4 && usPrivacy[0] == 1 && usPrivacy[2] == 'Y') {
      return syncs;
    }
    if (syncOptions.iframeEnabled && seed && clientId) {
      for (let i = 0; i < SYNC_COUNT; i++) {
        syncs.push({
          type: 'iframe',
          url: SYNC.replace('{UUID}', clientId).replace('{SEED}', seed)
            .replace('{INDEX}', i)
            .replace('{GDPR}', gdpr)
            .replace('{GDPR_CONSENT}', gdprConsentString)
            .replace('{US_PRIVACY}', usPrivacy || '')
        });
      }
    }
    return syncs;
  },

  // PRIVATE
  _readCookie(name) {
    if (!storage.cookiesAreEnabled()) {
      return null;
    }
    let nameEquals = `${name}=`;
    let cookies = document.cookie.split(';');

    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1, cookie.length);
      }

      if (cookie.indexOf(nameEquals) === 0) {
        return cookie.substring(nameEquals.length, cookie.length);
      }
    }

    return null;
  },

  _getCrbFromCookie() {
    try {
      const crb = JSON.parse(decodeURIComponent(spec._readCookie('krg_crb')));
      if (crb && crb.v) {
        let vParsed = JSON.parse(atob(crb.v));
        if (vParsed) {
          return vParsed;
        }
      }
      return {};
    } catch (e) {
      return {};
    }
  },

  _getCrbFromLocalStorage() {
    try {
      return JSON.parse(atob(spec._getLocalStorageSafely('krg_crb')));
    } catch (e) {
      return {};
    }
  },

  _getCrb() {
    let localStorageCrb = spec._getCrbFromLocalStorage();
    if (Object.keys(localStorageCrb).length) {
      return localStorageCrb;
    }
    return spec._getCrbFromCookie();
  },

  _getKruxUserId() {
    return spec._getLocalStorageSafely('kxkar_user');
  },

  _getKruxSegments() {
    return spec._getLocalStorageSafely('kxkar_segs');
  },

  _getKrux() {
    const segmentsStr = spec._getKruxSegments();
    let segments = [];

    if (segmentsStr) {
      segments = segmentsStr.split(',');
    }

    return {
      userID: spec._getKruxUserId(),
      segments: segments
    };
  },

  _getLocalStorageSafely(key) {
    try {
      return storage.getDataFromLocalStorage(key);
    } catch (e) {
      return null;
    }
  },

  _getUserIds(tdid, usp, gdpr) {
    const crb = spec._getCrb();
    const userIds = {
      kargoID: crb.userId,
      clientID: crb.clientId,
      crbIDs: crb.syncIds || {},
      optOut: crb.optOut,
      usp: usp
    };

    try {
      if (gdpr) {
        userIds['gdpr'] = {
          consent: gdpr.consentString || '',
          applies: !!gdpr.gdprApplies,
        }
      }
    } catch (e) {
    }
    if (tdid) {
      userIds.tdID = tdid;
    }
    return userIds;
  },

  _getClientId() {
    const crb = spec._getCrb();
    return crb.clientId;
  },

  _getAllMetadata(tdid, usp, gdpr) {
    return {
      userIDs: spec._getUserIds(tdid, usp, gdpr),
      krux: spec._getKrux(),
      pageURL: window.location.href,
      rawCRB: spec._readCookie('krg_crb'),
      rawCRBLocalStorage: spec._getLocalStorageSafely('krg_crb')
    };
  },

  _getSessionId() {
    if (!sessionId) {
      sessionId = spec._generateRandomUuid();
    }
    return sessionId;
  },

  _getRequestCount() {
    if (lastPageUrl === window.location.pathname) {
      return ++requestCounter;
    }
    lastPageUrl = window.location.pathname;
    return requestCounter = 0;
  },

  _generateRandomUuid() {
    try {
      // crypto.getRandomValues is supported everywhere but Opera Mini for years
      var buffer = new Uint8Array(16);
      crypto.getRandomValues(buffer);
      buffer[6] = (buffer[6] & ~176) | 64;
      buffer[8] = (buffer[8] & ~64) | 128;
      var hex = Array.prototype.map.call(new Uint8Array(buffer), function(x) {
        return ('00' + x.toString(16)).slice(-2);
      }).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    } catch (e) {
      return '';
    }
  },

  _validateVideo(bid) {
      if (!bid.params) {
        return false;
      }
      const videoAdUnit = utils.deepAccess(bid, `mediaTypes.${VIDEO}`, {});
      const videoParams = {
        ...videoAdUnit
      };

      if (videoParams.context !== 'instream') {
        utils.logError('failed validation: only context instream is supported ');
        return false;
      }
    
      if (typeof videoParams.playerSize === 'undefined' || !Array.isArray(videoParams.playerSize) || !Array.isArray(videoParams.playerSize[0])) {
        utils.logError('failed validation: player size not declared or is not in format [[w,h]]');
        return false;
      }

      if (!Array.isArray(videoParams.mimes) || videoParams.mimes.length === 0) {
        return false;
      }
    
      if (!Array.isArray(videoParams.protocols) || videoParams.protocols.length === 0) {
        return false;
      }

      return true;
    },
    _buildVideoORTB(bidRequest) {
      const videoAdUnit = utils.deepAccess(bidRequest, 'mediaTypes.video', {});
      const videoBidderParams = utils.deepAccess(bidRequest, 'params.video', {});
    
      const videoParams = {
        ...videoAdUnit,
        ...videoBidderParams // Bidder Specific overrides
      };
    
      const video = {}
    
      const {w, h} = _getSize(videoParams.playerSize[0]);
      video.w = w;
      video.h = h;

      VIDEO_OPENRTB_PARAMS.forEach((param) => {
        if (videoParams.hasOwnProperty(param)) {
          video[param] = videoParams[param];
        }
      });

      video.placement = video.placement || 2;

      video.startdelay = video.startdelay || 0;
      video.context = INSTREAM;

      return video
    }
}
registerBidder(spec);
