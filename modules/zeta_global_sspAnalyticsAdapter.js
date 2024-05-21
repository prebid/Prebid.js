import {logError} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';
import {EVENTS} from '../src/constants.js';

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';

const ZETA_GVL_ID = 833;
const ADAPTER_CODE = 'zeta_global_ssp';
const BASE_URL = 'https://ssp.disqus.com/prebid/event';
const LOG_PREFIX = 'ZetaGlobalSsp-Analytics: ';

/// /////////// VARIABLES ////////////////////////////////////

let zetaParams;

/// /////////// HELPER FUNCTIONS /////////////////////////////

function sendEvent(eventType, event) {
  ajax(
    BASE_URL + '/' + eventType,
    null,
    JSON.stringify(event)
  );
}

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

function adRenderSucceededHandler(args) {
  const event = {
    zetaParams: zetaParams,
    domain: args.doc?.location?.host,
    page: args.doc?.location?.host + args.doc?.location?.pathname,
    bid: {
      adId: args.bid?.adId,
      requestId: args.bid?.requestId,
      auctionId: args.bid?.auctionId,
      creativeId: args.bid?.creativeId,
      bidder: args.bid?.bidderCode,
      mediaType: args.bid?.mediaType,
      size: args.bid?.size,
      adomain: args.bid?.adserverTargeting?.hb_adomain,
      timeToRespond: args.bid?.timeToRespond,
      cpm: args.bid?.cpm
    }
  }
  sendEvent(EVENTS.AD_RENDER_SUCCEEDED, event);
}

function auctionEndHandler(args) {
  const event = {
    zetaParams: zetaParams,
    bidderRequests: args.bidderRequests?.map(br => ({
      bidderCode: br?.bidderCode,
      domain: br?.refererInfo?.domain,
      page: br?.refererInfo?.page,
      bids: br?.bids?.map(b => ({
        bidId: b?.bidId,
        auctionId: b?.auctionId,
        bidder: b?.bidder,
        mediaType: b?.mediaTypes?.video ? 'VIDEO' : (b?.mediaTypes?.banner ? 'BANNER' : undefined),
        size: b?.sizes?.filter(s => s && s.length === 2).filter(s => Number.isInteger(s[0]) && Number.isInteger(s[1])).map(s => s[0] + 'x' + s[1]).find(s => s)
      }))
    })),
    bidsReceived: args.bidsReceived?.map(br => ({
      adId: br?.adId,
      requestId: br?.requestId,
      creativeId: br?.creativeId,
      bidder: br?.bidder,
      mediaType: br?.mediaType,
      size: br?.size,
      adomain: br?.adserverTargeting?.hb_adomain,
      timeToRespond: br?.timeToRespond,
      cpm: br?.cpm
    }))
  }
  sendEvent(EVENTS.AUCTION_END, event);
}

function bidTimeoutHandler(args) {
  const event = {
    zetaParams: zetaParams,
    timeouts: args.map(t => ({
      bidId: t?.bidId,
      auctionId: t?.auctionId,
      bidder: t?.bidder,
      mediaType: t?.mediaTypes?.video ? 'VIDEO' : (t?.mediaTypes?.banner ? 'BANNER' : undefined),
      size: t?.sizes?.filter(s => s && s.length === 2).filter(s => Number.isInteger(s[0]) && Number.isInteger(s[1])).map(s => s[0] + 'x' + s[1]).find(s => s),
      timeout: t?.timeout,
      device: t?.ortb2?.device
    }))
  }
  sendEvent(EVENTS.BID_TIMEOUT, event);
}

/// /////////// ADAPTER DEFINITION ///////////////////////////

let baseAdapter = adapter({analyticsType: 'endpoint'});
let zetaAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(config = {}) {
    if (config.options && config.options.sid) {
      zetaParams = config.options;
      baseAdapter.enableAnalytics.call(this, config);
    } else {
      logError(LOG_PREFIX + 'Config not found');
      logError(LOG_PREFIX + 'Analytics is disabled due to error(s)');
    }
  },

  disableAnalytics() {
    zetaParams = undefined;
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({eventType, args}) {
    switch (eventType) {
      case EVENTS.AD_RENDER_SUCCEEDED:
        adRenderSucceededHandler(args);
        break;
      case EVENTS.AUCTION_END:
        auctionEndHandler(args);
        break;
      case EVENTS.BID_TIMEOUT:
        bidTimeoutHandler(args);
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
