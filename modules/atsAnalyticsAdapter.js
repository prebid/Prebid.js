import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adaptermanager from '../src/adapterManager';
import * as utils from '../src/utils';
import {ajax} from '../src/ajax';

const analyticsType = 'endpoint';
let userAgent = navigator.platform + ', ' + (browserIsFirefox() || browserIsEdge() || browserIsChrome() || browserIsSafari());

let handlerRequest = [];
let handlerResponse = [];
let events = [];
let host = '';

function bidRequestedHandler(args) {
  let requests;
  requests = args.bids.map(function(bid) {
    return {
      has_envelope: bid.userId ? !!bid.userId.idl_env : false,
      bidder: bid.bidder,
      bid_id: bid.bidId,
      auctionId: args.auctionId,
      userAgent: userAgent,
      auctionStart: new Date(args.auctionStart).toJSON(),
      domain: args.refererInfo.referer,
      pid: atsAnalytics.context.pid,
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
    netRevenue: args.netRevenue
  };
}

export function browserIsFirefox() {
  if (typeof InstallTrigger !== 'undefined') {
    return 'Firefox';
  } else {
    return false;
  }
}

export function browserIsIE() {
  return /* @cc_on!@ */false || !!document.documentMode;
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
  if (navigator.vendor.includes('Apple')) {
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
      if (handlerResponse.length) {
        events = handlerRequest.filter(request => handlerResponse.filter(function(response) {
          if (request.bid_id === response.bid_id) {
            Object.assign(request, response);
          }
        }));
        // console.log(result);
        /* handlerRequest.forEach(function (request) {
          handlerResponse.forEach(function (response) {
            if (request.bid_id === response.bid_id) {
              let event = Object.assign(request, response);
              events.push(event);
            } else {
              events.push(request);
            }
          })
        }); */
      } else {
        events = handlerRequest;
      }
      // let uniqueEvents = [...new Set(events)];
      let dataToSend = {'Data': events};
      console.log('Events to send: ', dataToSend);
      // send data to ats analytic endpoint
      try {
        let strJSON = JSON.stringify(dataToSend);
        ajax(atsAnalytics.context.host, function() {}, strJSON, {method: 'POST', contentType: 'application/json'});
      } catch (err) {}
    }
  }
}

let atsAnalytics = Object.assign(adapter(
  {
    host,
    analyticsType
  }),
{
  track({eventType, args}) {
    if (typeof args !== 'undefined') {
      callHandler(eventType, args);
    }
  }
});

// save the base class function
atsAnalytics.originEnableAnalytics = atsAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
atsAnalytics.enableAnalytics = function (config) {
  if (!config.options.pid) {
    utils.logError('Publisher ID (pid) option is not defined. Analytics won\'t work');
    return;
  }

  if (!config.options.pid) {
    utils.logError('Host option is not defined. Analytics won\'t work');
    return;
  }

  host = config.options.host;
  atsAnalytics.context = {
    // events : []
    host: config.options.host,
    pid: config.options.pid
  };
  let initOptions = config.options;
  atsAnalytics.originEnableAnalytics(initOptions); // call the base class function
};

adaptermanager.registerAnalyticsAdapter({
  adapter: atsAnalytics,
  code: 'atsAnalytics'
});

export default atsAnalytics;
