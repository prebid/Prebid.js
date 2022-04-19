import { logError, logInfo } from '../src/utils.js';
import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adaptermanager from '../src/adapterManager.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';

export const storage = getStorageManager();

/**
 * Analytics adapter for - https://liveramp.com
 * Maintainer - prebid@liveramp.com
 */

const analyticsType = 'endpoint';

const preflightUrl = 'https://check.analytics.rlcdn.com/check/';
export const analyticsUrl = 'https://analytics.rlcdn.com';

let handlerRequest = [];
let handlerResponse = [];

let atsAnalyticsAdapterVersion = 3;

let browsersList = [
  /* Googlebot */
  {
    test: /googlebot/i,
    name: 'Googlebot'
  },

  /* Opera < 13.0 */
  {
    test: /opera/i,
    name: 'Opera',
  },

  /* Opera > 13.0 */
  {
    test: /opr\/|opios/i,
    name: 'Opera'
  },
  {
    test: /SamsungBrowser/i,
    name: 'Samsung Internet for Android',
  },
  {
    test: /Whale/i,
    name: 'NAVER Whale Browser',
  },
  {
    test: /MZBrowser/i,
    name: 'MZ Browser'
  },
  {
    test: /focus/i,
    name: 'Focus',
  },
  {
    test: /swing/i,
    name: 'Swing',
  },
  {
    test: /coast/i,
    name: 'Opera Coast',
  },
  {
    test: /opt\/\d+(?:.?_?\d+)+/i,
    name: 'Opera Touch',
  },
  {
    test: /yabrowser/i,
    name: 'Yandex Browser',
  },
  {
    test: /ucbrowser/i,
    name: 'UC Browser',
  },
  {
    test: /Maxthon|mxios/i,
    name: 'Maxthon',
  },
  {
    test: /epiphany/i,
    name: 'Epiphany',
  },
  {
    test: /puffin/i,
    name: 'Puffin',
  },
  {
    test: /sleipnir/i,
    name: 'Sleipnir',
  },
  {
    test: /k-meleon/i,
    name: 'K-Meleon',
  },
  {
    test: /micromessenger/i,
    name: 'WeChat',
  },
  {
    test: /qqbrowser/i,
    name: (/qqbrowserlite/i).test(window.navigator.userAgent) ? 'QQ Browser Lite' : 'QQ Browser',
  },
  {
    test: /msie|trident/i,
    name: 'Internet Explorer',
  },
  {
    test: /\sedg\//i,
    name: 'Microsoft Edge',
  },
  {
    test: /edg([ea]|ios)/i,
    name: 'Microsoft Edge',
  },
  {
    test: /vivaldi/i,
    name: 'Vivaldi',
  },
  {
    test: /seamonkey/i,
    name: 'SeaMonkey',
  },
  {
    test: /sailfish/i,
    name: 'Sailfish',
  },
  {
    test: /silk/i,
    name: 'Amazon Silk',
  },
  {
    test: /phantom/i,
    name: 'PhantomJS',
  },
  {
    test: /slimerjs/i,
    name: 'SlimerJS',
  },
  {
    test: /blackberry|\bbb\d+/i,
    name: 'BlackBerry',
  },
  {
    test: /(web|hpw)[o0]s/i,
    name: 'WebOS Browser',
  },
  {
    test: /bada/i,
    name: 'Bada',
  },
  {
    test: /tizen/i,
    name: 'Tizen',
  },
  {
    test: /qupzilla/i,
    name: 'QupZilla',
  },
  {
    test: /firefox|iceweasel|fxios/i,
    name: 'Firefox',
  },
  {
    test: /electron/i,
    name: 'Electron',
  },
  {
    test: /MiuiBrowser/i,
    name: 'Miui',
  },
  {
    test: /chromium/i,
    name: 'Chromium',
  },
  {
    test: /chrome|crios|crmo/i,
    name: 'Chrome',
  },
  {
    test: /GSA/i,
    name: 'Google Search',
  },

  /* Android Browser */
  {
    test: /android/i,
    name: 'Android Browser',
  },

  /* PlayStation 4 */
  {
    test: /playstation 4/i,
    name: 'PlayStation 4',
  },

  /* Safari */
  {
    test: /safari|applewebkit/i,
    name: 'Safari',
  },
];

