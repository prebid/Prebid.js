import { _each } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const EVENT_URL = 'https://jeremy.dev.kargo.com/tools/tracker';
const KARGO_BIDDER_CODE = 'kargo';
const CONSTANTS = require('../src/constants.json');

const analyticsType = 'endpoint';

let _bidResponseData = {
  timeout: 0,
  auctionId: '',
  adUnitCode: '',
  bidId: '',
  domain: '',
  isNoBid: false
};
let _isTimeout = false;

var kargoAnalyticsAdapter = Object.assign(
  adapter({ analyticsType }), {
    track({ eventType, args }) {
      console.log(eventType, args);
      if (typeof args !== 'undefined') {
        switch(eventType) {
          case CONSTANTS.EVENTS.AUCTION_INIT: {
            _bidResponseData.timeout = args.timeout;
            break;
          }
          case CONSTANTS.EVENTS.BID_TIMEOUT: {
            handleTimeout(args);
            break;
          }
          case CONSTANTS.EVENTS.NO_BID: {
            handleNoBid(args);
            break;
          }
          case CONSTANTS.EVENTS.BIDDER_DONE: {
            handleBidderDone(args);
            break;
          }
        }
      }
    }
  }
);

function handleTimeout (timeouts) {
  _each(timeouts, timeout => {
    if (timeout.bidder === KARGO_BIDDER_CODE) {
      _isTimeout = true;

      const { auctionId, adUnitCode, bidId } = timeout;

      _bidResponseData = {
        ..._bidResponseData,
        auctionId,
        adUnitCode,
        bidId,
        domain: window.location.hostname,
      };
      return;
    }
  });
}

function handleNoBid (nobid) {
  if (nobid.bidder === KARGO_BIDDER_CODE) {
    _bidResponseData.isNoBid = true;
  }
}

function handleBidderDone (bidderDone) {
  if (bidderDone.bidderCode === KARGO_BIDDER_CODE && _isTimeout) {
    sendData('', _bidResponseData);
  }
}

function sendData (route, data) {
  setTimeout(function() {
    ajax(
      `${EVENT_URL}/${route}`, {
        success: function() {},
        error: function() {}
      },
      JSON.stringify(data), {
        method: 'POST'
      }
    );
  }, 3000);
}

adapterManager.registerAnalyticsAdapter({
  adapter: kargoAnalyticsAdapter,
  code: 'kargo'
});

export default kargoAnalyticsAdapter;
