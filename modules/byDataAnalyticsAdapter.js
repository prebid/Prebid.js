import { deepClone, logInfo, logError, getWinDimensions } from '../src/utils.js';
import Base64 from 'crypto-js/enc-base64';
import hmacSHA512 from 'crypto-js/hmac-sha512';
import enc from 'crypto-js/enc-utf8';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS, BID_STATUS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import { getStorageManager } from '../src/storageManager.js';
import { auctionManager } from '../src/auctionManager.js';
import { ajax } from '../src/ajax.js';
import { MODULE_TYPE_ANALYTICS } from '../src/activities/modules.js';
import { getViewportSize } from '../libraries/viewport/viewport.js';
import { getOsBrowserInfo } from '../libraries/userAgentUtils/detailed.js';

const versionCode = '4.5.0';
const secretKey = 'bydata@123456';
const { NO_BID, BID_TIMEOUT, AUCTION_END, AUCTION_INIT, BID_WON } = EVENTS;
const DEFAULT_EVENT_URL = 'https://telemetry.bydata.com/topics/prebid';
const analyticsType = 'endpoint';
const isBydata = isKeyInUrl('bydata_debug');
const adunitsMap = {};
const MODULE_CODE = 'bydata';
const storage = getStorageManager({ moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_CODE });

let initOptions = {};
var payload = {};
var isDataSend = false;
var bdNbTo = {};

function normalizeSize(size) {
  if (!size) return '';
  if (Array.isArray(size)) return size[0] + 'x' + size[1];
  if (typeof size === 'string') return size;
  if (size.width && size.height) return size.width + 'x' + size.height;
  return '';
}

/* method used for testing parameters */
function isKeyInUrl(name) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const param = urlParams.get(name);
  return param;
}

/* return ad unit full path wrt custom ad unit code */
function getAdunitName(code) {
  var name = code;
  for (const [key, value] of Object.entries(adunitsMap)) {
    if (key === code) { name = value; }
  }
  return name;
}

/* EVENT: auction init */
function onAuctionStart(t) {
  /* map of ad unit code - ad unit full path */
  if (!t || !t.auctionId) return;
  // init per-auction storage
  bdNbTo[t.auctionId] = { to: [], nb: [] };

  t.adUnits && t.adUnits.length && t.adUnits.forEach((adu) => {
    const { code, adunit } = adu;
    adunitsMap[code] = adunit;
  });
}

/* EVENT: bid timeout */
function onBidTimeout(t) {
  if (!payload['visitor_data'] || !t || !t.length) return;
  t.forEach(timeout => {
    const { auctionId } = timeout;
    if (!bdNbTo[auctionId]) bdNbTo[auctionId] = { to: [], nb: [] };
    bdNbTo[auctionId].to.push(timeout);
  });
}

/* EVENT: no bid */
function onNoBidData(t) {
  if (!payload['visitor_data'] || !t) return;
  const { auctionId } = t;
  if (!bdNbTo[auctionId]) bdNbTo[auctionId] = { to: [], nb: [] };
  bdNbTo[auctionId].nb.push(t);
}

/* EVENT: bid won */
function onBidWon(t) {
  const { isCorrectOption } = initOptions;
  if (!(isCorrectOption && (isDataSend || isBydata))) return;

  // initialize per-auction wins storage if not present
  if (!payload._wins) payload._wins = {};
  if (!payload._wins[t.auctionId]) payload._wins[t.auctionId] = [];
  payload._wins[t.auctionId].push({
    requestId: t.requestId,
    size: normalizeSize(t.size),
    auctionId: t.auctionId
  });
}

/* EVENT: auction end */
function onAuctionEnd(t) {
  const { isCorrectOption } = initOptions;
  setTimeout(() => {
    if (isCorrectOption && (isDataSend || isBydata)) {
      ascAdapter.dataProcess(t);
      ascAdapter.sendPayload(payload);

      // cleanup this auction only
      if (payload._wins && payload._wins[t.auctionId]) {
        delete payload._wins[t.auctionId];
      }
      if (bdNbTo[t.auctionId]) {
        delete bdNbTo[t.auctionId];
      }
    }
  }, 1500);
}

const ascAdapter = Object.assign(adapter({ url: DEFAULT_EVENT_URL, analyticsType: analyticsType }), {
  track({ eventType, args }) {
    switch (eventType) {
      case AUCTION_INIT:
        onAuctionStart(args);
        break;
      case NO_BID:
        onNoBidData(args);
        break;
      case BID_TIMEOUT:
        onBidTimeout(args);
        break;
      case AUCTION_END:
        onAuctionEnd(args);
        break;
      case BID_WON:
        onBidWon(args);
        break;
      default:
        break;
    }
  }
});

