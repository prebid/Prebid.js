import { deepClone, logInfo, logError } from '../src/utils.js';
import Base64 from 'crypto-js/enc-base64';
import hmacSHA512 from 'crypto-js/hmac-sha512';
import enc from 'crypto-js/enc-utf8';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import { getStorageManager } from '../src/storageManager.js';
import { auctionManager } from '../src/auctionManager.js';
import { ajax } from '../src/ajax.js';

const versionCode = '4.4.1'
const secretKey = 'bydata@123456'
const { EVENTS: { NO_BID, BID_TIMEOUT, AUCTION_END, AUCTION_INIT, BID_WON } } = CONSTANTS
const DEFAULT_EVENT_URL = 'https://pbjs-stream.bydata.com/topics/prebid'
const analyticsType = 'endpoint'
const isBydata = isKeyInUrl('bydata_debug')
const adunitsMap = {}
const storage = getStorageManager();
let initOptions = {}
var payload = {}
var winPayload = {}
var isDataSend = window.asc_data || false
var bdNbTo = { 'to': [], 'nb': [] }

/* method used for testing parameters */
function isKeyInUrl(name) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const param = urlParams.get(name)
  return param
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
  t.adUnits && t.adUnits.length && t.adUnits.forEach((adu) => {
    const { code, adunit } = adu
    adunitsMap[code] = adunit
  });
}

/* EVENT: bid timeout */
function onBidTimeout(t) {
  if (payload['visitor_data'] && t && t.length > 0) {
    bdNbTo['to'] = t
  }
}

/* EVENT: no bid */
function onNoBidData(t) {
  if (payload['visitor_data'] && t) {
    bdNbTo['nb'].push(t)
  }
}

/* EVENT: bid won */
function onBidWon(t) {
  const { isCorrectOption } = initOptions
  if (isCorrectOption && (isDataSend || isBydata)) {
    ascAdapter.getBidWonData(t)
    ascAdapter.sendPayload(winPayload)
  }
}

/* EVENT: auction end */
function onAuctionEnd(t) {
  const { isCorrectOption } = initOptions;
  setTimeout(() => {
    if (isCorrectOption && (isDataSend || isBydata)) {
      ascAdapter.dataProcess(t);
      ascAdapter.sendPayload(payload);
    }
  }, 500);
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
  var rndNum = Math.floor(Math.random() * 10000 + 1);
  initOptions.options = deepClone(config.options);
  initOptions.clientId = initOptions.options.clientId || null;
  initOptions.logFrequency = initOptions.options.logFrequency;
  if (!initOptions.clientId) {
    _logError('"options.clientId" should not empty!!');
    isCorrectOption = false;
  }
  if (rndNum <= initOptions.logFrequency) { window.asc_data = isDataSend = true; }
  initOptions.isCorrectOption = isCorrectOption;
  this.initOptions = initOptions;
  return isCorrectOption;
};

ascAdapter.getBidWonData = function(t) {
  const { auctionId, adUnitCode, size, requestId, bidder, timeToRespond, currency, mediaType, cpm } = t
  const aun = getAdunitName(adUnitCode)
  winPayload['aid'] = auctionId
  winPayload['as'] = '';
  winPayload['auctionData'] = [];
  var data = {}
  data['au'] = aun
  data['auc'] = adUnitCode
  data['aus'] = size
  data['bid'] = requestId
  data['bidadv'] = bidder
  data['br_pb_mg'] = cpm
  data['br_tr'] = timeToRespond
  data['bradv'] = bidder
  data['brid'] = requestId
  data['brs'] = size
  data['cur'] = currency
  data['inb'] = 0
  data['ito'] = 0
  data['ipwb'] = 1
  data['iwb'] = 1
  data['mt'] = mediaType
  winPayload['auctionData'].push(data)
  return winPayload
}

