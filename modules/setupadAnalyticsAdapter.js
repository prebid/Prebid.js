import { ajax } from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import { getGptSlotInfoForAdUnitCode, logError, logInfo } from '../src/utils.js';

const analyticsType = 'endpoint';
const url =
  'https://function-analytics-setupad-adapter.azurewebsites.net/api/function-analytics-setupad-adapter';

let initOptions = {};
let eventQueue = [];
let adUnitCodesCache = [];

function auctionInitHandler(args) {
  const auctionInit = {
    eventType: CONSTANTS.EVENTS.AUCTION_INIT,
    args: args,
  };
  sendEvent(auctionInit);
}

function bidRequestedHandler(args) {
  const bidRequested = {
    eventType: CONSTANTS.EVENTS.BID_REQUESTED,
    args: args,
  };
  sendEvent(bidRequested);
}

function bidResponseHandler(args) {
  const bidResponse = {
    eventType: CONSTANTS.EVENTS.BID_RESPONSE,
    args: args,
  };
  sendEvent(bidResponse);
}

function bidderDoneHandler(args) {
  const bidderDone = {
    eventType: CONSTANTS.EVENTS.BIDDER_DONE,
    args: args,
  };
  sendEvent(bidderDone);
}

function bidWonHandler(args) {
  bidWonCall(args);
}

function noBidHandler(args) {
  const noBid = {
    eventType: CONSTANTS.EVENTS.NO_BID,
    args: args,
  };
  sendEvent(noBid);
}

function auctionEndHandler(args) {
  const auctionEnd = {
    eventType: CONSTANTS.EVENTS.AUCTION_END,
    args: args,
  };
  sendEvent(auctionEnd);
}

function bidTimeoutHandler(args) {
  sendEvent({
    eventType: CONSTANTS.EVENTS.BID_TIMEOUT,
    args: args,
  });
}

let setupadAnalyticsAdapter = Object.assign(adapter({ url, analyticsType }), {
  track({ eventType, args }) {
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        auctionInitHandler(args);
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        bidRequestedHandler(args);
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        bidResponseHandler(args);
        break;
      case CONSTANTS.EVENTS.BIDDER_DONE:
        bidderDoneHandler(args);
        break;
      case CONSTANTS.EVENTS.BID_WON:
        bidWonHandler(args);
        break;
      case CONSTANTS.EVENTS.NO_BID:
        noBidHandler(args);
        break;
      case CONSTANTS.EVENTS.AUCTION_END:
        auctionEndHandler(args);
        break;
      case CONSTANTS.EVENTS.BID_TIMEOUT:
        bidTimeoutHandler(args);
        break;
    }
  },
});

function call() {
  if (eventQueue.length > 0) {
    ajax(
      url,
      () => logInfo('SETUPAD_ANALYTICS_BATCH_SEND'),
      JSON.stringify({ data: eventQueue, adUnitCodes: adUnitCodesCache }),
      {
        contentType: 'application/json',
        method: 'POST',
      }
    );

    adUnitCodesCache = [];
    eventQueue = [];
  }
}

function sendEvent(data) {
  eventQueue.push(data);
  if (data.eventType === CONSTANTS.EVENTS.AUCTION_INIT) {
    adUnitCodesCache = data.args.adUnitCodes.map((code) => {
      const gamPath = getGptSlotInfoForAdUnitCode(code)?.gptSlot || code;
      return {
        adUnitCode: code,
        gamPath,
      };
    });
  }

  if (data.eventType === CONSTANTS.EVENTS.AUCTION_END) call();
}

function bidWonCall(data) {
  const formatAdUnitCode = getGptSlotInfoForAdUnitCode(data.adUnitCode)?.gptSlot || data.adUnitCode;
  ajax(
    `${url}?bidWon=true`,
    () => logInfo('SETUPAD_ANALYTICS_BATCH_SEND'),
    JSON.stringify({ data, adUnitCode: formatAdUnitCode }),
    {
      contentType: 'application/json',
      method: 'POST',
    }
  );
}

// save the base class function
setupadAnalyticsAdapter.originEnableAnalytics = setupadAnalyticsAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
setupadAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config ? config.options : {};
  setupadAnalyticsAdapter.originEnableAnalytics(config); // call the base class function

  if (!initOptions.pid) return logError('enableAnalytics missing config object with "pid"');
};

adapterManager.registerAnalyticsAdapter({
  adapter: setupadAnalyticsAdapter,
  code: 'setupadAnalyticsAdapter',
});

export default setupadAnalyticsAdapter;
