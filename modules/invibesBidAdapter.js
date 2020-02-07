import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const CONSTANTS = {
  BIDDER_CODE: 'invibes',
  BID_ENDPOINT: 'https://bid.videostep.com/Bid/VideoAdContent',
  SYNC_ENDPOINT: 'https://k.r66net.com/GetUserSync',
  TIME_TO_LIVE: 300,
  DEFAULT_CURRENCY: 'EUR',
  PREBID_VERSION: 2,
  METHOD: 'GET',
  INVIBES_VENDOR_ID: 436
};

export const spec = {
  code: CONSTANTS.BIDDER_CODE,
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
      handlePostMessage();
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

  invibes.visitId = invibes.visitId || generateRandomId();

  cookieDomain = detectTopmostCookieDomain();
  invibes.noCookies = invibes.noCookies || invibes.getCookie('ivNoCookie');
  invibes.optIn = invibes.optIn || invibes.getCookie('ivOptIn') || readGdprConsent(bidderRequest.gdprConsent);

  initDomainId(invibes.domainOptions);

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

    noc: !cookieDomain,
    oi: invibes.optIn,

    kw: keywords
  };

  if (invibes.dom.id) {
    data.lId = invibes.dom.id;
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

  let loadData = function () {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch (e) {
      return {};
    }
  };

  let saveData = function (data) {
    localStorage.setItem(key, JSON.stringify(data));
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
  if (localStorage && localStorage.InvibesDEBUG) {
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

function handlePostMessage() {
  try {
    if (window.addEventListener) {
      window.addEventListener('message', acceptPostMessage);
    }
  } catch (e) { }
}

function acceptPostMessage(e) {
  let msg = e.data || {};
  if (msg.ivbscd === 1) {
    invibes.setCookie(msg.name, msg.value, msg.exdays, msg.domain);
  } else if (msg.ivbscd === 2) {
    invibes.dom.graduate();
  }
}

function readGdprConsent(gdprConsent) {
  if (gdprConsent && gdprConsent.vendorData && gdprConsent.vendorData.vendorConsents) {
    return !!gdprConsent.vendorData.vendorConsents[CONSTANTS.INVIBES_VENDOR_ID.toString(10)] === true ? 2 : -2;
  }

  return 0;
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

let cookieDomain;
invibes.getCookie = function (name) {
  let i, x, y;
  let cookies = document.cookie.split(';');
  for (i = 0; i < cookies.length; i++) {
    x = cookies[i].substr(0, cookies[i].indexOf('='));
    y = cookies[i].substr(cookies[i].indexOf('=') + 1);
    x = x.replace(/^\s+|\s+$/g, '');
    if (x === name) {
      return unescape(y);
    }
  }
};

invibes.setCookie = function (name, value, exdays, domain) {
  let whiteListed = name == 'ivNoCookie' || name == 'IvbsCampIdsLocal';
  if (invibes.noCookies && !whiteListed && (exdays || 0) >= 0) { return; }
  if (exdays > 365) { exdays = 365; }
  domain = domain || cookieDomain;
  let exdate = new Date();
  let exms = exdays * 24 * 60 * 60 * 1000;
  exdate.setTime(exdate.getTime() + exms);
  let cookieValue = value + ((!exdays) ? '' : '; expires=' + exdate.toUTCString());
  cookieValue += ';domain=' + domain + ';path=/';
  document.cookie = name + '=' + cookieValue;
};

let detectTopmostCookieDomain = function () {
  let testCookie = invibes.Uid.generate();
  let hostParts = location.hostname.split('.');
  if (hostParts.length === 1) {
    return location.hostname;
  }
  for (let i = hostParts.length - 1; i >= 0; i--) {
    let domain = '.' + hostParts.slice(i).join('.');
    invibes.setCookie(testCookie, testCookie, 1, domain);
    let val = invibes.getCookie(testCookie);
    if (val === testCookie) {
      invibes.setCookie(testCookie, testCookie, -1, domain);
      return domain;
    }
  }
};

let initDomainId = function (options) {
  if (invibes.dom) { return; }

  options = options || {};

  let cookiePersistence = {
    cname: 'ivbsdid',
    load: function () {
      let str = invibes.getCookie(this.cname) || '';
      try {
        return JSON.parse(str);
      } catch (e) { }
    },
    save: function (obj) {
      invibes.setCookie(this.cname, JSON.stringify(obj), 365);
    }
  };

  let persistence = options.persistence || cookiePersistence;
  let state;
  let minHC = 2;

  let validGradTime = function (state) {
    if (!state.cr) { return false; }
    let min = 151 * 10e9;
    if (state.cr < min) {
      return false;
    }
    let now = new Date().getTime();
    let age = now - state.cr;
    let minAge = 24 * 60 * 60 * 1000;
    return age > minAge;
  };

  state = persistence.load() || {
    id: invibes.Uid.generate(),
    cr: new Date().getTime(),
    hc: 1,
  };

  if (state.id.match(/\./)) {
    state.id = invibes.Uid.generate();
  }

  let graduate = function () {
    if (!state.cr) { return; }
    delete state.cr;
    delete state.hc;
    persistence.save(state);
    setId();
  };

  let regenerateId = function () {
    state.id = invibes.Uid.generate();
    persistence.save(state);
  };

  let setId = function () {
    invibes.dom = {
      get id() {
        return (!state.cr && invibes.optIn > 0) ? state.id : undefined;
      },
      get tempId() {
        return (invibes.optIn > 0) ? state.id : undefined;
      },
      graduate: graduate,
      regen: regenerateId
    };
  };

  if (state.cr && !options.noVisit) {
    if (state.hc < minHC) {
      state.hc++;
    }
    if ((state.hc >= minHC && validGradTime(state)) || options.skipGraduation) {
      graduate();
    }
  }
  persistence.save(state);
  setId();
  ivLogger.info('Did=' + invibes.dom.id);
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