let listOfSupportedBrowsers = ['Safari', 'Chrome', 'Firefox', 'Microsoft Edge'];

function bidRequestedHandler(args) {
  let envelopeSourceCookieValue = storage.getCookie('_lr_env_src_ats');
  let envelopeSource = envelopeSourceCookieValue === 'true';
  let requests;
  requests = args.bids.map(function(bid) {
    return {
      envelope_source: envelopeSource,
      has_envelope: bid.userId ? !!bid.userId.idl_env : false,
      bidder: bid.bidder,
      bid_id: bid.bidId,
      auction_id: args.auctionId,
      user_browser: parseBrowser(),
      user_platform: navigator.platform,
      auction_start: new Date(args.auctionStart).toJSON(),
      domain: window.location.hostname,
      pid: atsAnalyticsAdapter.context.pid,
      adapter_version: atsAnalyticsAdapterVersion,
      bid_won: false
    };
  });
  return requests;
}

function bidResponseHandler(args) {
  return {
    bid_id: args.requestId,
    response_time_stamp: new Date(args.responseTimestamp).toJSON(),
    currency: args.currency,
    cpm: args.cpm,
    net_revenue: args.netRevenue
  };
}

export function parseBrowser() {
  let ua = atsAnalyticsAdapter.getUserAgent();
  try {
    let result = browsersList.filter(function(obj) {
      return obj.test.test(ua);
    });
    let browserName = result && result.length ? result[0].name : '';
    return (listOfSupportedBrowsers.indexOf(browserName) >= 0) ? browserName : 'Unknown';
  } catch (err) {
    logError('ATS Analytics - Error while checking user browser!', err);
  }
}

function sendDataToAnalytic (events) {
  // send data to ats analytic endpoint
  try {
    let dataToSend = {'Data': events};
    let strJSON = JSON.stringify(dataToSend);
    logInfo('ATS Analytics - tried to send analytics data!');
    ajax(analyticsUrl, function () {
      logInfo('ATS Analytics - events sent successfully!');
    }, strJSON, {method: 'POST', contentType: 'application/json'});
  } catch (err) {
    logError('ATS Analytics - request encounter an error: ', err);
  }
}

// preflight request, to check did publisher have permission to send data to analytics endpoint
function preflightRequest (envelopeSourceCookieValue, events) {
  logInfo('ATS Analytics - preflight request!');
  ajax(preflightUrl + atsAnalyticsAdapter.context.pid,
    {
      success: function (data) {
        let samplingRateObject = JSON.parse(data);
        logInfo('ATS Analytics - Sampling Rate: ', samplingRateObject);
        let samplingRate = samplingRateObject.samplingRate;
        atsAnalyticsAdapter.setSamplingCookie(samplingRate);
        let samplingRateNumber = Number(samplingRate);
        if (data && samplingRate && atsAnalyticsAdapter.shouldFireRequest(samplingRateNumber) && envelopeSourceCookieValue != null) {
          logInfo('ATS Analytics - events to send: ', events);
          sendDataToAnalytic(events);
        }
      },
      error: function () {
        atsAnalyticsAdapter.setSamplingCookie(0);
        logInfo('ATS Analytics - Sampling Rate Request Error!');
      }
    }, undefined, {method: 'GET', crossOrigin: true});
}

let atsAnalyticsAdapter = Object.assign(adapter(
  {
    analyticsType
  }),
{
  track({eventType, args}) {
    if (typeof args !== 'undefined') {
      atsAnalyticsAdapter.callHandler(eventType, args);
    }
  }
});

// save the base class function
atsAnalyticsAdapter.originEnableAnalytics = atsAnalyticsAdapter.enableAnalytics;

