import {deepClone, logError, logInfo} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import {includes} from '../src/polyfill.js';

const analyticsType = 'endpoint';
const defaultUrl = 'https://adxpremium.services/graphql';

let reqCountry = window.reqCountry || null;

// Events needed
const {
  EVENTS: {
    AUCTION_INIT,
    BID_REQUESTED,
    BID_TIMEOUT,
    BID_RESPONSE,
    BID_WON,
    AUCTION_END
  }
} = CONSTANTS;

let timeoutBased = false;
let requestSent = false;
let requestDelivered = false;
let elementIds = [];

// Memory objects
let completeObject = {
  publisher_id: null,
  auction_id: null,
  referer: null,
  screen_resolution: window.screen.width + 'x' + window.screen.height,
  device_type: null,
  geo: reqCountry,
  events: []
};

// Upgraded object
let upgradedObject = null;

let adxpremiumAnalyticsAdapter = Object.assign(adapter({ defaultUrl, analyticsType }), {
  track({ eventType, args }) {
    switch (eventType) {
      case AUCTION_INIT:
        auctionInit(args);
        break;
      case BID_REQUESTED:
        bidRequested(args);
        break;
      case BID_RESPONSE:
        bidResponse(args);
        break;
      case BID_WON:
        bidWon(args);
        break;
      case BID_TIMEOUT:
        bidTimeout(args);
        break;
      case AUCTION_END:
        auctionEnd(args);
        break;
      default:
        break;
    }
  }
});

// DFP support
let googletag = window.googletag || {};
googletag.cmd = googletag.cmd || [];
googletag.cmd.push(function() {
  googletag.pubads().addEventListener('slotRenderEnded', args => {
    clearSlot(args.slot.getSlotElementId());
  });
});

// Event handlers
let bidResponsesMapper = {};
let bidRequestsMapper = {};
let bidMapper = {};

function auctionInit(args) {
  // Clear events
  completeObject.events = [];
  // Allow new requests
  requestSent = false;
  requestDelivered = false;
  // Reset mappers
  bidResponsesMapper = {};
  bidRequestsMapper = {};
  bidMapper = {};

  completeObject.auction_id = args.auctionId;
  completeObject.publisher_id = adxpremiumAnalyticsAdapter.initOptions.pubId;
  // TODO: is 'page' the right value here?
  try { completeObject.referer = encodeURI(args.bidderRequests[0].refererInfo.page.split('?')[0]); } catch (e) { logError('AdxPremium Analytics - ' + e.message); }
  if (args.adUnitCodes && args.adUnitCodes.length > 0) {
    elementIds = args.adUnitCodes;
  }
  completeObject.device_type = deviceType();
}
function bidRequested(args) {
  let tmpObject = {
    type: 'REQUEST',
    bidder_code: args.bidderCode,
    event_timestamp: args.start,
    bid_gpt_codes: {}
  };

  args.bids.forEach(bid => {
    tmpObject.bid_gpt_codes[bid.adUnitCode] = bid.sizes;
    bidMapper[bid.bidId] = bid.bidderRequestId;
  });

  bidRequestsMapper[args.bidderRequestId] = completeObject.events.push(tmpObject) - 1;
}

function bidResponse(args) {
  let tmpObject = {
    type: 'RESPONSE',
    bidder_code: args.bidderCode,
    event_timestamp: args.responseTimestamp,
    size: args.size,
    gpt_code: args.adUnitCode,
    currency: args.currency,
    creative_id: args.creativeId,
    time_to_respond: args.timeToRespond,
    cpm: args.cpm,
    is_winning: false
  };

  bidResponsesMapper[args.requestId] = completeObject.events.push(tmpObject) - 1;
}