ascAdapter.getVisitorData = function (data = {}) {
  var ua = data.uid ? data : {};
  var module = {
    options: [],
    header: [window.navigator.platform, window.navigator.userAgent, window.navigator.appVersion, window.navigator.vendor, window.opera],
    dataos: [
      { name: 'Windows Phone', value: 'Windows Phone', version: 'OS' },
      { name: 'Windows', value: 'Win', version: 'NT' },
      { name: 'iPhone', value: 'iPhone', version: 'OS' },
      { name: 'iPad', value: 'iPad', version: 'OS' },
      { name: 'Kindle', value: 'Silk', version: 'Silk' },
      { name: 'Android', value: 'Android', version: 'Android' },
      { name: 'PlayBook', value: 'PlayBook', version: 'OS' },
      { name: 'BlackBerry', value: 'BlackBerry', version: '/' },
      { name: 'Macintosh', value: 'Mac', version: 'OS X' },
      { name: 'Linux', value: 'Linux', version: 'rv' },
      { name: 'Palm', value: 'Palm', version: 'PalmOS' }
    ],
    databrowser: [
      { name: 'Chrome', value: 'Chrome', version: 'Chrome' },
      { name: 'Firefox', value: 'Firefox', version: 'Firefox' },
      { name: 'Safari', value: 'Safari', version: 'Version' },
      { name: 'Internet Explorer', value: 'MSIE', version: 'MSIE' },
      { name: 'Opera', value: 'Opera', version: 'Opera' },
      { name: 'BlackBerry', value: 'CLDC', version: 'CLDC' },
      { name: 'Mozilla', value: 'Mozilla', version: 'Mozilla' }
    ],
    init: function () { var agent = this.header.join(' '); var os = this.matchItem(agent, this.dataos); var browser = this.matchItem(agent, this.databrowser); return { os: os, browser: browser }; },
    matchItem: function (string, data) {
      var i = 0; var j = 0; var regex; var regexv; var match; var matches; var version;
      for (i = 0; i < data.length; i += 1) {
        regex = new RegExp(data[i].value, 'i');
        match = regex.test(string);
        if (match) {
          regexv = new RegExp(data[i].version + '[- /:;]([\\d._]+)', 'i');
          matches = string.match(regexv);
          version = '';
          if (matches) { if (matches[1]) { matches = matches[1]; } }
          if (matches) {
            matches = matches.split(/[._]+/);
            for (j = 0; j < matches.length; j += 1) {
              if (j === 0) {
                version += matches[j] + '.';
              } else {
                version += matches[j];
              }
            }
          } else {
            version = '0';
          }
          return {
            name: data[i].name,
            version: parseFloat(version)
          };
        }
      }
      return { name: 'unknown', version: 0 };
    }
  };

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
    return window.screen.width || (window.innerWidth && document.documentElement.clientWidth) ? Math.min(window.innerWidth, document.documentElement.clientWidth) : window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
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
  var e = module.init();
  if (!ua['uid']) {
    ua['uid'] = userId;
    ua['cid'] = clientId;
    ua['pid'] = window.location.hostname;
    ua['os'] = e.os.name;
    ua['osv'] = e.os.version;
    ua['br'] = e.browser.name;
    ua['brv'] = e.browser.version;
    ua['ss'] = screenSize;
    ua['de'] = deviceType;
    ua['tz'] = window.Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  var signedToken = getJWToken(ua);
  payload['visitor_data'] = signedToken;
  winPayload['visitor_data'] = signedToken;
  return signedToken;
}

ascAdapter.dataProcess = function (t) {
  if (isBydata) { payload['bydata_debug'] = 'true'; }
  _logInfo('fulldata - ', t);
  payload['aid'] = t.auctionId;
  payload['as'] = t.timestamp;
  payload['auctionData'] = [];
  var bidderRequestsData = []; var bidsReceivedData = [];
  t.bidderRequests && t.bidderRequests.forEach(bidReq => {
    var pObj = {}; pObj['bids'] = [];
    bidReq.bids.forEach(bid => {
      var data = {};
      data['adUnitCode'] = bid.adUnitCode;
      data['sizes'] = bid.sizes;
      data['bidder'] = bid.bidder;
      data['bidId'] = bid.bidId;
      data['mediaTypes'] = [];
      var mt = bid.mediaTypes.banner ? 'display' : 'video';
      data['mediaTypes'].push(mt);
      pObj['bids'].push(data);
    })
    bidderRequestsData.push(pObj);
  });
  t.bidsReceived && t.bidsReceived.forEach(bid => {
    const { requestId, bidder, width, height, cpm, currency, timeToRespond, adUnitCode } = bid;
    bidsReceivedData.push({ requestId, bidder, width, height, cpm, currency, timeToRespond, adUnitCode });
  });
  bidderRequestsData.length > 0 && bidderRequestsData.forEach(bdObj => {
    var bdsArray = bdObj['bids'];
    bdsArray.forEach(bid => {
      const { adUnitCode, sizes, bidder, bidId, mediaTypes } = bid;
      sizes.forEach(size => {
        var sstr = size[0] + 'x' + size[1]
        payload['auctionData'].push({ au: getAdunitName(adUnitCode), auc: adUnitCode, aus: sstr, mt: mediaTypes[0], bidadv: bidder, bid: bidId, inb: 0, ito: 0, ipwb: 0, iwb: 0 });
      });
    });
  });

  bidsReceivedData.length > 0 && bidsReceivedData.forEach(bdRecived => {
    const { requestId, bidder, width, height, cpm, currency, timeToRespond } = bdRecived;
    payload['auctionData'].forEach(rwData => {
      if (rwData['bid'] === requestId && rwData['aus'] === width + 'x' + height) {
        rwData['brid'] = requestId; rwData['bradv'] = bidder; rwData['br_pb_mg'] = cpm;
        rwData['cur'] = currency; rwData['br_tr'] = timeToRespond; rwData['brs'] = width + 'x' + height;
      }
    })
  });

  var prebidWinningBids = auctionManager.getBidsReceived().filter(bid => bid.status === CONSTANTS.BID_STATUS.BID_TARGETING_SET);
  prebidWinningBids && prebidWinningBids.length > 0 && prebidWinningBids.forEach(pbbid => {
    payload['auctionData'] && payload['auctionData'].forEach(rwData => {
      if (rwData['bid'] === pbbid.requestId && rwData['brs'] === pbbid.size) {
        rwData['ipwb'] = 1;
      }
    });
  })

  var winningBids = auctionManager.getAllWinningBids();
  winningBids && winningBids.length > 0 && winningBids.forEach(wBid => {
    payload['auctionData'] && payload['auctionData'].forEach(rwData => {
      if (rwData['bid'] === wBid.requestId && rwData['brs'] === wBid.size) {
        rwData['iwb'] = 1;
      }
    });
  })

  payload['auctionData'] && payload['auctionData'].length > 0 && payload['auctionData'].forEach(u => {
    bdNbTo['to'].forEach(i => {
      if (u.bid === i.bidId) u.ito = 1;
    });
    bdNbTo['nb'].forEach(i => {
      if (u.bidadv === i.bidder && u.bid === i.bidId) { u.inb = 1; }
    })
  });
  return payload;
}

ascAdapter.sendPayload = function (data) {
  var obj = { 'records': [{ 'value': data }] };
  let strJSON = JSON.stringify(obj);
  sendDataOnKf(strJSON);
}

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
  code: 'bydata'
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
