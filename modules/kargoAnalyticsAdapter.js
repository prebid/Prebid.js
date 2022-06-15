import { logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';

const EVENT_URL = 'https://krk.kargo.com/api/v1/event';
const KARGO_BIDDER_CODE = 'kargo';

const analyticsType = 'endpoint';

let _initOptions = {};

let _logBidResponseData = {
  auctionId: '',
  auctionTimeout: 0,
  responseTime: 0,
};

let _bidResponseDataSent = false;

var kargoAnalyticsAdapter = Object.assign(
  adapter({ analyticsType }), {
    track({ eventType, args }) {
      switch (eventType) {
        case CONSTANTS.EVENTS.AUCTION_INIT: {
          _logBidResponseData.auctionTimeout = args.timeout;
          break;
        }
        case CONSTANTS.EVENTS.BID_RESPONSE: {
          handleBidResponseData(args);
          break;
        }
      }
    }
  }
);

function handleBidResponseData (bidResponse) {
  if (bidResponse.bidder !== KARGO_BIDDER_CODE || _bidResponseDataSent) {
    return
  }

  _logBidResponseData.auctionId = bidResponse.auctionId;
  _logBidResponseData.responseTime = bidResponse.responseTimestamp - bidResponse.requestTimestamp;
  sendBidResponseData(_logBidResponseData);

  _bidResponseDataSent = true;
}

function sendBidResponseData (data) {
  try {
    if (!shouldFireEventRequest()) {
      return;
    }

    ajax(
      `${EVENT_URL}/auction-data`,
      null,
      {
        aid: data.auctionId,
        ato: data.auctionTimeout,
        rt: data.responseTime,
        it: 0,
      },
      {
        method: 'GET',
      }
    );
  } catch (err) {
    logError('Error sending auction data: ', err);
  }
}

// Sampling rate out of 100
function shouldFireEventRequest () {
  const samplingRate = (_initOptions && _initOptions.sampling) || 100;
  return ((Math.floor(Math.random() * 100) + 1) <= parseInt(samplingRate));
}

kargoAnalyticsAdapter.originEnableAnalytics = kargoAnalyticsAdapter.enableAnalytics;

kargoAnalyticsAdapter.enableAnalytics = function (config) {
  _initOptions = config.options;
  kargoAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: kargoAnalyticsAdapter,
  code: 'kargo'
});

export default kargoAnalyticsAdapter;
