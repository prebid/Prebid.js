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
const defaultUrl = '//pool.tsukiji.iponweb.net/hba';
const requestedBidders = {};
const requestedBids = {};
const referrers = {};

let currentAuctionId = '';
let url = defaultUrl;
let pubId = '';

function makeAdUnitNameMap() {
  if (window.googletag && window.googletag.pubads) {
    const p = googletag.pubads();
    if (p && p.getSlots) {
      const slots = p.getSlots();
      if (slots && slots.length) {
        const map = {};
        slots.forEach((slot) => {
          const id = slot.getSlotElementId();
          const name = (slot.getAdUnitPath() || '').split('/').pop();
          map[id] = name;
        });
        return map;
      }
    }
  }
}

function addAdUnitNameForArray(ar, map) {
  if (utils.isArray(ar)) {
    ar.forEach((it) => { addAdUnitName(it, map) });
  }
}

function addAdUnitName(params, map) {
  if (params.adUnitCode && map[params.adUnitCode]) {
    params.adUnitName = map[params.adUnitCode];
  }
  if (utils.isArray(params.adUnits)) {
    params.adUnits.forEach((adUnit) => {
      if (adUnit.code && map[adUnit.code]) {
        adUnit.name = map[adUnit.code];
      }
    });
  }
  if (utils.isArray(params.adUnitCodes)) {
    params.adUnitNames = params.adUnitCodes.map((code) => map[code]);
  }
  ['bids', 'bidderRequests', 'bidsReceived', 'noBids'].forEach((it) => {
    addAdUnitNameForArray(params[it], map);
  });
}

const yieldoneAnalytics = Object.assign(adapter({analyticsType}), {
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
      const eventsStorage = yieldoneAnalytics.eventsStorage;
      const reqBidders = {};
      args.forEach((bid) => {
        const reqBidId = `${bid.bidId}_${bid.auctionId}`;
        const reqBidderId = `${bid.bidder}_${bid.auctionId}`;
        if (!eventsStorage[bid.auctionId]) eventsStorage[bid.auctionId] = [];
        if ((requestedBidders[reqBidderId] || reqBidders[bid.bidder]) && requestedBids[reqBidId]) {
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
        const eventsStorage = yieldoneAnalytics.eventsStorage;
        if (!eventsStorage[currentAuctionId]) eventsStorage[currentAuctionId] = [];
        const referrer = args.refererInfo && args.refererInfo.referer;
        if (referrer && referrers[currentAuctionId] !== referrer) {
          referrers[currentAuctionId] = referrer;
        }
        eventsStorage[currentAuctionId].push({
          eventType,
          params: args
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
      if (yieldoneAnalytics.eventsStorage[args.auctionId]) {
        yieldoneAnalytics.eventsStorage[args.auctionId].forEach((it) => {
          it.page = {url: referrers[currentAuctionId]};
          const adUnitNameMap = makeAdUnitNameMap();
          if (adUnitNameMap) {
            addAdUnitName(it.params, adUnitNameMap);
          }
        });
      }
      yieldoneAnalytics.sendStat(yieldoneAnalytics.eventsStorage[args.auctionId], args.auctionId);
    }
  },
  sendStat(events, auctionId) {
    if (!events) return;
    delete yieldoneAnalytics.eventsStorage[auctionId];
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

yieldoneAnalytics.eventsStorage = {};

// save the base class function
yieldoneAnalytics.originEnableAnalytics = yieldoneAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
yieldoneAnalytics.enableAnalytics = function (config) {
  const options = config && config.options;
  if (options) {
    if (typeof options.url === 'string') {
      url = options.url;
    }
    if (options.pubId) {
      pubId = options.pubId.toString();
    }
  }
  yieldoneAnalytics.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: yieldoneAnalytics,
  code: ANALYTICS_CODE
});

export default yieldoneAnalytics;
