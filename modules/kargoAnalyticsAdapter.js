import { _each } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';

const EVENT_URL = 'https://jeremy.dev.kargo.com/tools/tracker/';
const KARGO_BIDDER_CODE = 'kargo';
const CONSTANTS = require('../src/constants.json');

const analyticsType = 'endpoint;'

var kargoAnalyticsAdapter = Object.assign(
  adapter({ analyticsType }), {
    track({ eventType, args }) {
      if (typeof args !== 'undefined' && eventType === CONSTANTS.EVENTS.BID_TIMEOUT) {
        // Only recording timeouts for now
        _each(args, timeout => {
          if (timeout.bidder === KARGO_BIDDER_CODE) {
            const { auctionId, adUnitCode, bidId } = timeout;

            setTimeout(function() {
              ajax(
                `${EVENT_URL}`, {
                // `${EVENT_URL}/timeout`, {
                  success: function() {},
                  error: function() {}
                },
                JSON.stringify({
                  auctionId,
                  adUnitCode,
                  bidId,
                  domain: window.location.hostname
                }), {
                  method: 'POST'
                }
              );
            }, 3000);
          }
        });
      }
    }
  }
);

adapterManager.registerAnalyticsAdapter({
  adapter: kargoAnalyticsAdapter,
  code: 'kargo'
});

export default kargoAnalyticsAdapter;
