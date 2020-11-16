import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adaptermanager from '../src/adapterManager.js';
import * as utils from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';

export const storage = getStorageManager();

const analyticsType = 'endpoint';

let handlerRequest = [];
let handlerResponse = [];
let host = '';

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
  let ua = window.navigator.userAgent;
  try {
    let result = browsersList.filter(obj => {
      return obj.test.test(ua);
    });
    let browserName = result && result.length ? result[0].name : '';
    // eslint-disable-next-line no-console
    console.log('Browser: ', result[0].name);
    let browserNameResult = listOfSupportedBrowsers.includes(browserName) ? browserName : 'Unknown';
    return browserNameResult;
  } catch (err) {
    utils.logError('Error while checking user browser!', err);
  }
}

function callHandler(evtype, args) {
  if (evtype === CONSTANTS.EVENTS.BID_REQUESTED) {
    handlerRequest = handlerRequest.concat(bidRequestedHandler(args));
  } else if (evtype === CONSTANTS.EVENTS.BID_RESPONSE) {
    handlerResponse.push(bidResponseHandler(args));
  }
  if (evtype === CONSTANTS.EVENTS.AUCTION_END) {
    if (handlerRequest.length) {
      let events = [];
      if (handlerResponse.length) {
        events = handlerRequest.filter(request => handlerResponse.filter(function(response) {
          if (request.bid_id === response.bid_id) {
            Object.assign(request, response);
          }
        }));
      } else {
        events = handlerRequest;
      }
      atsAnalyticsAdapter.context.events = events;
    }
  }
}

let atsAnalyticsAdapter = Object.assign(adapter(
  {
    host,
    analyticsType
  }),
{
  track({eventType, args}) {
    if (typeof args !== 'undefined') {
      callHandler(eventType, args);
    }
    if (eventType === CONSTANTS.EVENTS.AUCTION_END) {
      let envelopeSourceCookieValue = storage.getCookie('_lr_env_src_ats');
      // eslint-disable-next-line no-console
      console.log('Should Fire Request: ', atsAnalyticsAdapter.shouldFireRequest());
      // eslint-disable-next-line no-console
      console.log('envelopeSourceCookieValue: ', envelopeSourceCookieValue);
      // eslint-disable-next-line no-console
      console.log('Envelope Source check: ', envelopeSourceCookieValue != null);
      if (atsAnalyticsAdapter.shouldFireRequest() && envelopeSourceCookieValue != null) {
        // send data to ats analytic endpoint
        try {
          let dataToSend = {'Data': atsAnalyticsAdapter.context.events};
          let strJSON = JSON.stringify(dataToSend);
          utils.logInfo('atsAnalytics tried to send analytics data!');
          ajax(atsAnalyticsAdapter.context.host, function () {
          }, strJSON, {method: 'POST', contentType: 'application/json'});
        } catch (err) {
        }
      }
    }
  }
});

// save the base class function
atsAnalyticsAdapter.originEnableAnalytics = atsAnalyticsAdapter.enableAnalytics;

// add check to not fire request every time, but instead to send 1/10 events
atsAnalyticsAdapter.shouldFireRequest = function () {
  return (Math.floor((Math.random() * 11)) === 10);
}

// override enableAnalytics so we can get access to the config passed in from the page
atsAnalyticsAdapter.enableAnalytics = function (config) {
  if (!config.options.pid) {
    utils.logError('Publisher ID (pid) option is not defined. Analytics won\'t work');
    return;
  }

  if (!config.options.host) {
    utils.logError('Host option is not defined. Analytics won\'t work');
    return;
  }

  host = config.options.host;
  atsAnalyticsAdapter.context = {
    events: [],
    host: config.options.host,
    pid: config.options.pid
  };
  let initOptions = config.options;
  atsAnalyticsAdapter.originEnableAnalytics(initOptions); // call the base class function
};

adaptermanager.registerAnalyticsAdapter({
  adapter: atsAnalyticsAdapter,
  code: 'atsAnalytics',
  gvlid: 97
});

export default atsAnalyticsAdapter;
