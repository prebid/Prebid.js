import { _each, isEmpty, buildUrl, deepAccess, pick, logError, isPlainObject, generateUUID, deepClone } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const PREBID_VERSION = '$prebid.version$'

const BIDDER = Object.freeze({
  CODE: 'kargo',
  HOST: 'krk2.kargo.com',
  REQUEST_METHOD: 'POST',
  REQUEST_ENDPOINT: '/api/v1/prebid',
  TIMEOUT_ENDPOINT: '/api/v1/event/timeout',
  GVLID: 972,
  SUPPORTED_MEDIA_TYPES: [BANNER, VIDEO],
});

const STORAGE = getStorageManager({bidderCode: BIDDER.CODE});

const CURRENCY = Object.freeze({
  KEY: 'currency',
  US_DOLLAR: 'USD',
});

const REQUEST_KEYS = Object.freeze({
  USER_DATA: 'ortb2.user.data',
  SOCIAL_CANVAS: 'params.socialCanvas',
  SUA: 'ortb2.device.sua',
  TDID_ADAPTER: 'userId.tdid',
});

const SUA = Object.freeze({
  BROWSERS: 'browsers',
  MOBILE: 'mobile',
  MODEL: 'model',
  PLATFORM: 'platform',
  SOURCE: 'source',
});

const SUA_ATTRIBUTES = [
  SUA.BROWSERS,
  SUA.MOBILE,
  SUA.MODEL,
  SUA.SOURCE,
  SUA.PLATFORM,
];

const CERBERUS = Object.freeze({
  KEY: 'krg_crb',
  SYNC_URL: 'https://crb.kargo.com/api/v1/initsyncrnd/{UUID}?seed={SEED}&gdpr={GDPR}&gdpr_consent={GDPR_CONSENT}&us_privacy={US_PRIVACY}&gpp={GPP_STRING}&gpp_sid={GPP_SID}',
  SYNC_COUNT: 5,
  PAGE_VIEW_ID: 'pageViewId',
  PAGE_VIEW_TIMESTAMP: 'pageViewTimestamp',
  PAGE_VIEW_URL: 'pageViewUrl'
});

let sessionId,
  lastPageUrl,
  requestCounter;

function isBidRequestValid(bid) {
  if (!bid || !bid.params) {
    return false;
  }

  return !!bid.params.placementId;
}

