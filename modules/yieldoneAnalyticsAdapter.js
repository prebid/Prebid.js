import {ajax} from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';
import { targeting } from '../src/targeting';
import { auctionManager } from '../src/auctionManager';
import * as utils from '../src/utils';

const ANALYTICS_CODE = 'yieldone';
const analyticsType = 'endpoint';
// const VERSION = '1.0.0';
const defaultUrl = 'http://pool.tsukiji.iponweb.net/hba';
const requestedBidders = {};
const requestedBids = {};
const referrers = {};

let currentAuctionId = '';
let url = defaultUrl;
let pubId = '';

const AnalyticsAdapter = Object.assign(adapter({analyticsType}), {
  getUrl() { return url; },
  track({eventType, args = {}}) {
    if (eventType === CONSTANTS.EVENTS.BID_REQUESTED) {
      const reqBidderId = `${args.bidderCode}_${args.auctionId}`;
      requestedBidders[reqBidderId] = utils.deepClone(args);
      requestedBidders[reqBidderId].bids = [];
      args.bids.forEach((bid) => {
        requestedBids[`${bid.bidId}_${bid.auctionId}`] = bid;
      });
    }
    if (eventType === CONSTANTS.EVENTS.BID_TIMEOUT && utils.isArray(args)) {
      const eventsStorage = AnalyticsAdapter.eventsStorage;
      const reqBidders = {};
      args.forEach((bid) => {
        const reqBidId = `${bid.bidId}_${bid.auctionId}`;
        const reqBidderId = `${bid.bidder}_${bid.auctionId}`;
        if (!eventsStorage[bid.auctionId]) eventsStorage[bid.auctionId] = [];
        if (requestedBidders[reqBidderId] && requestedBids[reqBidId]) {
          if (!reqBidders[bid.bidder]) {
            reqBidders[bid.bidder] = requestedBidders[reqBidderId];
            reqBidders[bid.bidder].pubId = pubId;
            eventsStorage[bid.auctionId].push({eventType, params: reqBidders[bid.bidder]});
            delete requestedBidders[reqBidderId];
          }
          reqBidders[bid.bidder].bids.push(requestedBids[reqBidId]);
          delete requestedBids[reqBidId];
        }
      });
    } else {
      args.pubId = pubId;
      currentAuctionId = args.auctionId || currentAuctionId;
      if (currentAuctionId) {
        const eventsStorage = AnalyticsAdapter.eventsStorage;
        if (!eventsStorage[currentAuctionId]) eventsStorage[currentAuctionId] = [];
        const referrer = args.refererInfo && args.refererInfo.referer;
        if (referrer && referrers[currentAuctionId] !== referrer) {
          referrers[currentAuctionId] = referrer;
          eventsStorage[currentAuctionId].forEach((it) => {
            it.page = {url: referrers[currentAuctionId]};
          });
        }
        eventsStorage[currentAuctionId].push({
          eventType,
          params: args,
          page: {
            url: referrers[currentAuctionId]
          }
        });
      }
    }
    if (
      eventType === CONSTANTS.EVENTS.AUCTION_END || eventType === CONSTANTS.EVENTS.BID_WON
    ) {
      args.adServerTargeting = targeting.getAllTargeting(
        auctionManager.getAdUnitCodes(),
        auctionManager.getBidsReceived()
      );
      AnalyticsAdapter.sendStat(AnalyticsAdapter.eventsStorage[args.auctionId], args.auctionId);
    }
  },
  sendStat(events, auctionId) {
    if (!events) return;
    delete AnalyticsAdapter.eventsStorage[auctionId];
    ajax(
      url,
      {
        success: function() {},
        error: function() {}
      },
      JSON.stringify(events),
      {
        method: 'POST'
      }
    );
  }
});

AnalyticsAdapter.eventsStorage = {};

// save the base class function
AnalyticsAdapter.originEnableAnalytics = AnalyticsAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
AnalyticsAdapter.enableAnalytics = function (config) {
  const options = config && config.options;
  if (options) {
    if (typeof options.url === 'string') {
      url = options.url;
    }
    if (options.pubId) {
      pubId = options.pubId.toString();
    }
  }
  AnalyticsAdapter.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: AnalyticsAdapter,
  code: ANALYTICS_CODE
});
