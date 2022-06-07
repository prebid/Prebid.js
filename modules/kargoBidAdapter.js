import { _each, buildUrl, triggerPixel } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'kargo';
const HOST = 'https://krk.kargo.com';
const SYNC = 'https://crb.kargo.com/api/v1/initsyncrnd/{UUID}?seed={SEED}&idx={INDEX}&gdpr={GDPR}&gdpr_consent={GDPR_CONSENT}&us_privacy={US_PRIVACY}';
const SYNC_COUNT = 5;
const GVLID = 972;
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO]
const storage = getStorageManager({gvlid: GVLID, bidderCode: BIDDER_CODE});

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

    return !!bid.params.placementId;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const currencyObj = config.getConfig('currency');
    const currency = (currencyObj && currencyObj.adServerCurrency) || 'USD';
    const bidIDs = {};
    const bidSizes = {};

    _each(validBidRequests, bid => {
      bidIDs[bid.bidId] = bid.params.placementId;
      bidSizes[bid.bidId] = bid.sizes;
    });

    let tdid;
    if (validBidRequests.length > 0 && validBidRequests[0].userId && validBidRequests[0].userId.tdid) {
      tdid = validBidRequests[0].userId.tdid;
    }

    const transformedParams = Object.assign({}, {
      sessionId: spec._getSessionId(),
      requestCount: spec._getRequestCount(),
      timeout: bidderRequest.timeout,
      currency,
      cpmGranularity: 1,
      timestamp: (new Date()).getTime(),
      cpmRange: {
        floor: 0,
        ceil: 20
      },
      bidIDs,
      bidSizes,
      device: {
        width: window.screen.width,
        height: window.screen.height
      },
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
      let meta = {
        mediaType: BANNER
      };

      if (adUnit.metadata && adUnit.metadata.landingPageDomain) {
        meta.clickUrl = adUnit.metadata.landingPageDomain[0];
        meta.advertiserDomains = adUnit.metadata.landingPageDomain;
      }

      if (adUnit.mediaType && SUPPORTED_MEDIA_TYPES.includes(adUnit.mediaType)) {
        meta.mediaType = adUnit.mediaType;
      }

      const bidResponse = {
        requestId: bidId,
        cpm: Number(adUnit.cpm),
        width: adUnit.width,
        height: adUnit.height,
        ttl: 300,
        creativeId: adUnit.id,
        dealId: adUnit.targetingCustom,
        netRevenue: true,
        currency: adUnit.currency || bidRequest.currency,
        mediaType: meta.mediaType,
        meta: meta
      };

      if (meta.mediaType == VIDEO) {
        bidResponse.vastXml = adUnit.adm;
      } else {
        bidResponse.ad = adUnit.adm;
      }

      bidResponses.push(bidResponse);
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
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  onTimeout: function(timeoutData) {
    if (timeoutData == null) {
      return;
    }

    timeoutData.forEach((bid) => {
      this._sendTimeoutData(bid.auctionId, bid.timeout);
    });
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
      kargoID: crb.lexId,
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

  _sendTimeoutData(auctionId, auctionTimeout) {
    let params = {
      aid: auctionId,
      ato: auctionTimeout,
    };

    try {
      let timeoutRequestUrl = buildUrl({
        protocol: 'https',
        hostname: 'krk.kargo.com',
        pathname: '/api/v1/event/timeout',
        search: params
      });

      triggerPixel(timeoutRequestUrl);
    } catch (e) {}
  }
};
registerBidder(spec);
