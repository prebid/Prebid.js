import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {deepAccess, isArray, isFn, isPlainObject, inIframe, getDNT, generateUUID} from '../src/utils.js';
import {hasPurpose1Consent} from '../src/utils/gpdr.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {getStorageManager} from '../src/storageManager.js';

const BIDDER_CODE = 'snigel';
const GVLID = 1076;
const DEFAULT_URL = 'https://adserv.snigelweb.com/bp/v1/prebid';
const DEFAULT_TTL = 60;
const DEFAULT_CURRENCIES = ['USD'];
const FLOOR_MATCH_ALL_SIZES = '*';
const SESSION_ID_KEY = '_sn_session_pba';

const getConfig = config.getConfig;
const storageManager = getStorageManager({bidderCode: BIDDER_CODE});
const refreshes = {};
const pageViewId = generateUUID();
const pageViewStart = new Date().getTime();
let auctionCounter = 0;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bidRequest) {
    return !!bidRequest.params.placement;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const gdprApplies = deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
    return {
      method: 'POST',
      url: getEndpoint(),
      data: JSON.stringify({
        id: bidderRequest.auctionId,
        accountId: deepAccess(bidRequests, '0.params.accountId'),
        site: deepAccess(bidRequests, '0.params.site'),
        sessionId: getSessionId(),
        counter: auctionCounter++,
        pageViewId: pageViewId,
        pageViewStart: pageViewStart,
        gdprConsent: gdprApplies === true ? hasFullGdprConsent(deepAccess(bidderRequest, 'gdprConsent')) : false,
        cur: getCurrencies(),
        test: getTestFlag(),
        version: getGlobal().version,
        gpp: deepAccess(bidderRequest, 'gppConsent.gppString') || deepAccess(bidderRequest, 'ortb2.regs.gpp'),
        gpp_sid:
          deepAccess(bidderRequest, 'gppConsent.applicableSections') || deepAccess(bidderRequest, 'ortb2.regs.gpp_sid'),
        gdprApplies: gdprApplies,
        gdprConsentString: gdprApplies === true ? deepAccess(bidderRequest, 'gdprConsent.consentString') : undefined,
        gdprConsentProv: gdprApplies === true ? deepAccess(bidderRequest, 'gdprConsent.addtlConsent') : undefined,
        uspConsent: deepAccess(bidderRequest, 'uspConsent'),
        coppa: getConfig('coppa'),
        eids: deepAccess(bidRequests, '0.userIdAsEids'),
        schain: deepAccess(bidRequests, '0.schain'),
        page: getPage(bidderRequest),
        topframe: inIframe() === true ? 0 : 1,
        device: {
          w: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
          h: window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight,
          dnt: getDNT() ? 1 : 0,
          language: getLanguage(),
        },
        placements: bidRequests.map((r) => {
          return {
            id: r.adUnitCode,
            tid: r.transactionId,
            gpid: deepAccess(r, 'ortb2Imp.ext.gpid'),
            pbadslot: deepAccess(r, 'ortb2Imp.ext.data.pbadslot') || deepAccess(r, 'ortb2Imp.ext.gpid'),
            name: r.params.placement,
            sizes: r.sizes,
            floor: getPriceFloor(r, BANNER, FLOOR_MATCH_ALL_SIZES),
            refresh: getRefreshInformation(r.adUnitCode),
            params: r.params.additionalParams,
          };
        }),
      }),
      bidderRequest,
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse.body || !serverResponse.body.bids) {
      return [];
    }

    return serverResponse.body.bids.map((bid) => {
      return {
        requestId: mapIdToRequestId(bid.id, bidRequest),
        cpm: bid.price,
        creativeId: bid.crid,
        currency: serverResponse.body.cur,
        width: bid.width,
        height: bid.height,
        ad: bid.ad,
        netRevenue: true,
        ttl: bid.ttl || DEFAULT_TTL,
        meta: bid.meta,
      };
    });
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    const syncUrl = getSyncUrl(responses || []);
    if (syncUrl && syncOptions.iframeEnabled && hasSyncConsent(gdprConsent, uspConsent, gppConsent)) {
      return [{type: 'iframe', url: getSyncEndpoint(syncUrl, gdprConsent)}];
    }
  },
};

