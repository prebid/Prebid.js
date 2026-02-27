import {logError} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';
import {EVENTS} from '../src/constants.js';

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import {config} from '../src/config.js';
import {parseDomain} from '../src/refererDetection.js';
import {BANNER, VIDEO} from "../src/mediaTypes.js";

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
  const page = config.getConfig('pageUrl') || args.doc?.location?.host + args.doc?.location?.pathname;
  const event = {
    zetaParams: zetaParams,
    domain: parseDomain(page, {noLeadingWww: true}),
    page: page,
    bid: {
      adId: args.bid?.adId,
      requestId: args.bid?.requestId,
      auctionId: args.bid?.auctionId,
      creativeId: args.bid?.creativeId,
      bidder: args.bid?.bidderCode,
      dspId: args.bid?.dspId,
      mediaType: args.bid?.mediaType,
      size: args.bid?.size,
      adomain: args.bid?.adserverTargeting?.hb_adomain,
      timeToRespond: args.bid?.timeToRespond,
      cpm: args.bid?.cpm,
      adUnitCode: args.bid?.adUnitCode,
      floorData: args.bid?.floorData
    },
    device: {
      ua: navigator.userAgent
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
      bids: br?.bids?.map(b => {
        const mediaType = b?.mediaTypes?.video ? VIDEO : (b?.mediaTypes?.banner ? BANNER : undefined);
        let floor;
        if (typeof b?.getFloor === 'function') {
          try {
            const floorInfo = b.getFloor({
              currency: 'USD',
              mediaType: mediaType,
              size: '*'
            });
            if (floorInfo && !isNaN(parseFloat(floorInfo.floor))) {
              floor = parseFloat(floorInfo.floor);
            }
          } catch (e) {
            // ignore floor lookup errors
          }
        }

        return {
          bidId: b?.bidId,
          auctionId: b?.auctionId,
          bidder: b?.bidder,
          mediaType: mediaType,
          sizes: b?.sizes,
          device: b?.ortb2?.device,
          adUnitCode: b?.adUnitCode,
          floor: floor
        };
      })
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
      cpm: br?.cpm,
      adUnitCode: br?.adUnitCode,
      dspId: br?.dspId
    }))
  }
  sendEvent(EVENTS.AUCTION_END, event);
}

function bidTimeoutHandler(args) {
  const event = {
    zetaParams: zetaParams,
    domain: args.find(t => t?.ortb2?.site?.domain)?.ortb2?.site?.domain,
    page: args.find(t => t?.ortb2?.site?.page)?.ortb2?.site?.page,
    timeouts: args.map(t => {
      const mediaType = t?.mediaTypes?.video ? VIDEO : (t?.mediaTypes?.banner ? BANNER : undefined);
      let floor;
      if (typeof t?.getFloor === 'function') {
        try {
          const floorInfo = t.getFloor({
            currency: 'USD',
            mediaType: mediaType,
            size: '*'
          });
          if (floorInfo && !isNaN(parseFloat(floorInfo.floor))) {
            floor = parseFloat(floorInfo.floor);
          }
        } catch (e) {
          // ignore floor lookup errors
        }
      }
      return {
        bidId: t?.bidId,
        auctionId: t?.auctionId,
        bidder: t?.bidder,
        mediaType: mediaType,
        sizes: t?.sizes,
        timeout: t?.timeout,
        device: t?.ortb2?.device,
        adUnitCode: t?.adUnitCode,
        floor: floor
      }
    })
  }
  sendEvent(EVENTS.BID_TIMEOUT, event);
}

/// /////////// ADAPTER DEFINITION ///////////////////////////

const baseAdapter = adapter({analyticsType: 'endpoint'});
const zetaAdapter = Object.assign({}, baseAdapter, {

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
