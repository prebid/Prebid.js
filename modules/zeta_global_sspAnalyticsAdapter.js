import { logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { config } from '../src/config.js';
import { parseDomain } from '../src/refererDetection.js';
import { BANNER, VIDEO } from "../src/mediaTypes.js";

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

function getPage(args = {}) {
  return config.getConfig('pageUrl') || args.doc?.location?.host + args.doc?.location?.pathname;
}

function buildReceivedBid(bid) {
  return {
    adId: bid?.adId,
    requestId: bid?.requestId,
    auctionId: bid?.auctionId,
    creativeId: bid?.creativeId,
    bidder: bid?.bidderCode || bid?.bidder,
    dspId: bid?.dspId,
    mediaType: bid?.mediaType,
    size: bid?.size,
    adomain: bid?.adserverTargeting?.hb_adomain,
    timeToRespond: bid?.timeToRespond,
    cpm: bid?.cpm,
    adUnitCode: bid?.adUnitCode,
    floorData: bid?.floorData
  };
}

function normalizeError(error) {
  if (error == null) {
    return undefined;
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return {
    message: error.message,
    status: error.status,
    statusText: error.statusText,
    responseText: error.responseText
  };
}

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

function adRenderSucceededHandler(args) {
  const page = getPage(args);
  const event = {
    zetaParams: zetaParams,
    domain: parseDomain(page, { noLeadingWww: true }),
    page: page,
    bid: buildReceivedBid(args.bid),
    device: {
      ua: navigator.userAgent
    }
  }
  sendEvent(EVENTS.AD_RENDER_SUCCEEDED, event);
}

function adRenderFailedHandler(args) {
  const page = getPage(args);
  const event = {
    zetaParams: zetaParams,
    domain: parseDomain(page, { noLeadingWww: true }),
    page: page,
    adId: args.adId,
    reason: args.reason,
    message: args.message,
    bid: buildReceivedBid(args.bid),
    device: {
      ua: navigator.userAgent
    }
  }
  sendEvent(EVENTS.AD_RENDER_FAILED, event);
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

function bidderErrorHandler(args) {
  const bidderRequest = args.bidderRequest;
  const event = {
    zetaParams: zetaParams,
    error: normalizeError(args.error),
    bidderRequest: {
      bidderCode: bidderRequest?.bidderCode,
      domain: bidderRequest?.refererInfo?.domain,
      page: bidderRequest?.refererInfo?.page,
      bids: bidderRequest?.bids?.map(b => {
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
    }
  }
  sendEvent(EVENTS.BIDDER_ERROR, event);
}

function browserInterventionHandler(args) {
  const page = getPage(args);
  const event = {
    zetaParams: zetaParams,
    domain: parseDomain(page, { noLeadingWww: true }),
    page: page,
    adId: args.adId,
    intervention: args.intervention,
    bid: buildReceivedBid(args.bid),
    device: {
      ua: navigator.userAgent
    }
  }
  sendEvent(EVENTS.BROWSER_INTERVENTION, event);
}

/// /////////// ADAPTER DEFINITION ///////////////////////////

const baseAdapter = adapter({ analyticsType: 'endpoint' });
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

  track({ eventType, args }) {
    switch (eventType) {
      case EVENTS.AD_RENDER_SUCCEEDED:
        adRenderSucceededHandler(args);
        break;
      case EVENTS.AD_RENDER_FAILED:
        adRenderFailedHandler(args);
        break;
      case EVENTS.AUCTION_END:
        auctionEndHandler(args);
        break;
      case EVENTS.BID_TIMEOUT:
        bidTimeoutHandler(args);
        break;
      case EVENTS.BIDDER_ERROR:
        bidderErrorHandler(args);
        break;
      case EVENTS.BROWSER_INTERVENTION:
        browserInterventionHandler(args);
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
