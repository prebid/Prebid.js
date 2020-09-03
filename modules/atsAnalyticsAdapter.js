import adapter from '../src/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adaptermanager from '../src/adapterManager.js';
import * as utils from '../src/utils.js';
import {ajax} from '../src/ajax.js';

const analyticsType = 'endpoint';

let handlerRequest = [];
let handlerResponse = [];
let host = '';

function bidRequestedHandler(args) {
  let requests;
  requests = args.bids.map(function(bid) {
    return {
      has_envelope: bid.userId ? !!bid.userId.idl_env : false,
      bidder: bid.bidder,
      bid_id: bid.bidId,
      auction_id: args.auctionId,
      user_browser: checkUserBrowser(),
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

export function checkUserBrowser() {
  let firefox = browserIsFirefox();
  let chrome = browserIsChrome();
  let edge = browserIsEdge();
  let safari = browserIsSafari();
  if (firefox) {
    return firefox;
  } if (chrome) {
    return chrome;
  } if (edge) {
    return edge;
  } if (safari) {
    return safari;
  } else {
    return 'Unknown'
  }
}

export function browserIsFirefox() {
  if (typeof InstallTrigger !== 'undefined') {
    return 'Firefox';
  } else {
    return false;
  }
}

export function browserIsIE() {
  return !!document.documentMode;
}

export function browserIsEdge() {
  if (!browserIsIE() && !!window.StyleMedia) {
    return 'Edge';
  } else {
    return false;
  }
}

export function browserIsChrome() {
  if ((!!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime)) || (/Android/i.test(navigator.userAgent) && !!window.chrome)) {
    return 'Chrome';
  } else {
    return false;
  }
}

export function browserIsSafari() {
  if (window.safari !== undefined) {
    return 'Safari'
  } else {
    return false;
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
      // send data to ats analytic endpoint
      try {
        let dataToSend = {'Data': atsAnalyticsAdapter.context.events};
        let strJSON = JSON.stringify(dataToSend);
        ajax(atsAnalyticsAdapter.context.host, function () {
        }, strJSON, {method: 'POST', contentType: 'application/json'});
      } catch (err) {
      }
    }
  }
});

// save the base class function
atsAnalyticsAdapter.originEnableAnalytics = atsAnalyticsAdapter.enableAnalytics;

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
