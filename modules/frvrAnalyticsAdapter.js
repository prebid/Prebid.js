import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adapterManager from 'src/adapterManager';
import {logInfo} from '../src/utils.js';

const utils = require('src/utils');
const analyticsType = 'endpoint';
const MODULE = 'frvr';

/**
 *
 * @param args
 */
function handleAuctionInit(args) {
  handleEvent("hb_auction_init", args);
}

/**
 *
 * @param args
 */
function handleBidRequested(args) {
  handleEvent("hb_bid_request", args);
}

/**
 *
 * @param args
 */
function handleBidResponse(args) {
  var o = utils.deepClone(args);
  if (o && o.ad) {
    delete o["ad"];
  }
  handleEvent("hb_bid_response", o);
}

/**
 *
 * @param args
 */
function handleBidAdjustment(args) {
  var o = utils.deepClone(args);
  if (o && o.ad) {
    delete o.ad;
  }
  handleEvent("hb_bid_adjustment", o);
}

/**
 *
 * @param args
 */
function handleBidderDone(args) {
  handleEvent("hb_bidder_done", args);
}

/**
 *
 * @param args
 */
function handleAuctionEnd(args) {
  var o = utils.deepClone(args);

  if (o && o.bidsReceived) {
    for (var i = 0; i < o.bidsReceived.length; i++) {
      delete o.bidsReceived[i]["ad"];
    }
  }
  handleEvent("hb_auction_end", o);
}

/**
 *
 * @param args
 */
function handleBidWon(args) {
  var o = utils.deepClone(args);

  if (o && o["ad"]) {
    delete o["ad"];
  }
  handleEvent("hb_bid_won", o);
}

/**
 *
 * @param eventType
 * @param args
 */
function handleOtherEvents(eventType, args) {
  //
}

function handleEvent(name, data) {
  if (window.XS && window.XS.track && window.XS.track.event) {
    XS.track.event(name, undefined, data);
    return;
  }

  if (window.FRVR && FRVR.tracker && FRVR.tracker.logEvent) {
    window.FRVR.tracker.logEvent(name, data);
  }
}

let frvrAdapter = Object.assign(adapter({analyticsType}), {
  track({eventType, args}) {
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        handleAuctionInit(args);
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        handleBidRequested(args);
        break;
      case CONSTANTS.EVENTS.BID_ADJUSTMENT:
        handleBidAdjustment(args);
        break;
      case CONSTANTS.EVENTS.BIDDER_DONE:
        handleBidderDone(args);
        break;
      case CONSTANTS.EVENTS.AUCTION_END:
        handleAuctionEnd(args);
        break;
      case CONSTANTS.EVENTS.BID_WON:
        handleBidWon(args);
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        handleBidResponse(args);
        break;
      default:
        handleOtherEvents(eventType, args);
        break;
    }
  }
});

frvrAdapter.originEnableAnalytics = frvrAdapter.enableAnalytics;

frvrAdapter.enableAnalytics = function (config) {
  if (this.initConfig(config)) {
    logInfo('FRVR Analytics adapter enabled');
    frvrAdapter.originEnableAnalytics(config);
  }
};

frvrAdapter.initConfig = function (config) {
  return true;
};

adapterManager.registerAnalyticsAdapter({
  adapter: frvrAdapter,
  code: MODULE
});

export default frvrAdapter;