function buildRequests(validBidRequests, bidderRequest) {
  const currencyObj = config.getConfig(CURRENCY.KEY);
  const currency = (currencyObj && currencyObj.adServerCurrency) ? currencyObj.adServerCurrency : null;
  const impressions = [];

  _each(validBidRequests, bid => {
    impressions.push(getImpression(bid))
  });

  const firstBidRequest = validBidRequests[0];
  const tdidAdapter = deepAccess(firstBidRequest, REQUEST_KEYS.TDID_ADAPTER);

  const metadata = getAllMetadata(bidderRequest);

  const krakenParams = Object.assign({}, {
    pbv: PREBID_VERSION,
    aid: firstBidRequest.auctionId,
    sid: _getSessionId(),
    url: metadata.pageURL,
    timeout: bidderRequest.timeout,
    ts: new Date().getTime(),
    device: {
      size: [
        window.screen.width,
        window.screen.height
      ]
    },
    imp: impressions,
    user: getUserIds(tdidAdapter, bidderRequest.uspConsent, bidderRequest.gdprConsent, firstBidRequest.userIdAsEids, bidderRequest.gppConsent),
    ext: getExtensions(firstBidRequest.ortb2, bidderRequest?.refererInfo)
  });

  // Add site.cat if it exists
  if (firstBidRequest.ortb2?.site?.cat !== null && firstBidRequest.ortb2?.site?.cat !== undefined) {
    krakenParams.site = { cat: firstBidRequest.ortb2.site.cat };
  }

  // Add schain - check for schain in the new location
  const schain = firstBidRequest?.ortb2?.source?.ext?.schain;
  if (schain && schain.nodes) {
    krakenParams.schain = schain
  }

  // Add user data object if available
  krakenParams.user.data = deepAccess(firstBidRequest, REQUEST_KEYS.USER_DATA) || [];

  const reqCount = getRequestCount()
  if (reqCount !== null && reqCount !== undefined) {
    krakenParams.requestCount = reqCount;
  }

  // Add currency if not USD
  if ((currency !== null && currency !== undefined) && currency !== CURRENCY.US_DOLLAR) {
    krakenParams.cur = currency;
  }

  if (metadata.rawCRB !== null && metadata.rawCRB !== undefined) {
    krakenParams.rawCRB = metadata.rawCRB
  }

  if (metadata.rawCRBLocalStorage !== null && metadata.rawCRBLocalStorage !== undefined) {
    krakenParams.rawCRBLocalStorage = metadata.rawCRBLocalStorage
  }

  // Pull Social Canvas segments and embed URL
  const socialCanvas = deepAccess(firstBidRequest, REQUEST_KEYS.SOCIAL_CANVAS);

  if (socialCanvas !== null && socialCanvas !== undefined) {
    krakenParams.socan = socialCanvas;
  }

  // User Agent Client Hints / SUA
  const uaClientHints = deepAccess(firstBidRequest, REQUEST_KEYS.SUA);
  if (uaClientHints) {
    const suaValidAttributes = []

    SUA_ATTRIBUTES.forEach(suaKey => {
      const suaValue = uaClientHints[suaKey];
      if (!suaValue) {
        return;
      }

      // Do not pass any empty strings
      if (typeof suaValue === 'string' && suaValue.trim() === '') {
        return;
      }

      switch (suaKey) {
        case SUA.MOBILE && suaValue < 1: // Do not pass 0 value for mobile
        case SUA.SOURCE && suaValue < 1: // Do not pass 0 value for source
          break;
        default:
          suaValidAttributes.push(suaKey);
      }
    });

    krakenParams.device.sua = pick(uaClientHints, suaValidAttributes);
  }

  const validPageId = getLocalStorageSafely(CERBERUS.PAGE_VIEW_ID) !== null && getLocalStorageSafely(CERBERUS.PAGE_VIEW_ID) !== undefined
  const validPageTimestamp = getLocalStorageSafely(CERBERUS.PAGE_VIEW_TIMESTAMP) !== null && getLocalStorageSafely(CERBERUS.PAGE_VIEW_TIMESTAMP) !== undefined
  const validPageUrl = getLocalStorageSafely(CERBERUS.PAGE_VIEW_URL) !== null && getLocalStorageSafely(CERBERUS.PAGE_VIEW_URL) !== undefined

  const page = {}
  if (validPageId) {
    // TODO: consider using the Prebid-generated page view ID instead of generating a custom one
    page.id = getLocalStorageSafely(CERBERUS.PAGE_VIEW_ID);
  }
  if (validPageTimestamp) {
    page.timestamp = Number(getLocalStorageSafely(CERBERUS.PAGE_VIEW_TIMESTAMP));
  }
  if (validPageUrl) {
    page.url = getLocalStorageSafely(CERBERUS.PAGE_VIEW_URL);
  }
  if (!isEmpty(page)) {
    krakenParams.page = page;
  }

  if (krakenParams.ext && Object.keys(krakenParams.ext).length === 0) {
    delete krakenParams.ext;
  }

  return Object.assign({}, bidderRequest, {
    method: BIDDER.REQUEST_METHOD,
    url: `https://${BIDDER.HOST}${BIDDER.REQUEST_ENDPOINT}`,
    data: krakenParams,
    currency: currency
  });
}

function interpretResponse(response, bidRequest) {
  const bids = response.body;
  const fledgeAuctionConfigs = [];
  const bidResponses = [];

  if (isEmpty(bids) || typeof bids !== 'object') {
    return bidResponses;
  }

  for (const [bidID, adUnit] of Object.entries(bids)) {
    const meta = {
      mediaType: adUnit.mediaType && BIDDER.SUPPORTED_MEDIA_TYPES.includes(adUnit.mediaType) ? adUnit.mediaType : BANNER
    };

    if (adUnit.metadata?.landingPageDomain) {
      meta.clickUrl = adUnit.metadata.landingPageDomain[0];
      meta.advertiserDomains = adUnit.metadata.landingPageDomain;
    }

    const bidResponse = {
      requestId: bidID,
      cpm: Number(adUnit.cpm),
      width: adUnit.width,
      height: adUnit.height,
      ttl: 300,
      creativeId: adUnit.creativeID,
      dealId: adUnit.targetingCustom,
      netRevenue: true,
      currency: adUnit.currency || bidRequest.currency,
      mediaType: meta.mediaType,
      meta: meta
    };

    if (meta.mediaType === VIDEO) {
      if (adUnit.admUrl) {
        bidResponse.vastUrl = adUnit.admUrl;
      } else {
        bidResponse.vastXml = adUnit.adm;
      }
    } else {
      bidResponse.ad = adUnit.adm;
    }

    bidResponses.push(bidResponse);

    if (adUnit.auctionConfig) {
      fledgeAuctionConfigs.push({
        bidId: bidID,
        config: adUnit.auctionConfig
      })
    }
  }

  if (fledgeAuctionConfigs.length > 0) {
    return {
      bids: bidResponses,
      paapi: fledgeAuctionConfigs
    }
  } else {
    return bidResponses;
  }
}

