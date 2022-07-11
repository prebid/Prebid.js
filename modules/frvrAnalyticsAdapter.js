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
  const o = {}
  if (args.auctionId) {
    o.auctionId = args.auctionId;
  }
  if (args.timestamp) {
    o.timestamp = args.timestamp;
  }
  if (args.adUnits) {
    o.adUnits = mapAdUnits(args.adUnits);
  }

  handleEvent("hb_auction_init", o);
}

/**
 *
 * @param args
 */
function handleBidRequested(args) {
  const o = {}
  if(args.auctionId) {
    o.auctionId = args.auctionId;
  }
  if(args.bidderCode) {
    o.bidderCode = args.bidderCode;
  }
  if(args.start) {
    o.start = args.start;
  }
  if (args.timeout) {
    o.timeout = args.timeout;
  }
  if (args.bidderRequestId) {
    o.bidderRequestId = args.bidderRequestId;
  }

  if (args.bids) {
    o.bids = args.bids
      .map(e => {
        return {
          bidder: e.bidder,
          params: e.params,
          bidId: e.bidId,
          adUnitCode: e.adUnitCode,
          transactionId: e.transactionId,
          bidderRequestId: e.bidderRequestId
        }
      });
  }

  handleEvent("hb_bid_request", o);
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
  var o = {};
  if (args.bidderCode) {
    o.bidderCode = args.bidderCode;
  }
  if (args.adId) {
    o.adId = args.adId;
  }
  if (args.width) {
    o.size = [args.width, args.height];
  }
  if (args.cpm) {
    o.cpm = args.cpm;
  }
  if (args.creativeId) {
    o.creativeId = args.creativeId;
  }
  if (args.currency) {
    o.currency = args.currency;
  }
  if (args.auctionId) {
    o.auctionId = args.auctionId;
  }
  if (args.adUnitCode) {
    o.adUnitCode = args.adUnitCode;
  }
  if (args.timeToRespond) {
    o.timeToRespond = args.timeToRespond;
  }
  if (args.requestTimestamp) {
    o.requestTimestamp = args.requestTimestamp;
  }
  if (args.responseTimestamp) {
    o.responseTimestamp = args.responseTimestamp;
  }

  handleEvent("hb_bid_adjustment", o);
}

/**
 *
 * @param args
 */
function handleBidderDone(args) {
  const o = {}
  if(args.auctionId) {
    o.auctionId = args.auctionId;
  }
  if(args.bidderCode) {
    o.bidderCode = args.bidderCode;
  }
  if(args.start) {
    o.start = args.start;
  }
  if (args.timeout) {
    o.timeout = args.timeout;
  }
  if (args.bidderRequestId) {
    o.bidderRequestId = args.bidderRequestId;
  }
  if (args.serverResponseTimeMs) {
    o.serverResponseTimeMs = args.serverResponseTimeMs;
  }

  if (args.bids) {
    o.bids = args.bids
      .map(e => {
        return {
          bidder: e.bidder,
          params: e.params,
          bidId: e.bidId,
          adUnitCode: e.adUnitCode,
          transactionId: e.transactionId,
          bidderRequestId: e.bidderRequestId
        }
      });
  }

  handleEvent("hb_bidder_done", o);
}

/**
 *
 * @param args
 */
function handleAuctionEnd(args) {
  var o = {};
  if (args.auctionId) {
    o.auctionId = args.auctionId;
  }
  if (args.timestamp) {
    o.timestamp = args.timestamp;
  }
  if(args.auctionEnd) {
    o.auctionEnd = args.auctionEnd;
  }
  if (args.adUnits) {
    o.adUnits = mapAdUnits(args.adUnits);
  }
  if (args.bidderRequests) {
    o.bidderRequests = mapBidderRequests(args.bidderRequests);
  }
  if (args.bidsReceived) {
    o.bidsReceived = mapBids(args.bidsReceived);
  }
  if (args.noBids) {
    o.noBids = mapBids(args.noBids);
  }
  if (args.winningBids) {
    o.winningBids = mapBids(args.winningBids);
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

// Utils

function mapAdUnits(adUnits) {
  if (!adUnits) {
    return [];
  }
  return adUnits.map(e => {
    return {
      code: e.code,
      sizes: e.sizes,
      bidders: mapBidders(e.bids)
    }
  });
}

function mapBidders(bids) {
  if (!bids) {
    return [];
  }

  return bids.map(e => {
    return {
      bidder: e.bidder,
      params: e.params
    }
  })
}

function mapBidderRequests(bidsReqs) {
  if (!bidsReqs) {
    return [];
  }

  return bidsReqs.map(e => {
    return {
      bidderCode: e.bidderCode,
      auctionId: e.auctionId,
      bidderRequestId: e.bidderRequestId,
      bids: e.bids.map( b => {
        return {
          bidder: b.bidder,
          params: b.params,
          bidId: b.bidId,
          adUnitCode: b.adUnitCode,
          bidderRequestId: b.bidderRequestId,
          serverResponseTimeMs: b.serverResponseTimeMs
        }
      }),
      auctionStart: e.auctionStart,
      timeout: e.timeout,
      start: e.start,
      serverResponseTimeMs: e.serverResponseTimeMs
    }
  })
}

function mapBids(bids) {
  if (!bids) {
    return []
  }

  return bids.map(b => {
    const r = {};
    if (b.bidderCode) {
      r.bidderCode = b.bidderCode;
    }
    if (b.bidder) {
      r.bidder = b.bidder;
    }
    if (b.params) {
      r.params = b.params;
    }
    if (b.transactionId) {
      r.transactionId = b.transactionId;
    }
    if (b.width) {
      r.size = [b.width, b.height];
    }
    if (b.adId) {
      r.adId = b.adId;
    }
    if (b.requestId) {
      r.requestId = b.requestId;
    }
    if (b.cpm) {
      r.cpm = b.cpm;
    }
    if (b.creativeId) {
      r.creativeId = b.creativeId;
    }
    if (b.currency) {
      r.currency = b.currency;
    }
    if (b.auctionId) {
      r.auctionId = b.auctionId;
    }
    if (b.responseTimestamp) {
      r.responseTimestamp = b.responseTimestamp;
    }
    if (b.requestTimestamp) {
      r.requestTimestamp = b.requestTimestamp;
    }
    if (b.adUnitCode) {
      r.adUnitCode = b.adUnitCode;
    }
    if (b.timeToRespond) {
      r.timeToRespond = b.timeToRespond;
    }
    if (b.bidId) {
      r.bidId = b.bidId;
    }
    if (b.bidderRequestId) {
      r.bidderRequestId = b.bidderRequestId;
    }

    return r;
  });
}

//

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