registerBidder(spec);

function getPage(bidderRequest) {
  return getConfig(`${BIDDER_CODE}.page`) || deepAccess(bidderRequest, 'refererInfo.page') || window.location.href;
}

function getEndpoint() {
  return getConfig(`${BIDDER_CODE}.url`) || DEFAULT_URL;
}

function getTestFlag() {
  return getConfig(`${BIDDER_CODE}.test`) === true;
}

function getLanguage() {
  return navigator && navigator.language
    ? navigator.language.indexOf('-') != -1
      ? navigator.language.split('-')[0]
      : navigator.language
    : undefined;
}

function getCurrencies() {
  const currencyOverrides = getConfig(`${BIDDER_CODE}.cur`);
  if (currencyOverrides !== undefined && (!isArray(currencyOverrides) || currencyOverrides.length === 0)) {
    throw Error('Currency override must be an array with at least one currency');
  }
  return currencyOverrides || DEFAULT_CURRENCIES;
}

function getFloorCurrency() {
  return getConfig(`${BIDDER_CODE}.floorCur`) || getCurrencies()[0];
}

function getPriceFloor(bidRequest, mediaType, size) {
  if (isFn(bidRequest.getFloor)) {
    const cur = getFloorCurrency();
    const floorInfo = bidRequest.getFloor({
      currency: cur,
      mediaType: mediaType,
      size: size,
    });
    if (isPlainObject(floorInfo) && !isNaN(floorInfo.floor)) {
      return {
        cur: floorInfo.currency || cur,
        value: floorInfo.floor,
      };
    }
  }
}

function getRefreshInformation(adUnitCode) {
  const refresh = refreshes[adUnitCode];
  if (!refresh) {
    refreshes[adUnitCode] = {
      count: 0,
      previousTime: new Date(),
    };
    return undefined;
  }

  const currentTime = new Date();
  const timeDifferenceSeconds = Math.floor((currentTime - refresh.previousTime) / 1000);
  refresh.count += 1;
  refresh.previousTime = currentTime;
  return {
    count: refresh.count,
    time: timeDifferenceSeconds,
  };
}

function mapIdToRequestId(id, bidRequest) {
  return bidRequest.bidderRequest.bids.filter((bid) => bid.adUnitCode === id)[0].bidId;
}

function hasUspConsent(uspConsent) {
  return typeof uspConsent !== 'string' || !(uspConsent[0] === '1' && uspConsent[2] === 'Y');
}

function hasGppConsent(gppConsent) {
  return (
    !(gppConsent && Array.isArray(gppConsent.applicableSections)) ||
    gppConsent.applicableSections.every((section) => typeof section === 'number' && section <= 5)
  );
}

function hasSyncConsent(gdprConsent, uspConsent, gppConsent) {
  return hasPurpose1Consent(gdprConsent) && hasUspConsent(uspConsent) && hasGppConsent(gppConsent);
}

function hasFullGdprConsent(gdprConsent) {
  try {
    const purposeConsents = Object.values(gdprConsent.vendorData.purpose.consents);
    return (
      purposeConsents.length > 0 &&
      purposeConsents.every((value) => value === true) &&
      gdprConsent.vendorData.vendor.consents[GVLID] === true
    );
  } catch (e) {
    return false;
  }
}

function getSyncUrl(responses) {
  return getConfig(`${BIDDER_CODE}.syncUrl`) || deepAccess(responses[0], 'body.syncUrl');
}

function getSyncEndpoint(url, gdprConsent) {
  return `${url}?gdpr=${gdprConsent?.gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(
    gdprConsent?.consentString || ''
  )}`;
}

function getSessionId() {
  try {
    if (storageManager.localStorageIsEnabled()) {
      let sessionId = storageManager.getDataFromLocalStorage(SESSION_ID_KEY);
      if (sessionId == null) {
        sessionId = generateUUID();
        storageManager.setDataInLocalStorage(SESSION_ID_KEY, sessionId);
      }
      return sessionId;
    } else {
      return undefined;
    }
  } catch (e) {
    return undefined;
  }
}