function bidWon(args) {
  let eventIndex = bidResponsesMapper[args.requestId];
  if (eventIndex !== undefined) {
    if (requestDelivered) {
      if (completeObject.events[eventIndex]) {
        // do the upgrade
        logInfo('AdxPremium Analytics - Upgrading request');
        completeObject.events[eventIndex].is_winning = true;
        completeObject.events[eventIndex].is_upgrade = true;
        upgradedObject = deepClone(completeObject);
        upgradedObject.events = [completeObject.events[eventIndex]];
        sendEvent(upgradedObject); // send upgrade
      } else {
        logInfo('AdxPremium Analytics - CANNOT FIND INDEX FOR REQUEST ' + args.requestId);
      }
    } else {
      completeObject.events[eventIndex].is_winning = true;
    }
  } else {
    logInfo('AdxPremium Analytics - Response not found, creating new one.');
    let tmpObject = {
      type: 'RESPONSE',
      bidder_code: args.bidderCode,
      event_timestamp: args.responseTimestamp,
      size: args.size,
      gpt_code: args.adUnitCode,
      currency: args.currency,
      creative_id: args.creativeId,
      time_to_respond: args.timeToRespond,
      cpm: args.cpm,
      is_winning: true,
      is_lost: true
    };
    let lostObject = deepClone(completeObject);
    lostObject.events = [tmpObject];
    sendEvent(lostObject); // send lost object
  }
}

function bidTimeout(args) {
  let timeoutObject = deepClone(completeObject);
  timeoutObject.events = [];
  let usedRequestIds = [];

  args.forEach(bid => {
    let pulledRequestId = bidMapper[bid.bidId];
    let eventIndex = bidRequestsMapper[pulledRequestId];
    if (eventIndex !== undefined && completeObject.events[eventIndex] && usedRequestIds.indexOf(pulledRequestId) == -1) {
      // mark as timeouted
      let tempEventIndex = timeoutObject.events.push(completeObject.events[eventIndex]) - 1;
      timeoutObject.events[tempEventIndex]['type'] = 'TIMEOUT';
      usedRequestIds.push(pulledRequestId); // mark as used
    }
  });

  if (timeoutObject.events.length > 0) {
    sendEvent(timeoutObject); // send timeouted
    logInfo('AdxPremium Analytics - Sending timeouted requests');
  }
}

function auctionEnd(args) {
  logInfo('AdxPremium Analytics - Auction Ended at ' + Date.now());
  if (timeoutBased) { setTimeout(function () { requestSent = true; sendEvent(completeObject); }, 3500); } else { sendEventFallback(); }
}

// Methods
function deviceType() {
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
    return 'tablet';
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
    return 'mobile';
  }
  return 'desktop';
}

function clearSlot(elementId) {
  if (includes(elementIds, elementId)) { elementIds.splice(elementIds.indexOf(elementId), 1); logInfo('AdxPremium Analytics - Done with: ' + elementId); }
  if (elementIds.length == 0 && !requestSent && !timeoutBased) {
    requestSent = true;
    sendEvent(completeObject);
    logInfo('AdxPremium Analytics - Everything ready');
  }
}

export function testSend() {
  sendEvent(completeObject);
  logInfo('AdxPremium Analytics - Sending without any conditions, used for testing');
}

function sendEventFallback() {
  setTimeout(function () {
    if (!requestSent) { requestSent = true; sendEvent(completeObject); logInfo('AdxPremium Analytics - Sending event using fallback method.'); }
  }, 2000);
}

function sendEvent(completeObject) {
  if (!adxpremiumAnalyticsAdapter.enabled) return;
  requestDelivered = true;
  try {
    let responseEvents = btoa(JSON.stringify(completeObject));
    let mutation = `mutation {createEvent(input: {event: {eventData: "${responseEvents}"}}) {event {createTime } } }`;
    let dataToSend = JSON.stringify({ query: mutation });
    let ajaxEndpoint = defaultUrl;
    if (adxpremiumAnalyticsAdapter.initOptions.sid) {
      ajaxEndpoint = 'https://' + adxpremiumAnalyticsAdapter.initOptions.sid + '.adxpremium.services/graphql'
    }
    ajax(ajaxEndpoint, function () { logInfo('AdxPremium Analytics - Sending complete events at ' + Date.now()) }, dataToSend, {
      contentType: 'application/json',
      method: 'POST'
    });
  } catch (err) { logError('AdxPremium Analytics - Sending event error: ' + err); }
}

// save the base class function
adxpremiumAnalyticsAdapter.originEnableAnalytics = adxpremiumAnalyticsAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
adxpremiumAnalyticsAdapter.enableAnalytics = function (config) {
  adxpremiumAnalyticsAdapter.initOptions = config.options;

  if (!config.options.pubId) {
    logError('AdxPremium Analytics - Publisher ID (pubId) option is not defined. Analytics won\'t work');
    return;
  }

  adxpremiumAnalyticsAdapter.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: adxpremiumAnalyticsAdapter,
  code: 'adxpremium'
});

export default adxpremiumAnalyticsAdapter;
