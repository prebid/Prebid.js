import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';

const CONSTANTS = {
  BIDDER_CODE: 'invibes',
  BID_ENDPOINT: 'https://bid.videostep.com/Bid/VideoAdContent',
  SYNC_ENDPOINT: 'https://k.r66net.com/GetUserSync',
  TIME_TO_LIVE: 300,
  DEFAULT_CURRENCY: 'EUR',
  PREBID_VERSION: 4,
  METHOD: 'GET',
  INVIBES_VENDOR_ID: 436
};

const storage = getStorageManager(CONSTANTS.INVIBES_VENDOR_ID);

export const spec = {
  code: CONSTANTS.BIDDER_CODE,
  gvlid: CONSTANTS.INVIBES_VENDOR_ID,
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: isBidRequestValid,
  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return ServerRequest[]
   */
  buildRequests: buildRequest,
  /**
   * @param {*} responseObj
   * @param {requestParams} bidRequests
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function (responseObj, requestParams) {
    return handleResponse(responseObj, requestParams != null ? requestParams.bidRequests : null);
  },
  getUserSyncs: function (syncOptions) {
    if (syncOptions.iframeEnabled) {
      const syncUrl = buildSyncUrl();
      return {
        type: 'iframe',
        url: syncUrl
      };
    }
  }
};

registerBidder(spec);

// some state info is required: cookie info, unique user visit id
const topWin = getTopMostWindow();
let invibes = topWin.invibes = topWin.invibes || {};
invibes.purposes = invibes.purposes || [false, false, false, false, false, false, false, false, false, false];
let _customUserSync;

function isBidRequestValid(bid) {
  if (invibes && typeof invibes.bidResponse === 'object') {
    utils.logInfo('Invibes Adapter - Bid response already received. Invibes only responds to one bid request per user visit');
    return false;
  }

  if (typeof bid.params !== 'object') {
    return false;
  }
  let params = bid.params;

  if (params.placementId == null) {
    return false;
  }

  return true;
}

function buildRequest(bidRequests, bidderRequest) {
  bidderRequest = bidderRequest || {};
  const _placementIds = [];
  let _loginId, _customEndpoint;
  let _ivAuctionStart = bidderRequest.auctionStart || Date.now();

  bidRequests.forEach(function (bidRequest) {
    bidRequest.startTime = new Date().getTime();
    _placementIds.push(bidRequest.params.placementId);
    _loginId = _loginId || bidRequest.params.loginId;
    _customEndpoint = _customEndpoint || bidRequest.params.customEndpoint;
    _customUserSync = _customUserSync || bidRequest.params.customUserSync;
  });

  invibes.optIn = invibes.optIn || readGdprConsent(bidderRequest.gdprConsent);

  invibes.visitId = invibes.visitId || generateRandomId();
  invibes.noCookies = invibes.noCookies || invibes.getCookie('ivNoCookie');
  let lid = initDomainId(invibes.domainOptions);

  const currentQueryStringParams = parseQueryStringParams();

  let data = {
    location: getDocumentLocation(topWin),
    videoAdHtmlId: generateRandomId(),
    showFallback: currentQueryStringParams['advs'] === '0',
    ivbsCampIdsLocal: invibes.getCookie('IvbsCampIdsLocal'),

    bidParamsJson: JSON.stringify({
      placementIds: _placementIds,
      loginId: _loginId,
      auctionStartTime: _ivAuctionStart,
      bidVersion: CONSTANTS.PREBID_VERSION
    }),
    capCounts: getCappedCampaignsAsString(),

    vId: invibes.visitId,
    width: topWin.innerWidth,
    height: topWin.innerHeight,

    oi: invibes.optIn,

    kw: keywords,
    purposes: invibes.purposes.toString(),

    tc: invibes.gdpr_consent
  };

  if (lid) {
    data.lId = lid;
  }

  const parametersToPassForward = 'videoaddebug,advs,bvci,bvid,istop,trybvid,trybvci'.split(',');
  for (let key in currentQueryStringParams) {
    if (currentQueryStringParams.hasOwnProperty(key)) {
      let value = currentQueryStringParams[key];
      if (parametersToPassForward.indexOf(key) > -1 || /^vs|^invib/i.test(key)) {
        data[key] = value;
      }
    }
  }

  return {
    method: CONSTANTS.METHOD,
    url: _customEndpoint || CONSTANTS.BID_ENDPOINT,
    data: data,
    options: { withCredentials: true },
    // for POST: { contentType: 'application/json', withCredentials: true }
    bidRequests: bidRequests
  };
}

function handleResponse(responseObj, bidRequests) {
  if (bidRequests == null || bidRequests.length === 0) {
    utils.logInfo('Invibes Adapter - No bids have been requested');
    return [];
  }

  if (!responseObj) {
    utils.logInfo('Invibes Adapter - Bid response is empty');
    return [];
  }

  responseObj = responseObj.body || responseObj;
  responseObj = responseObj.videoAdContentResult || responseObj;

  let bidModel = responseObj.BidModel;
  if (typeof bidModel !== 'object') {
    utils.logInfo('Invibes Adapter - Bidding is not configured');
    return [];
  }

  if (typeof invibes.bidResponse === 'object') {
    utils.logInfo('Invibes Adapter - Bid response already received. Invibes only responds to one bid request per user visit');
    return [];
  }

  invibes.bidResponse = responseObj;

  let ads = responseObj.Ads;

  if (!Array.isArray(ads) || ads.length < 1) {
    if (responseObj.AdReason != null) {
      utils.logInfo('Invibes Adapter - ' + responseObj.AdReason);
    }

    utils.logInfo('Invibes Adapter - No ads available');
    return [];
  }

  let ad = ads[0];

  if (bidModel.PlacementId == null) {
    utils.logInfo('Invibes Adapter - No Placement Id in response');
    return [];
  }

  const bidResponses = [];
  for (let i = 0; i < bidRequests.length; i++) {
    let bidRequest = bidRequests[i];

    if (bidModel.PlacementId == bidRequest.params.placementId) {
      let size = getBiggerSize(bidRequest.sizes);

      bidResponses.push({
        requestId: bidRequest.bidId,
        cpm: ad.BidPrice,
        width: bidModel.Width || size[0],
        height: bidModel.Height || size[1],
        creativeId: ad.VideoExposedId,
        currency: bidModel.Currency || CONSTANTS.DEFAULT_CURRENCY,
        netRevenue: true,
        ttl: CONSTANTS.TIME_TO_LIVE,
        ad: renderCreative(bidModel)
      });

      const now = Date.now();
      ivLogger.info('Bid auction started at ' + bidModel.AuctionStartTime + ' . Invibes registered the bid at ' + now + ' ; bid request took a total of ' + (now - bidModel.AuctionStartTime) + ' ms.');
    } else {
      utils.logInfo('Invibes Adapter - Incorrect Placement Id: ' + bidRequest.params.placementId);
    }
  }

  return bidResponses;
}

function generateRandomId() {
  return (Math.round(Math.random() * 1e12)).toString(36).substring(0, 10);
}

function getDocumentLocation(topWin) {
  return topWin.location.href.substring(0, 300).split(/[?#]/)[0];
}

function parseQueryStringParams() {
  let params = {};
  try { params = JSON.parse(localStorage.ivbs); } catch (e) { }
  let re = /[\\?&]([^=]+)=([^\\?&#]+)/g;
  let m;
  while ((m = re.exec(window.location.href)) != null) {
    if (m.index === re.lastIndex) {
      re.lastIndex++;
    }
    params[m[1].toLowerCase()] = m[2];
  }
  return params;
}

function getBiggerSize(array) {
  let result = [0, 0];
  for (let i = 0; i < array.length; i++) {
    if (array[i][0] * array[i][1] > result[0] * result[1]) {
      result = array[i];
    }
  }
  return result;
}

function getTopMostWindow() {
  let res = window;

  try {
    while (top !== res) {
      if (res.parent.location.href.length) { res = res.parent; }
    }
  } catch (e) { }

  return res;
}

function renderCreative(bidModel) {
  return `<html>
        <head><script type='text/javascript'>inDapIF=true;</script></head>
          <body style='margin : 0; padding: 0;'>
          creativeHtml
          </body>
        </html>`
    .replace('creativeHtml', bidModel.CreativeHtml);
}

function getCappedCampaignsAsString() {
  const key = 'ivvcap';

  if (!invibes.optIn || !invibes.purposes[0]) { return ''; }

  let loadData = function () {
    try {
      return JSON.parse(storage.getDataFromLocalStorage(key)) || {};
    } catch (e) {
      return {};
    }
  };

  let saveData = function (data) {
    storage.setDataInLocalStorage(key, JSON.stringify(data));
  };

  let clearExpired = function () {
    let now = new Date().getTime();
    let data = loadData();
    let dirty = false;
    Object.keys(data).forEach(function (k) {
      let exp = data[k][1];
      if (exp <= now) {
        delete data[k];
        dirty = true;
      }
    });
    if (dirty) {
      saveData(data);
    }
  };

  let getCappedCampaigns = function () {
    clearExpired();
    let data = loadData();
    return Object.keys(data)
      .filter(function (k) { return data.hasOwnProperty(k); })
      .sort()
      .map(function (k) { return [k, data[k][0]]; });
  };

  return getCappedCampaigns()
    .map(function (record) { return record.join('='); })
    .join(',');
}

const noop = function () { };

function initLogger() {
  if (storage.hasLocalStorage() && localStorage.InvibesDEBUG) {
    return window.console;
  }

  return { info: noop, error: noop, log: noop, warn: noop, debug: noop };
}

function buildSyncUrl() {
  let syncUrl = _customUserSync || CONSTANTS.SYNC_ENDPOINT;
  syncUrl += '?visitId=' + invibes.visitId;
  syncUrl += '&optIn=' + invibes.optIn;

  const did = invibes.getCookie('ivbsdid');
  if (did) {
    syncUrl += '&ivbsdid=' + encodeURIComponent(did);
  }

  const bks = invibes.getCookie('ivvbks');
  if (bks) {
    syncUrl += '&ivvbks=' + encodeURIComponent(bks);
  }

  return syncUrl;
}

function readGdprConsent(gdprConsent) {
  if (gdprConsent && gdprConsent.vendorData) {
    invibes.gdpr_consent = getVendorConsentData(gdprConsent.vendorData);

    if (!gdprConsent.vendorData.gdprApplies || gdprConsent.vendorData.hasGlobalConsent) {
      var index;
      for (index = 0; index < invibes.purposes; ++index) {
        invibes.purposes[index] = true;
      }
      return 2;
    }

    let purposeConsents = getPurposeConsents(gdprConsent.vendorData);

    if (purposeConsents == null) { return 0; }
    let purposesLength = getPurposeConsentsCounter(gdprConsent.vendorData);

    if (purposeConsents instanceof Array) {
      for (let i = 0; i < purposesLength && i < purposeConsents.length; i++) {
        invibes.purposes[i] = !((purposeConsents[i] === false || purposeConsents[i] === 'false' || purposeConsents[i] == null));
      }
    } else if (typeof purposeConsents === 'object' && purposeConsents !== null) {
      let i = 0;
      for (let prop in purposeConsents) {
        if (i === purposesLength) {
          break;
        }

        if (purposeConsents.hasOwnProperty(prop)) {
          invibes.purposes[i] = !((purposeConsents[prop] === false || purposeConsents[prop] === 'false' || purposeConsents[prop] == null));
          i++;
        }
      }
    } else {
      return 0;
    }

    let invibesVendorId = CONSTANTS.INVIBES_VENDOR_ID.toString(10);
    let vendorConsents = getVendorConsents(gdprConsent.vendorData);
    if (vendorConsents == null || vendorConsents[invibesVendorId] == null) { return 4; }

    if (vendorConsents[invibesVendorId] === false) { return 0; }

    return 2;
  }

  return 0;
}

function getPurposeConsentsCounter(vendorData) {
  if (vendorData.purpose && vendorData.purpose.consents) {
    return 10;
  }

  return 5;
}

function getPurposeConsents(vendorData) {
  if (vendorData.purpose && vendorData.purpose.consents) {
    return vendorData.purpose.consents;
  }

  if (vendorData.purposeConsents) {
    return vendorData.purposeConsents;
  }

  return null;
}

function getVendorConsentData(vendorData) {
  if (vendorData.purpose && vendorData.purpose.consents) {
    if (vendorData.tcString != null) { return vendorData.tcString; }
  }
  return vendorData.consentData;
};

function getVendorConsents(vendorData) {
  if (vendorData.vendor && vendorData.vendor.consents) {
    return vendorData.vendor.consents;
  }

  if (vendorData.vendorConsents) {
    return vendorData.vendorConsents;
  }

  return null;
}

const ivLogger = initLogger();

/// Local domain cookie management =====================
invibes.Uid = {
  generate: function () {
    let maxRand = parseInt('zzzzzz', 36)
    let mkRand = function () { return Math.floor(Math.random() * maxRand).toString(36); };
    let rand1 = mkRand();
    let rand2 = mkRand();
    return rand1 + rand2;
  }
};

invibes.getCookie = function (name) {
  if (!storage.cookiesAreEnabled()) { return; }

  if (!invibes.optIn || !invibes.purposes[0]) { return; }

  return storage.getCookie(name);
};

let initDomainId = function (options) {
  let cookiePersistence = {
    cname: 'ivbsdid',
    load: function () {
      let str = invibes.getCookie(this.cname) || '';
      try {
        return JSON.parse(str);
      } catch (e) { }
    }
  };

  options = options || {};

  var persistence = options.persistence || cookiePersistence;

  let state = persistence.load();

  return state ? (state.id || state.tempId) : undefined;
};

let keywords = (function () {
  const cap = 300;
  let headTag = document.getElementsByTagName('head')[0];
  let metaTag = headTag ? headTag.getElementsByTagName('meta') : [];

  function parse(str, cap) {
    let parsedStr = str.replace(/[<>~|\\"`!@#$%^&*()=+?]/g, '');

    function onlyUnique(value, index, self) {
      return value !== '' && self.indexOf(value) === index;
    }

    let words = parsedStr.split(/[\s,;.:]+/);
    let uniqueWords = words.filter(onlyUnique);
    parsedStr = '';

    for (let i = 0; i < uniqueWords.length; i++) {
      parsedStr += uniqueWords[i];
      if (parsedStr.length >= cap) {
        return parsedStr;
      }
      if (i < uniqueWords.length - 1) {
        parsedStr += ',';
      }
    }

    return parsedStr;
  }

  function gt(cap, prefix) {
    cap = cap || 300;
    prefix = prefix || '';
    let title = document.title || headTag
      ? headTag.getElementsByTagName('title')[0]
        ? headTag.getElementsByTagName('title')[0].innerHTML
        : ''
      : '';

    return parse(prefix + ',' + title, cap);
  }

  function gmeta(metaName, cap, prefix) {
    metaName = metaName || 'keywords';
    cap = cap || 100;
    prefix = prefix || '';
    let fallbackKw = prefix;

    for (let i = 0; i < metaTag.length; i++) {
      if (metaTag[i].name && metaTag[i].name.toLowerCase() === metaName.toLowerCase()) {
        let kw = prefix + ',' + metaTag[i].content || '';
        return parse(kw, cap);
      } else if (metaTag[i].name && metaTag[i].name.toLowerCase().indexOf(metaName.toLowerCase()) > -1) {
        fallbackKw = prefix + ',' + metaTag[i].content || '';
      }
    }

    return parse(fallbackKw, cap);
  }

  let kw = gmeta('keywords', cap);
  if (!kw || kw.length < cap - 8) {
    kw = gmeta('description', cap, kw);
    if (!kw || kw.length < cap - 8) {
      kw = gt(cap, kw);
    }
  }
  return kw;
}());
// =====================

export function resetInvibes() {
  invibes.optIn = undefined;
  invibes.noCookies = undefined;
  invibes.dom = undefined;
  invibes.bidResponse = undefined;
  invibes.domainOptions = undefined;
}

export function stubDomainOptions(persistence) {
  invibes.domainOptions = {
    persistence: persistence
  };
}
