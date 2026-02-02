import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { logInfo, logError } from '../src/utils.js';
import { EVENTS } from '../src/constants.js';
import { ajax } from '../src/ajax.js';

const { AUCTION_END, BID_WON } = EVENTS;
const ANALYTICS_CODE = 'adplus';
const SERVER_URL = 'https://ssp.ad-plus.com.tr/server/analytics/bids';
const SEND_DELAY_MS = 200;
const MAX_RETRIES = 3;

let auctionBids = {};
let sendQueue = [];
let isSending = false;

const adplusAnalyticsAdapter = Object.assign(adapter({ SERVER_URL, analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    try {
      switch (eventType) {
        case AUCTION_END:
          auctionBids[args.auctionId] = auctionBids[args.auctionId] || {};
          (args.bidsReceived || []).forEach(bid => {
            const adUnit = bid.adUnitCode;
            auctionBids[args.auctionId][adUnit] = auctionBids[args.auctionId][adUnit] || [];
            auctionBids[args.auctionId][adUnit].push({
              type: 'bid',
              bidder: bid.bidderCode,
              auctionId: bid.auctionId,
              adUnitCode: bid.adUnitCode,
              cpm: bid.cpm,
              currency: bid.currency,
              size: bid.size,
              width: bid.width,
              height: bid.height,
              creativeId: bid.creativeId,
              timeToRespond: bid.timeToRespond,
              netRevenue: bid.netRevenue,
              dealId: bid.dealId || null,
            });
          });
          break;

        case BID_WON:
          const bid = args;
          const adUnitBids = (auctionBids[bid.auctionId] || {})[bid.adUnitCode];
          if (!adUnitBids) {
            logInfo(`[adplusAnalyticsAdapter] No bid data for auction ${bid.auctionId}, ad unit ${bid.adUnitCode}`);
            return;
          }

          const winningBidData = {
            type: BID_WON,
            bidder: bid.bidderCode,
            auctionId: bid.auctionId,
            adUnitCode: bid.adUnitCode,
            cpm: bid.cpm,
            currency: bid.currency,
            size: bid.size,
            width: bid.width,
            height: bid.height,
            creativeId: bid.creativeId,
            timeToRespond: bid.timeToRespond,
            netRevenue: bid.netRevenue,
            dealId: bid.dealId || null,
          };

          const payload = {
            auctionId: bid.auctionId,
            adUnitCode: bid.adUnitCode,
            winningBid: winningBidData,
            allBids: adUnitBids
          };

          sendQueue.push(payload);
          if (!isSending) {
            processQueue();
          }
          break;

        default:
          break;
      }
    } catch (err) {
      logError(`[adplusAnalyticsAdapter] Error processing event ${eventType}`, err);
    }
  }
});

function processQueue() {
  if (sendQueue.length === 0) {
    isSending = false;
    return;
  }

  isSending = true;
  const nextPayload = sendQueue.shift();
  sendWithRetries(nextPayload, 0);
}

function sendWithRetries(payload, attempt) {
  const payloadStr = JSON.stringify(payload);

  ajax(
    SERVER_URL,
    {
      success: () => {
        logInfo(`[adplusAnalyticsAdapter] Sent BID_WON payload (attempt ${attempt + 1})`);
        setTimeout(() => {
          processQueue();
        }, SEND_DELAY_MS);
      },
      error: () => {
        if (attempt < MAX_RETRIES - 1) {
          logError(`[adplusAnalyticsAdapter] Send failed (attempt ${attempt + 1}), retrying...`);
          setTimeout(() => {
            sendWithRetries(payload, attempt + 1);
          }, SEND_DELAY_MS);
        } else {
          logError(`[adplusAnalyticsAdapter] Failed to send after ${MAX_RETRIES} attempts`);
          setTimeout(() => {
            processQueue();
          }, SEND_DELAY_MS);
        }
      }
    },
    payloadStr,
    {
      method: 'POST',
      contentType: 'application/json',
    },
  );
}

adplusAnalyticsAdapter.originEnableAnalytics = adplusAnalyticsAdapter.enableAnalytics;

adplusAnalyticsAdapter.enableAnalytics = function (config) {
  adplusAnalyticsAdapter.originEnableAnalytics(config);
  logInfo('[adplusAnalyticsAdapter] Analytics enabled with config:', config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: adplusAnalyticsAdapter,
  code: ANALYTICS_CODE
});

adplusAnalyticsAdapter.auctionBids = auctionBids;

adplusAnalyticsAdapter.reset = function () {
  auctionBids = {};
  adplusAnalyticsAdapter.auctionBids = auctionBids;
};

export default adplusAnalyticsAdapter;
