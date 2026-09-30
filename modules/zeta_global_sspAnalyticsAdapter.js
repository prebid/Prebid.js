import { logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';

import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { config } from '../src/config.js';
import { getRefererInfo, parseDomain } from '../src/refererDetection.js';
import { BANNER, VIDEO } from "../src/mediaTypes.js";

const ZETA_GVL_ID = 833;
const ADAPTER_CODE = 'zeta_global_ssp';
const BASE_URL = 'https://ssp.disqus.com/prebid/event';
const LOG_PREFIX = 'ZetaGlobalSsp-Analytics: ';
const MAX_ERROR_RESPONSE_TEXT_LENGTH = 500;

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

function getMediaTypeFromBidRequest(b) {
  return b?.mediaTypes?.video ? VIDEO : (b?.mediaTypes?.banner ? BANNER : undefined);
}

function resolveFloorFromBidRequest(b) {
  const mediaType = getMediaTypeFromBidRequest(b);
  if (typeof b?.getFloor !== 'function') {
    return undefined;
  }
  try {
    const floorInfo = b.getFloor({
      currency: 'USD',
      mediaType: mediaType,
      size: '*'
    });
    const floor = parseFloat(floorInfo?.floor);
    return !isNaN(floor) ? floor : undefined;
  } catch (e) {
    return undefined;
  }
}

function buildBidRequestBid(b) {
  return {
    bidId: b?.bidId,
    auctionId: b?.auctionId,
    bidder: b?.bidder,
    mediaType: getMediaTypeFromBidRequest(b),
    sizes: b?.sizes,
    device: b?.ortb2?.device,
    adUnitCode: b?.adUnitCode,
    floor: resolveFloorFromBidRequest(b)
  };
}

function resolveRenderSiteContext(args = {}) {
  const pageUrl = config.getConfig('pageUrl');
  const docLocation = args.doc?.location;
  const docPage = docLocation?.host && docLocation?.pathname
    ? docLocation.host + docLocation.pathname
    : undefined;
  const page = pageUrl || docPage || args.bid?.refererInfo?.page || getRefererInfo().page;
  const domain = parseDomain(page, { noLeadingWww: true }) ||
    args.bid?.refererInfo?.domain ||
    getRefererInfo().domain;
  return { page, domain };
}

function resolveBidderRequestSiteContext(bidderRequest) {
  const refererInfo = getRefererInfo();
  return {
    page: bidderRequest?.refererInfo?.page || refererInfo.page,
    domain: bidderRequest?.refererInfo?.domain || refererInfo.domain
  };
}

function resolveTimeoutSiteContext(timeouts = []) {
  const siteBid = timeouts.find(t => t?.ortb2?.site?.page || t?.ortb2?.site?.domain);
  const refererInfo = getRefererInfo();
  return {
    page: siteBid?.ortb2?.site?.page || refererInfo.page,
    domain: siteBid?.ortb2?.site?.domain || refererInfo.domain
  };
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

function buildDevice(bid) {
  const device = bid?.ortb2?.device;
  if (device) {
    return { ...device, ua: device.ua || navigator.userAgent };
  }
  return { ua: navigator.userAgent };
}

function normalizeError(error) {
  if (error == null) {
    return undefined;
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  const normalized = {};
  if (error.message != null) {
    normalized.message = error.message;
  }
  if (error.status != null) {
    normalized.status = error.status;
  }
  if (error.statusText != null) {
    normalized.statusText = error.statusText;
  }
  if (error.responseText != null) {
    normalized.responseText = String(error.responseText).slice(0, MAX_ERROR_RESPONSE_TEXT_LENGTH);
  }
  if (Object.keys(normalized).length === 0) {
    return { message: String(error) };
  }
  return normalized;
}

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

function adRenderSucceededHandler(args) {
  const { page, domain } = resolveRenderSiteContext(args);
  const event = {
    zetaParams: zetaParams,
    domain: domain,
    page: page,
    bid: buildReceivedBid(args.bid),
    device: buildDevice(args.bid)
  };
  sendEvent(EVENTS.AD_RENDER_SUCCEEDED, event);
}

function adRenderFailedHandler(args) {
  const { page, domain } = resolveRenderSiteContext(args);
  const event = {
    zetaParams: zetaParams,
    domain: domain,
    page: page,
    adId: args.adId,
    reason: args.reason,
    message: args.message,
    bid: buildReceivedBid(args.bid),
    device: buildDevice(args.bid)
  };
  sendEvent(EVENTS.AD_RENDER_FAILED, event);
}

function auctionEndHandler(args) {
  const event = {
    zetaParams: zetaParams,
    bidderRequests: args.bidderRequests?.map(br => {
      const siteContext = resolveBidderRequestSiteContext(br);
      return {
        bidderCode: br?.bidderCode,
        domain: siteContext.domain,
        page: siteContext.page,
        bids: br?.bids?.map(buildBidRequestBid)
      };
    }),
    bidsReceived: args.bidsReceived?.map(buildReceivedBid)
  };
  sendEvent(EVENTS.AUCTION_END, event);
}

function bidTimeoutHandler(args) {
  const siteContext = resolveTimeoutSiteContext(args);
  const event = {
    zetaParams: zetaParams,
    domain: siteContext.domain,
    page: siteContext.page,
    timeouts: args.map(t => ({
      ...buildBidRequestBid(t),
      timeout: t?.timeout
    }))
  };
  sendEvent(EVENTS.BID_TIMEOUT, event);
}

function bidderErrorHandler(args) {
  const bidderRequest = args.bidderRequest;
  const siteContext = resolveBidderRequestSiteContext(bidderRequest);
  const event = {
    zetaParams: zetaParams,
    error: normalizeError(args.error),
    bidderRequest: {
      bidderCode: bidderRequest?.bidderCode,
      domain: siteContext.domain,
      page: siteContext.page,
      bids: bidderRequest?.bids?.map(buildBidRequestBid)
    }
  };
  sendEvent(EVENTS.BIDDER_ERROR, event);
}

function browserInterventionHandler(args) {
  const { page, domain } = resolveRenderSiteContext(args);
  const event = {
    zetaParams: zetaParams,
    domain: domain,
    page: page,
    adId: args.adId,
    intervention: args.intervention,
    bid: buildReceivedBid(args.bid),
    device: buildDevice(args.bid)
  };
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