// save the base class function
ascAdapter.originEnableAnalytics = ascAdapter.enableAnalytics;
// override enableAnalytics so we can get access to the config passed in from the page
ascAdapter.enableAnalytics = function (config) {
  if (this.initConfig(config)) {
    initOptions.isCorrectOption && ascAdapter.getVisitorData();
    ascAdapter.originEnableAnalytics(config);
  }
};

ascAdapter.initConfig = function (config) {
  let isCorrectOption = true;
  initOptions = {};

  initOptions.options = deepClone(config.options);
  initOptions.clientId = initOptions.options.clientId || null;
  initOptions.logFrequency = initOptions.options.logFrequency;
  if (!initOptions.clientId) {
    _logError('"options.clientId" should not empty!!');
    isCorrectOption = false;
  }

  // FIXED  (single source of truth)
  const existingFlag = window.asc_data;
  if (typeof existingFlag === 'boolean') {
    isDataSend = existingFlag;
  } else {
    const rndNum = Math.floor(Math.random() * 10000 + 1);
    isDataSend = rndNum <= initOptions.logFrequency;
    window.asc_data = isDataSend; // persist for session
  }
  initOptions.isCorrectOption = isCorrectOption;
  this.initOptions = initOptions;
  return isCorrectOption;
};

ascAdapter.getVisitorData = function (data = {}) {
  var ua = data.uid ? data : {};
  const info = getOsBrowserInfo();

  function generateUid() {
    try {
      var buffer = new Uint8Array(16);
      crypto.getRandomValues(buffer);
      buffer[6] = (buffer[6] & ~176) | 64;
      buffer[8] = (buffer[8] & ~64) | 128;
      var hex = Array.prototype.map.call(new Uint8Array(buffer), function (x) {
        return ('00' + x.toString(16)).slice(-2);
      }).join('');
      return hex.slice(0, 5) + '-' + hex.slice(5, 9) + '-' + hex.slice(9, 13) + '-' + hex.slice(13, 18);
    } catch (e) {
      return '';
    }
  }
  function base64url(source) {
    var encodedSource = Base64.stringify(source);
    encodedSource = encodedSource.replace(/=+$/, '');
    encodedSource = encodedSource.replace(/\+/g, '-');
    encodedSource = encodedSource.replace(/\//g, '_');
    return encodedSource;
  }
  function getJWToken(data) {
    var header = {
      'alg': 'HS256',
      'typ': 'JWT'
    };
    var stringifiedHeader = enc.parse(JSON.stringify(header));
    var encodedHeader = base64url(stringifiedHeader);
    var stringifiedData = enc.parse(JSON.stringify(data));
    var encodedData = base64url(stringifiedData);
    var token = encodedHeader + '.' + encodedData;
    var signature = hmacSHA512(token, secretKey);
    signature = base64url(signature);
    var signedToken = token + '.' + signature;
    return signedToken;
  }
  function detectWidth() {
    const { width: viewportWidth } = getViewportSize();
    const windowDimensions = getWinDimensions();
    return windowDimensions.screen.width || (windowDimensions.innerWidth && windowDimensions.document.documentElement.clientWidth) ? Math.min(windowDimensions.innerWidth, windowDimensions.document.documentElement.clientWidth) : viewportWidth;
  }
  function giveDeviceTypeOnScreenSize() {
    var _dWidth = detectWidth();
    return _dWidth > 1024 ? 'Desktop' : (_dWidth <= 1024 && _dWidth >= 768) ? 'Tablet' : 'Mobile';
  }

  const { clientId } = initOptions;
  var userId = storage.getDataFromLocalStorage('userId');
  if (!userId) {
    userId = generateUid();
    storage.setDataInLocalStorage('userId', userId);
  }
  var screenSize = { width: window.screen.width, height: window.screen.height };
  var deviceType = giveDeviceTypeOnScreenSize();
  if (!ua['uid']) {
    ua['uid'] = userId;
    ua['cid'] = clientId;
    ua['pid'] = window.location.hostname;
    ua["os"] = info.os.name;
    ua["osv"] = info.os.version;
    ua["br"] = info.browser.name;
    ua["brv"] = info.browser.version;
    ua['ss'] = screenSize;
    ua['de'] = deviceType;
    ua['tz'] = window.Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  var signedToken = getJWToken(ua);
  payload['visitor_data'] = signedToken;
  // winPayload['visitor_data'] = signedToken;
  return signedToken;
};

ascAdapter.dataProcess = function (t) {
  if (!t || !t.auctionId) return payload;
  const auctionId = t.auctionId;

  if (isBydata) payload['bydata_debug'] = 'true';

  payload['aid'] = auctionId;
  payload['as'] = t.timestamp;
  payload['auctionData'] = [];

  const timeoutData = bdNbTo[auctionId] || { to: [], nb: [] };

  // Build request map
  let requestMap = [];

  t.bidderRequests && t.bidderRequests.forEach(bidReq => {
    bidReq.bids.forEach(bid => {
      const sizeList = bid.sizes || [];

      sizeList.forEach(size => {
        requestMap.push({
          au: getAdunitName(bid.adUnitCode),
          auc: bid.adUnitCode,
          aus: normalizeSize(size),
          mt: bid.mediaTypes?.banner ? 'display' : 'video',
          bidadv: bid.bidder,
          bid: bid.bidId,
          inb: 0,
          ito: 0,
          ipwb: 0,
          iwb: 0
        });
      });
    });
  });

  payload['auctionData'] = requestMap;

  //  Map bidsReceived (FILTER BY AUCTION)
  const bidsReceived = (t.bidsReceived || []).filter(b => b.auctionId === auctionId);

  bidsReceived.forEach(bid => {
    const size = normalizeSize([bid.width, bid.height]);

    payload['auctionData'].forEach(row => {
      if (row.bid === bid.requestId && row.aus === size) {
        row.brid = bid.requestId;
        row.ipwb = 1;
        row.bradv = bid.bidder;
        row.br_pb_mg = bid.cpm;
        row.cur = bid.currency;
        row.br_tr = bid.timeToRespond;
        row.brs = size;
      }
    });
  });

  // Prebid targeting wins
  const targetingWins = auctionManager.getBidsReceived()
    .filter(b => b.auctionId === auctionId && b.status === BID_STATUS.BID_TARGETING_SET);

  targetingWins.forEach(bid => {
    const size = normalizeSize(bid.size);

    payload['auctionData'].forEach(row => {
      if (row.bid === bid.requestId && row.aus === size) {
        row.ipwb = 1;
      }
    });
  });

  // Actual wins (FILTERED) - this will include prebid wins + any direct integrations
  const winningBids = auctionManager.getAllWinningBids()
    .filter(b => b.auctionId === auctionId);

  winningBids.forEach(bid => {
    const size = normalizeSize(bid.size);

    payload['auctionData'].forEach(row => {
      if (row.bid === bid.requestId && row.aus === size) {
        row.iwb = 1; row.ipwb = 1;
      }
    });
  });

  // Handle any wins recorded via onBidWon (for direct integrations or if auctionManager misses any)
  if (payload._wins && payload._wins[auctionId]) {
    payload._wins[auctionId].forEach(w => {
      payload['auctionData'].forEach(row => {
        if (row.bid === w.requestId && row.aus === w.size) {
          row.iwb = 1; row.ipwb = 1;
        }
      });
    });
  }

  // Timeout + NoBid
  payload['auctionData'].forEach(row => {
    timeoutData.to.forEach(t => {
      if (row.bid === t.bidId) row.ito = 1;
    });

    timeoutData.nb.forEach(n => {
      if (row.bid === n.bidId && row.bidadv === n.bidder) {
        row.inb = 1;
      }
    });
  });
  return payload;
};

ascAdapter.sendPayload = function (data) {
  // remove internal helper state
  if (data._wins) {
    delete data._wins;
  }

  if (window.sType !== undefined && window.sType !== null && window.sType !== '') {
    data.auctionData.forEach(item => {
      if (item.bidadv && !item.bidadv.endsWith(`_${window.sType}`)) {
        item.bidadv = `${item.bidadv}_${window.sType}`;
      }
    });
  }

  _logInfo('payload: ', JSON.stringify(data));

  var obj = { 'records': [{ 'value': data }] };
  let strJSON = JSON.stringify(obj);
  sendDataOnKf(strJSON);
};

function sendDataOnKf(dataObj) {
  ajax(DEFAULT_EVENT_URL, {
    success: function () {
      _logInfo('send data success');
    },
    error: function (e) {
      _logInfo('send data error', e);
    }
  }, dataObj, {
    contentType: 'application/vnd.kafka.json.v2+json',
    method: 'POST',
    withCredentials: true
  });
}

adapterManager.registerAnalyticsAdapter({
  adapter: ascAdapter,
  code: MODULE_CODE,
});

function _logInfo(message, meta) {
  logInfo(buildLogMessage(message), meta);
}

function _logError(message) {
  logError(buildLogMessage(message));
}

function buildLogMessage(message) {
  return 'Bydata Prebid Analytics ' + versionCode + ':' + message;
}

export default ascAdapter;
