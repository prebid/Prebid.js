import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import * as utils from '../src/utils.js';

const analyticsType = 'endpoint';
const url = 'https://adxpremium.services/graphql';

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

// Memory objects
let completeObject = {
  publisher_id: null,
  auction_id: null,
  referer: null,
  screen_resolution: window.screen.width + 'x' + window.screen.height,
  device_type: null,
  geo: null,
  events: []
};

let adxpremiumAnalyticsAdapter = Object.assign(adapter({ url, analyticsType }), {
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
        setTimeout(function () { sendEvent(completeObject) }, 3100);
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
    utils.logInfo(Date.now() + ' GOOGLE SLOT: ' + JSON.stringify(args));
  });
});

// Event handlers
let bidResponsesMapper = {};

function auctionInit(args) {
  completeObject.auction_id = args.auctionId;
  completeObject.publisher_id = adxpremiumAnalyticsAdapter.initOptions.pubId;
  try { completeObject.referer = args.bidderRequests[0].refererInfo.referer.split('?')[0]; } catch (e) { utils.logWarn('Could not parse referer, error details:', e.message); }
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
  });

  completeObject.events.push(tmpObject);
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
  completeObject.events[eventIndex].is_winning = true;
}

function bidTimeout(args) { /* TODO: implement timeout */ }

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

function sendEvent(completeObject) {
  try {
    let responseEvents = btoa(JSON.stringify(completeObject));
    let mutation = `mutation {createEvent(input: {event: {eventData: "${responseEvents}"}}) {event {createTime } } }`;
    let dataToSend = JSON.stringify({ query: mutation });
    ajax(url, function () { utils.logInfo(Date.now() + ' Sending event to adxpremium server.') }, dataToSend, {
      contentType: 'application/json',
      method: 'POST'
    });
  } catch (err) { utils.logError('Could not send event, error details:', err) }
}

// save the base class function
adxpremiumAnalyticsAdapter.originEnableAnalytics = adxpremiumAnalyticsAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
adxpremiumAnalyticsAdapter.enableAnalytics = function (config) {
  adxpremiumAnalyticsAdapter.initOptions = config.options;

  if (!config.options.pubId) {
    utils.logError('Publisher ID (pubId) option is not defined. Analytics won\'t work');
    return;
  }

  adxpremiumAnalyticsAdapter.originEnableAnalytics(config); // call the base class function
}

adapterManager.registerAnalyticsAdapter({
  adapter: adxpremiumAnalyticsAdapter,
  code: 'adxpremium'
});

export default adxpremiumAnalyticsAdapter;
