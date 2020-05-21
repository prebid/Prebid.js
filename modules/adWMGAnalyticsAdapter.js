import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
const analyticsType = 'endpoint';
const url = 'https://analytics.wmgroup.us/analytic/collection';
const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_WON,
    BID_TIMEOUT,
    NO_BID,
    BID_RESPONSE
  }
} = CONSTANTS;

let timestampInit = null;

let noBidArray = [];
let noBidObject = {};

let isBidArray = [];
let isBidObject = {};

let bidTimeOutArray = [];
let bidTimeOutObject = {};

let bidWonArray = [];
let bidWonObject = {};

let initOptions = {};

function postAjax(url, data) {
  ajax(url, function () {}, data, {contentType: 'application/json', method: 'POST'});
}

function handleInitSizes(adUnits) {
  return adUnits.map(function (adUnit) {
    return adUnit.sizes.toString() || ''
  });
}

function handleInitTypes(adUnits) {
  return adUnits.map(function (adUnit) {
    return Object.keys(adUnit.mediaTypes).toString();
  });
}

function detectDevice() {
  if (
    /ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(
      navigator.userAgent.toLowerCase()
    )
  ) {
    return 'tablet';
  }
  if (
    /iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
      navigator.userAgent.toLowerCase()
    )
  ) {
    return 'mobile';
  }
  return 'desktop';
}

function detectOsAndBrowser() {
  var module = {
    options: [],
    header: [navigator.platform, navigator.userAgent, navigator.appVersion, navigator.vendor, window.opera],
    dataos: [
      {
        name: 'Windows Phone',
        value: 'Windows Phone',
        version: 'OS'
      },
      {
        name: 'Windows',
        value: 'Win',
        version: 'NT'
      },
      {
        name: 'iOS',
        value: 'iPhone',
        version: 'OS'
      },
      {
        name: 'iOS',
        value: 'iPad',
        version: 'OS'
      },
      {
        name: 'Kindle',
        value: 'Silk',
        version: 'Silk'
      },
      {
        name: 'Android',
        value: 'Android',
        version: 'Android'
      },
      {
        name: 'PlayBook',
        value: 'PlayBook',
        version: 'OS'
      },
      {
        name: 'BlackBerry',
        value: 'BlackBerry',
        version: '/'
      },
      {
        name: 'Macintosh',
        value: 'Mac',
        version: 'OS X'
      },
      {
        name: 'Linux',
        value: 'Linux',
        version: 'rv'
      },
      {
        name: 'Palm',
        value: 'Palm',
        version: 'PalmOS'
      }
    ],
    databrowser: [
      {
        name: 'Yandex Browser',
        value: 'YaBrowser',
        version: 'YaBrowser'
      },
      {
        name: 'Opera Mini',
        value: 'Opera Mini',
        version: 'Opera Mini'
      },
      {
        name: 'Amigo',
        value: 'Amigo',
        version: 'Amigo'
      },
      {
        name: 'Atom',
        value: 'Atom',
        version: 'Atom'
      },
      {
        name: 'Opera',
        value: 'OPR',
        version: 'OPR'
      },
      {
        name: 'Edge',
        value: 'Edge',
        version: 'Edge'
      },
      {
        name: 'Internet Explorer',
        value: 'Trident',
        version: 'rv'
      },
      {
        name: 'Chrome',
        value: 'Chrome',
        version: 'Chrome'
      },
      {
        name: 'Firefox',
        value: 'Firefox',
        version: 'Firefox'
      },
      {
        name: 'Safari',
        value: 'Safari',
        version: 'Version'
      },
      {
        name: 'Internet Explorer',
        value: 'MSIE',
        version: 'MSIE'
      },
      {
        name: 'Opera',
        value: 'Opera',
        version: 'Opera'
      },
      {
        name: 'BlackBerry',
        value: 'CLDC',
        version: 'CLDC'
      },
      {
        name: 'Mozilla',
        value: 'Mozilla',
        version: 'Mozilla'
      }
    ],
    init: function () {
      var agent = this.header.join(' ');
      var os = this.matchItem(agent, this.dataos);
      var browser = this.matchItem(agent, this.databrowser);

      return {
        os: os,
        browser: browser
      };
    },

    getVersion: function (name, version) {
      if (name === 'Windows') {
        switch (parseFloat(version).toFixed(1)) {
          case '5.0':
            return '2000';
          case '5.1':
            return 'XP';
          case '5.2':
            return 'Server 2003';
          case '6.0':
            return 'Vista';
          case '6.1':
            return '7';
          case '6.2':
            return '8';
          case '6.3':
            return '8.1';
          default:
            return parseInt(version) || 'other';
        }
      } else return parseInt(version) || 'other';
    },

    matchItem: function (string, data) {
      var i = 0;
      var j = 0;
      var regex, regexv, match, matches, version;

      for (i = 0; i < data.length; i += 1) {
        regex = new RegExp(data[i].value, 'i');
        match = regex.test(string);
        if (match) {
          regexv = new RegExp(data[i].version + '[- /:;]([\\d._]+)', 'i');
          matches = string.match(regexv);
          version = '';
          if (matches) {
            if (matches[1]) {
              matches = matches[1];
            }
          }
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
            version = 'other';
          }
          return {
            name: data[i].name,
            version: this.getVersion(data[i].name, version)
          };
        }
      }
      return {
        name: 'unknown',
        version: 'other'
      };
    }
  };

  var e = module.init();

  var result = {};
  result.os = e.os.name + ' ' + e.os.version;
  result.browser = e.browser.name + ' ' + e.browser.version;
  return result;
}

