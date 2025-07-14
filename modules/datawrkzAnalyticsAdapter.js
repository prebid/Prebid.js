import adapterManager from '../src/adapterManager.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import { logInfo, logError } from '../src/utils.js';

let ENDPOINT = 'http://18.142.162.26/analytics';
const auctions = {};

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
            site: window.location.hostname || 'unknown',
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
              auction.adunits[adunit] = { bids: [], revenue: 0 };
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
                timeToRespond: null
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
            adunit.revenue += args.cpm;
            const match = adunit.bids.find(b => b.bidder === args.bidder);
            if (match) match.won = true;
          }
          break;
        }

        case EVENTS.AUCTION_END: {
          const auctionId = args?.auctionId;
          const auction = auctions[auctionId];
          if (!auction) return;

          const adunitsArray = Object.entries(auction.adunits).map(([code, data]) => ({
            code,
            revenue: data.revenue,
            bids: data.bids
          }));

          const payload = {
            auctionId: auction.auctionId,
            timestamp: auction.timestamp,
            site: auction.site,
            adunits: adunitsArray
          };

          try {
              fetch(ENDPOINT, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
              });
          } catch (e) {
            logError('[DatawrkzAnalytics] Sending failed', e, payload);
          }

          delete auctions[auctionId];
          break;
        }

        default:
          break;
      }
    }
  }
);

datawrkzAnalyticsAdapter.originEnableAnalytics = datawrkzAnalyticsAdapter.enableAnalytics;

datawrkzAnalyticsAdapter.enableAnalytics = function (config) {
  datawrkzAnalyticsAdapter.originEnableAnalytics(config);
  logInfo('[DatawrkzAnalytics] Enabled with config:', config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: datawrkzAnalyticsAdapter,
  code: 'datawrkzanalytics'
});

export default datawrkzAnalyticsAdapter;
