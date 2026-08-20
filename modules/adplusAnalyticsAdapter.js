import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { logInfo, logError } from '../src/utils.js';
import { EVENTS } from '../src/constants.js';
import { ajax } from '../src/ajax.js';
import { getRefererInfo } from '../src/refererDetection.js';

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
            const bidDt = bidDataAdapter('bid', bid);
            auctionBids[args.auctionId][adUnit].push(bidDt);
          });
          break;
        case BID_WON: {
          const bid = args;
          const adUnitBids = auctionBids?.[bid.auctionId]?.[bid.adUnitCode];
          if (!adUnitBids) {
            logInfo(`[adplusAnalyticsAdapter] No bid data for auction ${bid.auctionId}, ad unit ${bid.adUnitCode}`);
            return;
          }

          const refererInfo = getRefererInfo();
          const pageUrl = refererInfo?.page || window.location.href || '';
          const domain = refererInfo?.domain || window.location.hostname || '';
          const referrer = refererInfo?.ref || window.document.referrer || '';

          const winningBid = bidDataAdapter(BID_WON, bid);

          const payload = {
            auctionId: bid.auctionId,
            adUnitCode: bid.adUnitCode,
            winningBid,
            allBids: adUnitBids,
            pageUrl: pageUrl,
            domain: domain,
            referrer: referrer,
          };

          sendQueue.push(payload);
          if (!isSending) {
            processQueue();
          }

          if (auctionBids[bid.auctionId]) {
            delete auctionBids[bid.auctionId][bid.adUnitCode];

            if (Object.keys(auctionBids[bid.auctionId]).length === 0) {
              delete auctionBids[bid.auctionId];
            }
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      logError(`[adplusAnalyticsAdapter] Error processing event ${eventType}`, err);
    }
  }
});

function bidDataAdapter(type, bid) {
  return {
    type,
    bidder: bid.bidderCode,
    auctionId: bid.auctionId,
    adUnitCode: bid.adUnitCode,
    adId: getStringValue(bid.adId),
    adUnitId: getStringValue(bid.adUnitId),
    requestId: getStringValue(bid.requestId),
    cpm: bid.cpm,
    currency: bid.currency,
    originalCpm: bid.originalCpm,
    originalCurrency: bid.originalCurrency,
    size: bid.size,
    width: bid.width,
    height: bid.height,
    creativeId: getStringValue(bid.creativeId),
    timeToRespond: bid.timeToRespond,
    netRevenue: bid.netRevenue,
    instl: bid.instl,
    mediaType: bid.mediaType,
    dealId: getStringValue(bid.dealId),
    transactionId: getStringValue(bid.transactionId),
  };
}

function getStringValue(value) {
  return value == null ? undefined : String(value);
}

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
  sendQueue = [];
  isSending = false;
  adplusAnalyticsAdapter.auctionBids = auctionBids;
};

export default adplusAnalyticsAdapter;
