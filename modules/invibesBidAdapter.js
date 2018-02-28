import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

const CONSTANTS = {
  BIDDER_CODE: 'invibes',
  BID_ENDPOINT: '//bid.videostep.com/Bid/VideoAdContent',
  SYNC_ENDPOINT: '//k.r66net.com/GetUserSync',
  TIME_TO_LIVE: 300,
  DEFAULT_CURRENCY: 'EUR',
  PREBID_VERSION: 1,
  METHOD: 'GET'
};

export const spec = {
  code: CONSTANTS.BIDDER_CODE,
  aliases: [CONSTANTS.BIDDER_CODE],
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
  buildRequests: function (bidRequests, bidderRequest) {
    return buildRequest(bidRequests, bidderRequest != null ? bidderRequest.auctionStart : null);
  },
  /**
   * @param {*} responseObj
   * @param {requestParams} bidRequests
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function (responseObj, requestParams) {
    return handleResponse(responseObj, requestParams != null ? requestParams.bidRequests : null);
  },
  getUserSyncs: function(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return {
        type: 'iframe',
        url: CONSTANTS.SYNC_ENDPOINT
      };
    }
  }
};

registerBidder(spec);

function isBidRequestValid(bid) {
  if (typeof bid.params !== 'object') {
    return false;
  }
  let params = bid.params;

  if (params.placementId == null) {
    return false;
  }

  return true;
}

function buildRequest(bidRequests, auctionStart) {
  // invibes only responds to 1 bid request for each user visit
  const _placementIds = [];
  let _loginId, _customEndpoint, _bidContainerId;
  let _ivAuctionStart = auctionStart || Date.now();

  bidRequests.forEach(function (bidRequest) {
    bidRequest.startTime = new Date().getTime();
    _placementIds.push(bidRequest.params.placementId);
    _loginId = _loginId || bidRequest.params.loginId;
    _customEndpoint = _customEndpoint || bidRequest.params.customEndpoint;
    _bidContainerId = _bidContainerId || bidRequest.params.adContainerId || bidRequest.params.bidContainerId;
  });

  const topWin = getTopMostWindow();
  var invibes = topWin.invibes = topWin.invibes || {};
  invibes.visitId = invibes.visitId || generateRandomId();
  invibes.bidContainerId = invibes.bidContainerId || _bidContainerId;

  initDomainId(invibes);

  var currentQueryStringParams = parseQueryStringParams();

  let data = {
    location: getDocumentLocation(topWin),
    videoAdHtmlId: generateRandomId(),
    showFallback: currentQueryStringParams['advs'] === '0',
    ivbsCampIdsLocal: getCookie('IvbsCampIdsLocal'),
    lId: invibes.dom.id,

    bidParamsJson: JSON.stringify({
      placementIds: _placementIds,
      loginId: _loginId,
      bidContainerId: _bidContainerId,
      auctionStartTime: _ivAuctionStart,
      bidVersion: CONSTANTS.PREBID_VERSION
    }),
    capCounts: getCappedCampaignsAsString(),

    vId: invibes.visitId,
    width: topWin.innerWidth,
    height: topWin.innerHeight
  };

  var parametersToPassForward = 'videoaddebug,advs,bvci,bvid,istop,trybvid,trybvci'.split(',');
  for (var key in currentQueryStringParams) {
    if (currentQueryStringParams.hasOwnProperty(key)) {
      var value = currentQueryStringParams[key];
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

  const topWin = getTopMostWindow();
  const invibes = topWin.invibes = topWin.invibes || {};

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
  for (var i = 0; i < bidRequests.length; i++) {
    var bidRequest = bidRequests[i];

    if (bidModel.PlacementId === bidRequest.params.placementId) {
      var size = getBiggerSize(bidRequest.sizes);

      bidResponses.push({
        requestId: bidRequest.bidId,
        cpm: ad.BidPrice,
        width: bidModel.Width || size[0],
        height: bidModel.Height || size[1],
        creativeId: ad.VideoExposedId,
        currency: bidModel.Currency || CONSTANTS.DEFAULT_CURRENCY,
        netRevenue: true,
        ttl: CONSTANTS.TIME_TO_LIVE,
        ad: renderCreative(bidModel),

        placementCode: bidRequest.placementCode
      });

      const now = Date.now();
      invibes.ivLogger = invibes.ivLogger || initLogger();
      invibes.ivLogger.info('Bid auction started at ' + bidModel.AuctionStartTime + ' . Invibes registered the bid at ' + now + ' ; bid request took a total of ' + (now - bidModel.AuctionStartTime) + ' ms.');
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
  var params = {};
  try { params = JSON.parse(localStorage.ivbs); } catch (e) { }
  var re = /[\\?&]([^=]+)=([^\\?&#]+)/g;
  var m;
  while ((m = re.exec(window.location.href)) != null) {
    if (m.index === re.lastIndex) {
      re.lastIndex++;
    }
    params[m[1].toLowerCase()] = m[2];
  }
  return params;
}

function getBiggerSize(array) {
  var result = [0, 0];
  for (var i = 0; i < array.length; i++) {
    if (array[i][0] * array[i][1] > result[0] * result[1]) {
      result = array[i];
    }
  }
  return result;
}

function getTopMostWindow() {
  var res = window;

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
  var key = 'ivvcap';

  var loadData = function () {
    return JSON.parse(localStorage.getItem(key)) || {};
  };

  var saveData = function (data) {
    localStorage.setItem(key, JSON.stringify(data));
  };

  var clearExpired = function () {
    var now = new Date().getTime();
    var data = loadData();
    var dirty = false;
    Object.keys(data).forEach(function (k) {
      var exp = data[k][1];
      if (exp <= now) {
        delete data[k];
        dirty = true;
      }
    });
    if (dirty) {
      saveData(data);
    }
  };

  var getCappedCampaigns = function () {
    clearExpired();
    var data = loadData();
    return Object.keys(data)
      .filter(function (k) { return data.hasOwnProperty(k); })
      .sort()
      .map(function (k) { return [k, data[k][0]]; });
  };

  return getCappedCampaigns()
    .map(function (record) { return record.join('='); })
    .join(',');
}

function initLogger() {
  const noop = function () { };

  if (localStorage && localStorage.InvibesDEBUG) {
    return window.console;
  }

  return { info: noop, error: noop, log: noop, warn: noop, debug: noop };
}

/// Local domain cookie management =====================
var Uid = {
  generate: function () {
    var date = new Date().getTime();
    if (date > 151 * 10e9) {
      var datePart = Math.floor(date / 1000).toString(36);
      var maxRand = parseInt('zzzzzz', 36)
      var randPart = Math.floor(Math.random() * maxRand).toString(36);
      return datePart + '.' + randPart;
    }
  },
  getCrTime: function (s) {
    var toks = s.split('.');
    return parseInt(toks[0] || 0, 36) * 1e3;
  }
};

var cookieDomain, noCookies;
function getCookie(name) {
  var i, x, y;
  var cookies = document.cookie.split(';');
  for (i = 0; i < cookies.length; i++) {
    x = cookies[i].substr(0, cookies[i].indexOf('='));
    y = cookies[i].substr(cookies[i].indexOf('=') + 1);
    x = x.replace(/^\s+|\s+$/g, '');
    if (x === name) {
      return unescape(y);
    }
  }
};

function setCookie(name, value, exdays, domain) {
  if (noCookies && name != 'ivNoCookie' && (exdays || 0) >= 0) { return; }
  if (exdays > 365) { exdays = 365; }
  domain = domain || cookieDomain;
  var exdate = new Date();
  var exms = exdays * 24 * 60 * 60 * 1000;
  exdate.setTime(exdate.getTime() + exms);
  var cookieValue = value + ((!exdays) ? '' : '; expires=' + exdate.toUTCString());
  cookieValue += ';domain=' + domain + ';path=/';
  document.cookie = name + '=' + cookieValue;
};

var detectTopmostCookieDomain = function () {
  var testCookie = Uid.generate();
  var hostParts = location.host.split('.');
  if (hostParts.length === 1) {
    return location.host;
  }
  for (var i = hostParts.length - 1; i >= 0; i--) {
    var domain = '.' + hostParts.slice(i).join('.');
    setCookie(testCookie, testCookie, 1, domain);
    var val = getCookie(testCookie);
    if (val === testCookie) {
      setCookie(testCookie, testCookie, -1, domain);
      return domain;
    }
  }
};
cookieDomain = detectTopmostCookieDomain();
noCookies = getCookie('ivNoCookie');

function initDomainId(invibes, persistence) {
  if (typeof invibes.dom === 'object') {
    return;
  }

  var cookiePersistence = {
    cname: 'ivbsdid',
    load: function () {
      var str = getCookie(this.cname) || '';
      try {
        return JSON.parse(str);
      } catch (e) { }
    },
    save: function (obj) {
      setCookie(this.cname, JSON.stringify(obj), 365);
    }
  };

  persistence = persistence || cookiePersistence;
  var state;
  var minHC = 5;

  var validGradTime = function (d) {
    var min = 151 * 10e9;
    var yesterday = new Date().getTime() - 864 * 10e4
    return d > min && d < yesterday;
  };

  state = persistence.load() || {
    id: Uid.generate(),
    hc: 1,
    temp: 1
  };

  var graduate;

  var setId = function () {
    invibes.dom = {
      id: state.temp ? undefined : state.id,
      tempId: state.id,
      graduate: graduate
    };
  };

  graduate = function () {
    if (!state.temp) { return; }
    delete state.temp;
    delete state.hc;
    persistence.save(state);
    setId();
  }

  if (state.temp) {
    if (state.hc < minHC) {
      state.hc++;
    }
    if (state.hc >= minHC && validGradTime(Uid.getCrTime(state.id))) {
      graduate();
    }
  }

  persistence.save(state);
  setId();
};
// =====================
