import { isArray, deepClone } from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import { targeting } from '../src/targeting.js';
import { auctionManager } from '../src/auctionManager.js';

const ANALYTICS_CODE = 'yieldone';
const analyticsType = 'endpoint';
// const VERSION = '1.0.0';
const defaultUrl = 'https://pool.tsukiji.iponweb.net/hba';
const requestedBidders = {};
const requestedBids = {};
const referrers = {};
const ignoredEvents = {};
ignoredEvents[EVENTS.BID_ADJUSTMENT] = true;
ignoredEvents[EVENTS.BIDDER_DONE] = true;
ignoredEvents[EVENTS.AUCTION_END] = true;

let currentAuctionId = '';
let url = defaultUrl;
let pubId = '';

function makeAdUnitNameMap() {
  if (window.googletag && window.googletag.pubads) {
    // eslint-disable-next-line no-undef
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
  if (isArray(ar)) {
    ar.forEach((it) => { addAdUnitName(it, map) });
  }
}

function addAdUnitName(params, map) {
  if (params.adUnitCode && map[params.adUnitCode]) {
    params.adUnitName = map[params.adUnitCode];
  }
  if (isArray(params.adUnits)) {
    params.adUnits.forEach((adUnit) => {
      if (adUnit.code && map[adUnit.code]) {
        adUnit.name = map[adUnit.code];
      }
    });
  }
  if (isArray(params.adUnitCodes)) {
    params.adUnitNames = params.adUnitCodes.map((code) => map[code]);
  }
  ['bids', 'bidderRequests', 'bidsReceived', 'noBids'].forEach((it) => {
    addAdUnitNameForArray(params[it], map);
  });
}

const yieldoneAnalytics = Object.assign(adapter({analyticsType}), {
  getUrl() { return url; },
  track({eventType, args = {}}) {
    if (eventType === EVENTS.BID_REQUESTED) {
      const reqBidderId = `${args.bidderCode}_${args.auctionId}`;
      requestedBidders[reqBidderId] = deepClone(args);
      requestedBidders[reqBidderId].bids = [];
      args.bids.forEach((bid) => {
        requestedBids[`${bid.bidId}_${bid.auctionId}`] = bid;
      });
    }
    if (eventType === EVENTS.BID_TIMEOUT && isArray(args)) {
      const eventsStorage = yieldoneAnalytics.eventsStorage;
      const reqBidders = {};
      args.forEach((bid) => {
        const reqBidId = `${bid.bidId}_${bid.auctionId}`;
        const reqBidderId = `${bid.bidder}_${bid.auctionId}`;
        if (!eventsStorage[bid.auctionId]) eventsStorage[bid.auctionId] = {events: []};
        if ((requestedBidders[reqBidderId] || reqBidders[bid.bidder]) && requestedBids[reqBidId]) {
          if (!reqBidders[bid.bidder]) {
            reqBidders[bid.bidder] = requestedBidders[reqBidderId];
            eventsStorage[bid.auctionId].events.push({eventType, params: reqBidders[bid.bidder]});
            delete requestedBidders[reqBidderId];
          }
          reqBidders[bid.bidder].bids.push(requestedBids[reqBidId]);
          delete requestedBids[reqBidId];
        }
      });
    } else {
      currentAuctionId = args.auctionId || currentAuctionId;
      if (currentAuctionId) {
        const eventsStorage = yieldoneAnalytics.eventsStorage;
        if (!eventsStorage[currentAuctionId]) eventsStorage[currentAuctionId] = {events: []};
        // TODO: is 'page' the right value here?
        const referrer = args.refererInfo && args.refererInfo.page;
        if (referrer && referrers[currentAuctionId] !== referrer) {
          referrers[currentAuctionId] = referrer;
        }
        const params = Object.assign({}, args);
        delete params.ad;
        if (params.bidsReceived) {
          params.bidsReceived = params.bidsReceived.map((bid) => {
            const res = Object.assign({}, bid);
            delete res.ad;
            return res;
          });
        }
        if (!ignoredEvents[eventType]) {
          eventsStorage[currentAuctionId].events.push({eventType, params});
        }

        if (
          eventType === EVENTS.AUCTION_END || eventType === EVENTS.BID_WON
        ) {
          params.adServerTargeting = targeting.getAllTargeting(
            auctionManager.getAdUnitCodes(),
            auctionManager.getBidsReceived()
          );
          if (yieldoneAnalytics.eventsStorage[currentAuctionId] && yieldoneAnalytics.eventsStorage[currentAuctionId].events.length) {
            yieldoneAnalytics.eventsStorage[currentAuctionId].page = {url: referrers[currentAuctionId]};
            yieldoneAnalytics.eventsStorage[currentAuctionId].pubId = pubId;
            yieldoneAnalytics.eventsStorage[currentAuctionId].wrapper_version = '$prebid.version$';
            const adUnitNameMap = makeAdUnitNameMap();
            if (adUnitNameMap) {
              yieldoneAnalytics.eventsStorage[currentAuctionId].events.forEach((it) => {
                addAdUnitName(it.params, adUnitNameMap);
              });
            }
          }
          yieldoneAnalytics.sendStat(yieldoneAnalytics.eventsStorage[currentAuctionId], currentAuctionId);
        }
      }
    }
  },
  sendStat(data, auctionId) {
    if (!data || !data.events || !data.events.length) return;
    delete yieldoneAnalytics.eventsStorage[auctionId];
    ajax(
      url,
      {
        success: function() {},
        error: function() {}
      },
      JSON.stringify(data),
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