function getUserSyncs(syncOptions, _, gdprConsent, usPrivacy, gppConsent) {
  const syncs = [];
  const seed = generateUUID();
  const clientId = getClientId();

  var gdpr = (gdprConsent && gdprConsent.gdprApplies) ? 1 : 0;
  var gdprConsentString = (gdprConsent && gdprConsent.consentString) ? gdprConsent.consentString : '';

  var gppString = (gppConsent && gppConsent.consentString) ? gppConsent.consentString : '';
  var gppApplicableSections = (gppConsent && gppConsent.applicableSections && Array.isArray(gppConsent.applicableSections)) ? gppConsent.applicableSections.join(',') : '';

  // don't sync if opted out via usPrivacy
  if (typeof usPrivacy === 'string' && usPrivacy.length === 4 && usPrivacy[0] === '1' && usPrivacy[2] === 'Y') {
    return syncs;
  }
  if (syncOptions.iframeEnabled && seed && clientId) {
    syncs.push({
      type: 'iframe',
      url: CERBERUS.SYNC_URL.replace('{UUID}', clientId)
        .replace('{SEED}', seed)
        .replace('{GDPR}', gdpr)
        .replace('{GDPR_CONSENT}', gdprConsentString)
        .replace('{US_PRIVACY}', usPrivacy || '')
        .replace('{GPP_STRING}', gppString)
        .replace('{GPP_SID}', gppApplicableSections)
    })
  }
  return syncs;
}

function onTimeout(timeoutData) {
  if (timeoutData === null || timeoutData === undefined) {
    return;
  }

  timeoutData.forEach((bid) => {
    sendTimeoutData(bid.auctionId, bid.timeout);
  });
}

function getExtensions(ortb2, refererInfo) {
  const ext = {};

  if (ortb2) {
    ext.ortb2 = deepClone(ortb2);

    if (ext.ortb2.user && ext.ortb2.user.ext) {
      delete ext.ortb2.user.ext.eids;
    }
  }

  if (refererInfo) {
    ext.refererInfo = refererInfo;
  }

  return ext;
}

function _getCrb() {
  const localStorageCrb = getCrbFromLocalStorage();
  if (Object.keys(localStorageCrb).length) {
    return localStorageCrb;
  }
  return getCrbFromCookie();
}

function _getSessionId() {
  if (!sessionId) {
    sessionId = generateUUID();
  }
  return sessionId;
}

function getCrbFromCookie() {
  try {
    const crb = JSON.parse(STORAGE.getCookie(CERBERUS.KEY));
    if (crb && crb.v) {
      const vParsed = JSON.parse(atob(crb.v));
      if (vParsed) {
        return vParsed;
      }
    }
    return {};
  } catch (e) {
    return {};
  }
}

function getCrbFromLocalStorage() {
  try {
    return JSON.parse(atob(getLocalStorageSafely(CERBERUS.KEY)));
  } catch (e) {
    return {};
  }
}

function getLocalStorageSafely(key) {
  try {
    return STORAGE.getDataFromLocalStorage(key);
  } catch (e) {
    return null;
  }
}

