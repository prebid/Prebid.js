import { _each, logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const EVENT_URL = 'https://krk.kargo.com/api/v1/event';
const KARGO_BIDDER_CODE = 'kargo';
const CONSTANTS = require('../src/constants.json');

const analyticsType = 'endpoint';

let _logData = {
  auctionId: '',
  auctionTimeout: 0,
};

var kargoAnalyticsAdapter = Object.assign(
  adapter({ analyticsType }), {
    track({ eventType, args }) {
      switch (eventType) {
        case CONSTANTS.EVENTS.AUCTION_INIT: {
          _logData.auctionTimeout = args.timeout;
          break;
        }
        case CONSTANTS.EVENTS.BID_TIMEOUT: {
          handleTimeout(args);
          break;
        }
      }
    }
  }
);

function handleTimeout (timeouts) {
  let sent = false;
  _each(timeouts, timeout => {
    if (sent || timeout.bidder !== KARGO_BIDDER_CODE) {
      return
    }

    _logData.auctionId = timeout.auctionId;
    sendTimeoutData(_logData);
    sent = true;
  });
}

function sendTimeoutData (data) {
  try {
    ajax(
      `${EVENT_URL}/timeout`,
      null,
      {
        aid: data.auctionId,
        ato: data.auctionTimeout,
      },
      {
        method: 'GET',
      }
    );
  } catch (err) {
    logError('Error sending timeout data: ', err);
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: kargoAnalyticsAdapter,
  code: 'kargo'
});

export default kargoAnalyticsAdapter;
