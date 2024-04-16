import {logInfo, logError} from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';

const ZETA_GVL_ID = 833;
const ADAPTER_CODE = 'zeta_global_ssp';
const BASE_URL = 'https://ssp.disqus.com/prebid/event';
const LOG_PREFIX = 'ZetaGlobalSsp-Analytics: ';

const cache = {
  auctions: {}
};

/// /////////// VARIABLES ////////////////////////////////////

let publisherId; // int

/// /////////// HELPER FUNCTIONS /////////////////////////////

function sendEvent(eventType, event) {
  ajax(
    BASE_URL + '/' + eventType,
    null,
    JSON.stringify(event)
  );
}

function getZetaParams(event) {
  if (event.adUnits) {
    for (const i in event.adUnits) {
      const unit = event.adUnits[i];
      if (unit.bids) {
        for (const j in unit.bids) {
          const bid = unit.bids[j];
          if (bid.bidder === ADAPTER_CODE && bid.params) {
            return bid.params;
          }
        }
      }
    }
  }
  return null;
}

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

function adRenderSucceededHandler(args) {
  let eventType = EVENTS.AD_RENDER_SUCCEEDED
  logInfo(LOG_PREFIX + 'handle ' + eventType + ' event');

  const event = {
    adId: args.adId,
    bid: {
      adId: args.bid?.adId,
      auctionId: args.bid?.auctionId,
      adUnitCode: args.bid?.adUnitCode,
      bidId: args.bid?.bidId,
      requestId: args.bid?.requestId,
      bidderCode: args.bid?.bidderCode,
      mediaTypes: args.bid?.mediaTypes,
      sizes: args.bid?.sizes,
      adserverTargeting: args.bid?.adserverTargeting,
      cpm: args.bid?.cpm,
      creativeId: args.bid?.creativeId,
      mediaType: args.bid?.mediaType,
      renderer: args.bid?.renderer,
      size: args.bid?.size,
      timeToRespond: args.bid?.timeToRespond,
      params: args.bid?.params
    },
    doc: {
      location: args.doc?.location
    }
  }

  // set zetaParams from cache
  if (event.bid && event.bid.auctionId) {
    const zetaParams = cache.auctions[event.bid.auctionId];
    if (zetaParams) {
      event.bid.params = [ zetaParams ];
    }
  }

  sendEvent(eventType, event);
}

function auctionEndHandler(args) {
  let eventType = EVENTS.AUCTION_END;
  logInfo(LOG_PREFIX + 'handle ' + eventType + ' event');

  const event = {
    auctionId: args.auctionId,
    adUnits: args.adUnits,
    bidderRequests: args.bidderRequests?.map(br => ({
      bidderCode: br?.bidderCode,
      refererInfo: br?.refererInfo,
      bids: br?.bids?.map(b => ({
        adUnitCode: b?.adUnitCode,
        auctionId: b?.auctionId,
        bidId: b?.bidId,
        requestId: b?.requestId,
        bidderCode: b?.bidderCode,
        mediaTypes: b?.mediaTypes,
        sizes: b?.sizes,
        bidder: b?.bidder,
        params: b?.params
      }))
    })),
    bidsReceived: args.bidsReceived?.map(br => ({
      adId: br?.adId,
      adserverTargeting: {
        hb_adomain: br?.adserverTargeting?.hb_adomain
      },
      cpm: br?.cpm,
      creativeId: br?.creativeId,
      mediaType: br?.mediaType,
      renderer: br?.renderer,
      size: br?.size,
      timeToRespond: br?.timeToRespond,
      adUnitCode: br?.adUnitCode,
      auctionId: br?.auctionId,
      bidId: br?.bidId,
      requestId: br?.requestId,
      bidderCode: br?.bidderCode,
      mediaTypes: br?.mediaTypes,
      sizes: br?.sizes,
      bidder: br?.bidder,
      params: br?.params
    }))
  }

  // save zetaParams to cache
  const zetaParams = getZetaParams(event);
  if (zetaParams && event.auctionId) {
    cache.auctions[event.auctionId] = zetaParams;
  }

  sendEvent(eventType, event);
}

/// /////////// ADAPTER DEFINITION ///////////////////////////

let baseAdapter = adapter({ analyticsType: 'endpoint' });
let zetaAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(config = {}) {
    let error = false;

    if (typeof config.options === 'object') {
      if (config.options.sid) {
        publisherId = Number(config.options.sid);
      }
    } else {
      logError(LOG_PREFIX + 'Config not found');
      error = true;
    }

    if (!publisherId) {
      logError(LOG_PREFIX + 'Missing sid (publisher id)');
      error = true;
    }

    if (error) {
      logError(LOG_PREFIX + 'Analytics is disabled due to error(s)');
    } else {
      baseAdapter.enableAnalytics.call(this, config);
    }
  },

  disableAnalytics() {
    publisherId = undefined;
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({ eventType, args }) {
    switch (eventType) {
      case EVENTS.AD_RENDER_SUCCEEDED:
        adRenderSucceededHandler(args);
        break;
      case EVENTS.AUCTION_END:
        auctionEndHandler(args);
        break;
    }
  }
});

/// /////////// ADAPTER REGISTRATION /////////////////////////

adapterManager.registerAnalyticsAdapter({
  adapter: zetaAdapter,
  code: ADAPTER_CODE,
  gvlid: ZETA_GVL_ID
});

export default zetaAdapter;
