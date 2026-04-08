import adapterManager from '../src/adapterManager.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import { logInfo, logError } from '../src/utils.js';

let ENDPOINT = 'https://prebid-api.highr.ai/analytics';
const auctions = {};
const adapterConfig = {};

const datawrkzAnalyticsAdapter = Object.assign(adapter({ url: ENDPOINT, analyticsType: 'endpoint' }),
  {
    track({ eventType, args }) {
      logInfo('[DatawrkzAnalytics] Tracking event:', eventType, args);

      switch (eventType) {
        case EVENTS.AUCTION_INIT: {
          const auctionId = args?.auctionId;
          if (!auctionId) return;

          auctions[auctionId] = {
            auctionId,
            timestamp: new Date().toISOString(),
            domain: window.location.hostname || 'unknown',
            adunits: {}
          };
          break;
        }

        case EVENTS.BID_REQUESTED: {
          const auctionId = args?.auctionId;
          const auction = auctions[auctionId];
          if (!auction) return;

          args.bids.forEach(bid => {
            const adunit = bid.adUnitCode;
            if (!auction.adunits[adunit]) {
              auction.adunits[adunit] = { bids: [] };
            }

            const exists = auction.adunits[adunit].bids.some(b => b.bidder === bid.bidder);
            if (!exists) {
              auction.adunits[adunit].bids.push({
                bidder: bid.bidder,
                requested: true,
                responded: false,
                won: false,
                timeout: false,
                cpm: 0,
                currency: '',
                timeToRespond: 0,
                adId: '',
                width: 0,
                height: 0
              });
            }
          });
          break;
        }

        case EVENTS.BID_RESPONSE: {
          const auctionId = args?.auctionId;
          const auction = auctions[auctionId];
          if (!auction) return;

          const adunit = auction.adunits[args.adUnitCode];
          if (adunit) {
            const match = adunit.bids.find(b => b.bidder === args.bidder);
            if (match) {
              match.responded = true;
              match.cpm = args.cpm;
              match.currency = args.currency;
              match.timeToRespond = args.timeToRespond;
              match.adId = args.adId
              match.width = args.width
              match.height = args.height
            }
          }
          break;
        }

        case EVENTS.BID_TIMEOUT: {
          const { auctionId, adUnitCode, bidder } = args;
          const auctionTimeout = auctions[auctionId];
          if (!auctionTimeout) return;

          const adunitTO = auctionTimeout.adunits[adUnitCode];
          if (adunitTO) {
            adunitTO.bids.forEach(b => {
              if (b.bidder === bidder) {
                b.timeout = true;
              }
            });
          }
          break;
        }

        case EVENTS.BID_WON: {
          const auctionId = args?.auctionId;
          const auction = auctions[auctionId];
          if (!auction) return;

          const adunit = auction.adunits[args.adUnitCode];
          if (adunit) {
            const match = adunit.bids.find(b => b.bidder === args.bidder);
            if (match) match.won = true;
          }
          break;
        }

        case EVENTS.AD_RENDER_SUCCEEDED: {
          const { bid, adId, doc } = args || {};

          const payload = {
            eventType: EVENTS.AD_RENDER_SUCCEEDED,
            domain: window.location.hostname || 'unknown',
            bidderCode: bid?.bidderCode,
            width: bid?.width,
            height: bid?.height,
            cpm: bid?.cpm,
            currency: bid?.currency,
            auctionId: bid?.auctionId,
            adUnitCode: bid?.adUnitCode,
            adId,
            successDoc: JSON.stringify(doc),
            failureReason: null,
            failureMessage: null,
          }

          this.sendToEndPoint(payload)

          break;
        }

        case EVENTS.AD_RENDER_FAILED: {
          const { reason, message, bid, adId } = args || {};

          const payload = {
            eventType: EVENTS.AD_RENDER_FAILED,
            domain: window.location.hostname || 'unknown',
            bidderCode: bid?.bidderCode,
            width: bid?.width,
            height: bid?.height,
            cpm: bid?.cpm,
            currency: bid?.currency,
            auctionId: bid?.auctionId,
            adUnitCode: bid?.adUnitCode,
            adId,
            successDoc: null,
            failureReason: reason,
            failureMessage: message
          }

          this.sendToEndPoint(payload)

          break;
        }

        case EVENTS.AUCTION_END: {
          const auctionId = args?.auctionId;
          const auction = auctions[auctionId];
          if (!auction) return;

          setTimeout(() => {
            const adunitsArray = Object.entries(auction.adunits).map(([code, data]) => ({
              code,
              bids: data.bids
            }));

            const payload = {
              eventType: 'auction_data',
              auctionId: auction.auctionId,
              timestamp: auction.timestamp,
              domain: auction.domain,
              adunits: adunitsArray
            };

            this.sendToEndPoint(payload)

            delete auctions[auctionId];
          }, 2000); // Wait 2 seconds for BID_WON to happen

          break;
        }

        default:
          break;
      }
    },
    sendToEndPoint(payload) {
      if (!adapterConfig.publisherId || !adapterConfig.apiKey) {
        logError('[DatawrkzAnalytics] Missing mandatory config: publisherId or apiKey. Skipping event.');
        return;
      }

      payload.publisherId = adapterConfig.publisherId
      payload.apiKey = adapterConfig.apiKey

      try {
        fetch(ENDPOINT, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        logError('[DatawrkzAnalytics] Failed to send event', e, payload);
      }
    }
  }
);

datawrkzAnalyticsAdapter.originEnableAnalytics = datawrkzAnalyticsAdapter.enableAnalytics;

datawrkzAnalyticsAdapter.enableAnalytics = function (config) {
  Object.assign(adapterConfig, config?.options || {});
  datawrkzAnalyticsAdapter.originEnableAnalytics(config);
  logInfo('[DatawrkzAnalytics] Enabled with config:', config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: datawrkzAnalyticsAdapter,
  code: 'datawrkzanalytics'
});

export default datawrkzAnalyticsAdapter;