function handleAuctionInit(eventType, args) {
  initOptions.c_timeout = args.timeout;
  initOptions.ad_unit_size = handleInitSizes(args.adUnits);
  initOptions.ad_unit_type = handleInitTypes(args.adUnits);
  initOptions.device = detectDevice();
  initOptions.os = detectOsAndBrowser().os;
  initOptions.browser = detectOsAndBrowser().browser;
  timestampInit = args.timestamp;
}

function parseBidType(mediaTypes, mediaType) {
  if (!mediaTypes) {
    return [mediaType];
  } else {
    return Object.keys(mediaTypes) || [''];
  }
}

function parseSizes(sizes, width, height) {
  if (sizes !== undefined) {
    return sizes.map(s => {
      return s.toString();
    });
  } else {
    return [`${width},${height}`];
  }
}

function mapObject({
  bidder,
  adUnitCode,
  auctionId,
  transactionId,
  sizes,
  size,
  mediaTypes,
  mediaType,
  cpm,
  currency,
  originalCpm,
  originalCurrency,
  height,
  width
}) {
  return {
    bidder: bidder,
    auction_id: auctionId,
    ad_unit_code: adUnitCode,
    transaction_id: transactionId || '',
    bid_size: size || sizes || (width && height !== undefined) ? parseSizes(sizes, width, height) : [''],
    bid_type: mediaType || mediaTypes ? parseBidType(mediaTypes, mediaType) : [''],
    time_ms: Date.now() - timestampInit,
    cur: originalCurrency !== undefined ? originalCurrency : (currency || ''),
    price: cpm !== undefined ? cpm.toString().substring(0, 4) : '',
    cur_native: originalCurrency || '',
    price_native: originalCpm !== undefined ? originalCpm.toString().substring(0, 4) : ''
  };
}

function mapUpLevelObject(object, eventType, array) {
  Object.assign(object, {
    status: eventType || '',
    bids: array || []
  });
}

function handleEvent(array, object, eventType, args) {
  array.push(mapObject(args));
  mapUpLevelObject(object, eventType, array);
}

function handleNoBid(eventType, args) {
  handleEvent(noBidArray, noBidObject, eventType, args);
}

function handleBidResponse(eventType, args) {
  handleEvent(isBidArray, isBidObject, eventType, args);
}

function handleBidTimeout(eventType, args) {
  args.forEach(bid => {
    bidTimeOutArray.push(mapObject(bid));
  });
  mapUpLevelObject(bidTimeOutObject, eventType, bidTimeOutArray);
}

function handleBidWon(eventType, args) {
  handleEvent(bidWonArray, bidWonObject, eventType, args);
  sendRequest(bidWonObject);
}

function handleBidRequested(args) {}

function sendRequest(...objects) {
  let obj = {
    publisher_id: initOptions.publisher_id.toString() || '',
    site: initOptions.site || '',
    ad_unit_size: initOptions.ad_unit_size || [''],
    ad_unit_type: initOptions.ad_unit_type || [''],
    device: initOptions.device || '',
    os: initOptions.os || '',
    browser: initOptions.browser || '',
    c_timeout: initOptions.c_timeout || 0,
    events: Object.keys(objects).length ? objects : []
  };
  postAjax(url, JSON.stringify(obj));
}

function handleAuctionEnd() {
  sendRequest(noBidObject, isBidObject, bidTimeOutObject);
}

let adWMGAnalyticsAdapter = Object.assign(adapter({
  url,
  analyticsType
}), {
  track({
    eventType,
    args
  }) {
    switch (eventType) {
      case AUCTION_INIT:
        handleAuctionInit(eventType, args);
        break;
      case BID_REQUESTED:
        handleBidRequested(args);
        break;
      case BID_RESPONSE:
        handleBidResponse(eventType, args);
        break;
      case NO_BID:
        handleNoBid(eventType, args);
        break;
      case BID_TIMEOUT:
        handleBidTimeout(eventType, args);
        break;
      case BID_WON:
        handleBidWon(eventType, args);
        break;
      case AUCTION_END:
        handleAuctionEnd();
    }
  }
});

adWMGAnalyticsAdapter.originEnableAnalytics = adWMGAnalyticsAdapter.enableAnalytics;

adWMGAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  adWMGAnalyticsAdapter.originEnableAnalytics(config);
};
adapterManager.registerAnalyticsAdapter({
  adapter: adWMGAnalyticsAdapter,
  code: 'adWMG'
});
export default adWMGAnalyticsAdapter;
