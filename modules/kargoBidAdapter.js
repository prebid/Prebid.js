import { _each, buildUrl, deepAccess, pick, triggerPixel } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'kargo';
const HOST = 'https://krk2.kargo.com';
const SYNC = 'https://crb.kargo.com/api/v1/initsyncrnd/{UUID}?seed={SEED}&idx={INDEX}&gdpr={GDPR}&gdpr_consent={GDPR_CONSENT}&us_privacy={US_PRIVACY}';
const SYNC_COUNT = 5;
const GVLID = 972;
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO];
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
    const currency = (currencyObj && currencyObj.adServerCurrency) ? currencyObj.adServerCurrency : null;
    const impressions = [];

    _each(validBidRequests, bid => {
      impressions.push(spec.getImpression(bid))
    });

    const firstBidRequest = validBidRequests[0];

    const tdid = deepAccess(firstBidRequest, 'userId.tdid')

    const krakenParams = Object.assign({}, {
      pbv: '$prebid.version$',
      aid: firstBidRequest.auctionId,
      sid: spec._getSessionId(),
      url: spec._getAllMetadata(bidderRequest).pageURL,
      timeout: bidderRequest.timeout,
      ts: new Date().getTime(),
      device: {
        size: [
          window.screen.width,
          window.screen.height
        ]
      },
      imp: impressions,
      user: spec._getUserIds(tdid, bidderRequest.uspConsent, bidderRequest.gdprConsent),
      eids: firstBidRequest.userIdAsEids
    });

    const reqCount = spec._getRequestCount()
    if (reqCount != null && reqCount > 0) {
      krakenParams.requestCount = reqCount
    }

    if (currency != null && currency != 'USD') {
      krakenParams.cur = currency
    }

    // Pull Social Canvas segments and embed URL
    const socialCanvas = deepAccess(firstBidRequest, 'params.socialCanvas');

    if (socialCanvas != null) {
      krakenParams.socan = socialCanvas
    }

    // User Agent Client Hints / SUA
    const uaClientHints = deepAccess(firstBidRequest, 'ortb2.device.sua');
    if (uaClientHints) {
      const suaAttributes = ['browsers', 'platform', 'mobile', 'model', 'source']
      let suaValidAttributes = []

      suaAttributes.forEach(attributeKey => {
        var attributeValue = uaClientHints[attributeKey]
        if (attributeValue != null) {
          if (((attributeKey == 'mobile' || attributeKey == 'source') && attributeValue < 1) ||
            (attributeKey == 'model' && attributeValue.trim() == '')) {
            return
          }
          suaValidAttributes.push(attributeKey)
        }
      })

      krakenParams.device.sua = pick(uaClientHints, suaValidAttributes);
    }

    const validPageId = spec._getLocalStorageSafely('pageViewId') != null 
    const validPageTimestamp = spec._getLocalStorageSafely('pageViewTimestamp') != null
    const validPageUrl = spec._getLocalStorageSafely('pageViewUrl') != null
 
    if(validPageId || validPageTimestamp || validPageUrl) {
      const page = {}
      if(validPageId) {
        page.id = spec._getLocalStorageSafely('pageViewId')
      }

      if(validPageTimestamp) {
        page.timestamp = spec._getLocalStorageSafely('pageViewTimestamp')
      }

      if(validPageUrl) {
        page.url = spec._getLocalStorageSafely('pageViewUrl')
      }
     
      krakenParams.page = page
    }

    return Object.assign({}, bidderRequest, {
      method: 'POST',
      url: `${HOST}/api/v1/prebid`,
      data: krakenParams,
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
        ad: adUnit.adm,
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

  _getCrbFromCookie() {
    try {
      const crb = JSON.parse(storage.getCookie('krg_crb'));
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
      crbIDs: crb.syncIds || {}
    };

    if (tdid) {
      userIds.tdID = tdid;
    }

    if(usp) {
      userIds.usp = usp
    }

    try {
      if (gdpr) {
        userIds['gdpr'] = {
          consent: gdpr.consentString || '',
          applies: !!gdpr.gdprApplies,
        }
      }
    } catch (e) {
    }
    
    if(crb.lexId != null) {
      userIds.kargoID = crb.lexId
    }

    if(crb.clientId !=  null) {
      userIds.clientID = crb.clientId
    }

    if(crb.optOut != null) {
      userIds.optOut = crb.optOut
    }

    return userIds;
  },

  _getClientId() {
    const crb = spec._getCrb();
    return crb.clientId;
  },

  _getAllMetadata(bidderRequest) {
    return {
      pageURL: bidderRequest?.refererInfo?.page,
      rawCRB: storage.getCookie('krg_crb'),
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
  },

  getImpression(bid) {
    const imp = {
      id: bid.bidId,
      tid: bid.transactionId,
      pid: bid.params.placementId,
      code: bid.adUnitCode
    }

    if (bid.floor > 0) {
      imp.floor = bid.floor
    }

    if (bid.bidRequestsCount > 0) {
      imp.bidRequestCount = bid.bidRequestsCount
    }

    if (bid.bidderRequestsCount > 0) {
      imp.bidderRequestCount = bid.bidderRequestsCount
    }

    if (bid.bidderWinsCount > 0) {
      imp.bidderWinCount = bid.bidderWinsCount
    }

    const gpid = spec.getGPID(bid)
    if (gpid != null && gpid != '') {
      imp.fpd = {
        gpid: gpid
      }
    }

    if(bid.mediaTypes != null) {
      if (bid.mediaTypes.banner != null) {
        imp.banner = bid.mediaTypes.banner
      }

      if (bid.mediaTypes.video != null) {
        imp.video = bid.mediaTypes.video
      }

      if (bid.mediaTypes.native != null) {
        imp.native = bid.mediaTypes.native
      }
    }

    return imp
  },

  getGPID(bid) {
    if (bid.ortb2Imp != null) {
      if (bid.ortb2Imp.gpid != null & bid.ortb2Imp.gpid != '') {
        return bid.ortb2Imp.gpid
      }

      if (bid.ortb2Imp.ext != null && bid.ortb2Imp.ext.data != null) {
        if (bid.ortb2Imp.ext.data.pbAdSlot != null && bid.ortb2Imp.ext.data.pbAdSlot != '') {
          return bid.ortb2Imp.ext.data.pbAdSlot
        }

        if (bid.ortb2Imp.ext.data.pbAdSlot != null && bid.ortb2Imp.ext.data.pbAdSlot != '') {
          return bid.ortb2Imp.ext.data.pbAdSlot
        }

        if (bid.ortb2Imp.ext.data.adServer.adSlot != null && bid.ortb2Imp.ext.data.adServer.adSlot != '') {
          return bid.ortb2Imp.ext.data.adServer.adSlot
        }
      }
    }

    if (bid.adUnitCode != null && bid.adUnitCode != '') {
      return bid.adUnitCode
    }
    return ''
  }

};

registerBidder(spec);