// add check to not fire request every time, but instead to send 1/100
atsAnalyticsAdapter.shouldFireRequest = function (samplingRate) {
  if (samplingRate !== 0) {
    let shouldFireRequestValue = (Math.floor((Math.random() * 100 + 1)) === 100);
    logInfo('ATS Analytics - Should Fire Request: ', shouldFireRequestValue);
    return shouldFireRequestValue;
  } else {
    logInfo('ATS Analytics - Should Fire Request: ', false);
    return false;
  }
};

atsAnalyticsAdapter.getUserAgent = function () {
  return window.navigator.userAgent;
};

atsAnalyticsAdapter.setSamplingCookie = function (samplRate) {
  const now = new Date();
  now.setTime(now.getTime() + 86400000);
  storage.setCookie('_lr_sampling_rate', samplRate, now.toUTCString());
}

// override enableAnalytics so we can get access to the config passed in from the page
atsAnalyticsAdapter.enableAnalytics = function (config) {
  if (!config.options.pid) {
    logError('ATS Analytics - Publisher ID (pid) option is not defined. Analytics won\'t work');
    return;
  }
  atsAnalyticsAdapter.context = {
    events: [],
    pid: config.options.pid,
    bidWonTimeout: config.options.bidWonTimeout
  };
  let initOptions = config.options;
  logInfo('ATS Analytics - adapter enabled! ');
  atsAnalyticsAdapter.originEnableAnalytics(initOptions); // call the base class function
};

atsAnalyticsAdapter.callHandler = function (evtype, args) {
  if (evtype === CONSTANTS.EVENTS.BID_REQUESTED) {
    handlerRequest = handlerRequest.concat(bidRequestedHandler(args));
  } else if (evtype === CONSTANTS.EVENTS.BID_RESPONSE) {
    handlerResponse.push(bidResponseHandler(args));
  }
  if (evtype === CONSTANTS.EVENTS.AUCTION_END) {
    let bidWonTimeout = atsAnalyticsAdapter.context.bidWonTimeout ? atsAnalyticsAdapter.context.bidWonTimeout : 2000;
    let events = [];
    setTimeout(() => {
      let winningBids = $$PREBID_GLOBAL$$.getAllWinningBids();
      logInfo('ATS Analytics - winning bids: ', winningBids)
      // prepare format data for sending to analytics endpoint
      if (handlerRequest.length) {
        let wonEvent = {};
        if (handlerResponse.length) {
          events = handlerRequest.filter(request => handlerResponse.filter(function (response) {
            if (request.bid_id === response.bid_id) {
              Object.assign(request, response);
            }
          }));
          if (winningBids.length) {
            events = events.filter(event => winningBids.filter(function (won) {
              wonEvent.bid_id = won.requestId;
              wonEvent.bid_won = true;
              if (event.bid_id === wonEvent.bid_id) {
                Object.assign(event, wonEvent);
              }
            }))
          }
        } else {
          events = handlerRequest;
        }
        // check should we send data to analytics or not, check first cookie value _lr_sampling_rate
        try {
          let envelopeSourceCookieValue = storage.getCookie('_lr_env_src_ats');
          let samplingRateCookie = storage.getCookie('_lr_sampling_rate');
          if (!samplingRateCookie) {
            preflightRequest(envelopeSourceCookieValue, events);
          } else {
            if (atsAnalyticsAdapter.shouldFireRequest(parseInt(samplingRateCookie)) && envelopeSourceCookieValue != null) {
              logInfo('ATS Analytics - events to send: ', events);
              sendDataToAnalytic(events);
            }
          }
          // empty events array to not send duplicate events
          events = [];
        } catch (err) {
          logError('ATS Analytics - preflight request encounter an error: ', err);
        }
      }
    }, bidWonTimeout);
  }
}

adaptermanager.registerAnalyticsAdapter({
  adapter: atsAnalyticsAdapter,
  code: 'atsAnalytics',
  gvlid: 97
});

export default atsAnalyticsAdapter;
