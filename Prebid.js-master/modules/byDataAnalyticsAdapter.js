import { deepClone, logInfo, logError } from '../src/utils.js';
import Base64 from 'crypto-js/enc-base64';
import hmacSHA512 from 'crypto-js/hmac-sha512';
import enc from 'crypto-js/enc-utf8';
import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import { ajax } from '../src/ajax.js';

const secretKey = 'bydata@123456';
const { EVENTS: { NO_BID, BID_TIMEOUT, AUCTION_END } } = CONSTANTS;
const DEFAULT_EVENT_URL = 'https://pbjs-stream.bydata.com/topics/prebid';
const analyticsType = 'endpoint';
var payload = {};
var bdNbTo = { 'to': [], 'nb': [] };
let initOptions = {};

function onBidTimeout(t) {
  if (payload['visitor_data'] && t && t.length > 0) {
    bdNbTo['to'] = t;
  }
}

function onNoBidData(t) {
  if (payload['visitor_data'] && t) {
    bdNbTo['nb'].push(t);
  }
}

function onAuctionEnd(t) {
  _logInfo('onAuctionEnd', t);
  const {isCorrectOption, logFrequency} = initOptions;
  var value = Math.floor(Math.random() * 10000 + 1);
  _logInfo(' value - frequency ', (value + '-' + logFrequency));
  setTimeout(() => {
    if (isCorrectOption && value < logFrequency) {
      ascAdapter.dataProcess(t);
      addKeyForPrebidWinningAndWinningsBids();
      ascAdapter.sendPayload();
    }
  }, 500);
}

const ascAdapter = Object.assign(adapter({ url: DEFAULT_EVENT_URL, analyticsType: analyticsType }), {
  track({ eventType, args }) {
    switch (eventType) {
      case NO_BID:
        onNoBidData(args);
        break;
      case BID_TIMEOUT:
        onBidTimeout(args);
        break;
      case AUCTION_END:
        onAuctionEnd(args);
        break;
      default:
        break;
    }
  }
});

// save the base class function
ascAdapter.originEnableAnalytics = ascAdapter.enableAnalytics;
// override enableAnalytics so we can get access to the config passed in from the page
ascAdapter.enableAnalytics = function(config) {
  if (this.initConfig(config)) {
    _logInfo('initiated:', initOptions);
    initOptions.isCorrectOption && ascAdapter.getVisitorData();
    ascAdapter.originEnableAnalytics(config);
  }
};

ascAdapter.initConfig = function (config) {
  let isCorrectOption = true;
  initOptions = {};
  _logInfo('initConfig', config);
  initOptions.options = deepClone(config.options);
  initOptions.clientId = initOptions.options.clientId || null;
  initOptions.logFrequency = initOptions.options.logFrequency;
  if (!initOptions.clientId) {
    _logError('"options.clientId" should not empty!!');
    isCorrectOption = false;
  }
  initOptions.isCorrectOption = isCorrectOption;
  this.initOptions = initOptions;
  return isCorrectOption;
};

ascAdapter.getVisitorData = function(data = {}) {
  var ua = data.userId ? data : {};
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
      var hex = Array.prototype.map.call(new Uint8Array(buffer), function(x) {
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
  const {clientId} = initOptions;
  var userId = window.localStorage.getItem('userId');
  if (!userId) {
    userId = generateUid();
    window.localStorage.setItem('userId', userId);
  }
  var screenSize = {width: window.screen.width, height: window.screen.height};
  var deviceType = window.navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i) ? 'Mobile' : 'Desktop';
  var e = module.init();
  if (!ua['userId']) {
    ua['userId'] = userId;
    ua['client_id'] = clientId;
    ua['plateform_name'] = e.os.name;
    ua['os_version'] = e.os.version;
    ua['browser_name'] = e.browser.name;
    ua['browser_version'] = e.browser.version;
    ua['screen_size'] = screenSize;
    ua['device_type'] = deviceType;
    ua['time_zone'] = window.Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  var signedToken = getJWToken(ua);
  payload['visitor_data'] = signedToken;
  return signedToken;
}

ascAdapter.dataProcess = function(t) {
  payload['auction_id'] = t.auctionId;
  payload['auction_start'] = t.timestamp;
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
    const {requestId, bidder, width, height, cpm, currency, timeToRespond, adUnitCode} = bid;
    bidsReceivedData.push({requestId, bidder, width, height, cpm, currency, timeToRespond, adUnitCode});
  });
  bidderRequestsData.length > 0 && bidderRequestsData.forEach(bdObj => {
    var bdsArray = bdObj['bids'];
    bdsArray.forEach(bid => {
      const {adUnitCode, sizes, bidder, bidId, mediaTypes} = bid;
      sizes.forEach(size => {
        var sstr = size[0] + 'x' + size[1]
        payload['auctionData'].push({adUnit: adUnitCode, size: sstr, media_type: mediaTypes[0], bids_bidder: bidder, bids_bid_id: bidId});
      });
    });
  });
  bidsReceivedData.length > 0 && bidsReceivedData.forEach(bdRecived => {
    const {requestId, bidder, width, height, cpm, currency, timeToRespond} = bdRecived;
    payload['auctionData'].forEach(rwData => {
      if (rwData['bids_bid_id'] === requestId && rwData['size'] === width + 'x' + height) {
        rwData['br_request_id'] = requestId; rwData['br_bidder'] = bidder; rwData['br_pb_mg'] = cpm;
        rwData['br_currency'] = currency; rwData['br_time_to_respond'] = timeToRespond; rwData['br_size'] = width + 'x' + height;
      }
    })
  });
  payload['auctionData'] && payload['auctionData'].length > 0 && payload['auctionData'].forEach(u => {
    bdNbTo['to'].forEach(i => {
      if (u.bids_bid_id === i.bidId) u.is_timeout = 1;
    });
    bdNbTo['nb'].forEach(i => {
      if (u.adUnit === i.adUnitCode && u.bids_bidder === i.bidder && u.bids_bid_id === i.bidId) { u.is_nobid = 1; }
    })
  });
  return payload;
}

ascAdapter.sendPayload = function () {
  var obj = { 'records': [ { 'value': payload } ] };
  let strJSON = JSON.stringify(obj);
  _logInfo(' sendPayload ', JSON.stringify(obj));
  ajax(DEFAULT_EVENT_URL, undefined, strJSON, {
    contentType: 'application/vnd.kafka.json.v2+json',
    method: 'POST',
    withCredentials: true
  });
}

function addKeyForPrebidWinningAndWinningsBids() {
  var prebidWinningBids = $$PREBID_GLOBAL$$.getAllPrebidWinningBids();
  var winningBids = $$PREBID_GLOBAL$$.getAllWinningBids();
  prebidWinningBids && prebidWinningBids.length > 0 && prebidWinningBids.forEach(pbbid => {
    payload['auctionData'] && payload['auctionData'].forEach(rwData => {
      if (rwData['bids_bid_id'] === pbbid.requestId && rwData['br_size'] === pbbid.size) {
        rwData['is_prebid_winning_bid'] = 1;
      }
    });
  })
  winningBids && winningBids.length > 0 && winningBids.forEach(wBid => {
    payload['auctionData'] && payload['auctionData'].forEach(rwData => {
      if (rwData['bids_bid_id'] === wBid.requestId && rwData['br_size'] === wBid.size) {
        rwData['is_winning_bid'] = 1;
      }
    });
  })
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
  return 'Bydata Prebid Analytics: ' + message;
}

export default ascAdapter;