function getUserIds(tdidAdapter, usp, gdpr, eids, gpp) {
  const crb = spec._getCrb();
  const userIds = {
    crbIDs: crb.syncIds || {}
  };

  // Pull Trade Desk ID
  if (!tdidAdapter && crb.tdID) {
    userIds.tdID = crb.tdID;
  } else if (tdidAdapter) {
    userIds.tdID = tdidAdapter;
  }

  // USP
  if (usp) {
    userIds.usp = usp;
  }

  // GDPR
  if (gdpr) {
    userIds.gdpr = {
      consent: gdpr.consentString || '',
      applies: !!gdpr.gdprApplies,
    };
  }

  // Kargo ID
  if (crb.lexId !== null && crb.lexId !== undefined) {
    userIds.kargoID = crb.lexId;
  }

  // Client ID
  if (crb.clientId !== null && crb.clientId !== undefined) {
    userIds.clientID = crb.clientId;
  }

  // Opt Out
  if (crb.optOut !== null && crb.optOut !== undefined) {
    userIds.optOut = crb.optOut;
  }

  // User ID Sub-Modules (userIdAsEids)
  if (eids !== null && eids !== undefined) {
    userIds.sharedIDEids = eids;
  }

  // GPP
  if (gpp) {
    const parsedGPP = {};
    if (gpp.consentString) {
      parsedGPP.gppString = gpp.consentString;
    }
    if (gpp.applicableSections) {
      parsedGPP.applicableSections = gpp.applicableSections;
    }
    if (!isEmpty(parsedGPP)) {
      userIds.gpp = parsedGPP;
    }
  }

  return userIds;
}

function getClientId() {
  const crb = spec._getCrb();
  return crb.clientId;
}

function getAllMetadata(bidderRequest) {
  return {
    pageURL: bidderRequest?.refererInfo?.page,
    rawCRB: STORAGE.getCookie(CERBERUS.KEY),
    rawCRBLocalStorage: getLocalStorageSafely(CERBERUS.KEY)
  };
}

function getRequestCount() {
  if (lastPageUrl === window.location.pathname) {
    return ++requestCounter;
  }
  lastPageUrl = window.location.pathname;
  requestCounter = 0;
  return requestCounter;
}

function sendTimeoutData(auctionId, auctionTimeout) {
  const params = { aid: auctionId, ato: auctionTimeout };
  const timeoutRequestUrl = buildUrl({
    protocol: 'https',
    hostname: BIDDER.HOST,
    pathname: BIDDER.TIMEOUT_ENDPOINT,
    search: params,
  });

  fetch(timeoutRequestUrl, {
    method: 'GET',
    keepalive: true,
  }).catch((e) => {
    logError('Kargo: sendTimeoutData/fetch threw an error: ', e);
  });
}

function getImpression(bid) {
  const imp = {
    id: bid.bidId,
    tid: bid.ortb2Imp?.ext?.tid,
    pid: bid.params.placementId,
    code: bid.adUnitCode
  };

  if (bid.bidRequestsCount > 0) {
    imp.bidRequestCount = bid.bidRequestsCount;
  }

  if (bid.bidderRequestsCount > 0) {
    imp.bidderRequestCount = bid.bidderRequestsCount;
  }

  if (bid.bidderWinsCount > 0) {
    imp.bidderWinCount = bid.bidderWinsCount;
  }

  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid');
  if (gpid) {
    imp.fpd = {
      gpid: gpid
    }
  }

  // Add full ortb2Imp object as backup
  if (bid.ortb2Imp) {
    imp.ext = { ortb2Imp: bid.ortb2Imp };
  }

  if (bid.mediaTypes) {
    const { banner, video, native } = bid.mediaTypes;

    if (banner) {
      imp.banner = banner;
    }

    if (video) {
      imp.video = video;
    }

    if (native) {
      imp.native = native;
    }

    if (typeof bid.getFloor === 'function') {
      let floorInfo;
      try {
        floorInfo = bid.getFloor({
          currency: 'USD',
          mediaType: '*',
          size: '*'
        });
      } catch (e) {
        logError('Kargo: getFloor threw an error: ', e);
      }
      imp.floor = isPlainObject(floorInfo) && floorInfo.currency === 'USD' && !isNaN(parseInt(floorInfo.floor)) ? floorInfo.floor : undefined;
    }
  }

  return imp
}

export const spec = {
  gvlid: BIDDER.GVLID,
  code: BIDDER.CODE,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  supportedMediaTypes: BIDDER.SUPPORTED_MEDIA_TYPES,
  onTimeout,
  _getCrb,
  _getSessionId
};

registerBidder(spec);
