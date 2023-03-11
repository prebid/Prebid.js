import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import {logInfo} from '../src/utils.js';

const analyticsType = 'endpoint';
const MODULE = 'frvr';

/**
 *
 * @param args
 */
function handleAuctionEnd(args) {
  var o = {};
  if (args.auctionId) {
    o.auctionId = args.auctionId;
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
  handleEvent('hb_auction_end', o);
}

/**
 *
 * @param args
 */
function handleBidWon(args) {
  var o = {};

  if (!args) {
    return;
  }

  if (args['bidderCode']) {
    o.bidderCode = args['bidderCode'];
  }

  if (args['adId']) {
    o.adId = args['adId'];
  }

  if (args['requestId']) {
    o.requestId = args['requestId'];
  }

  if (args['transactionId']) {
    o.transactionId = args['transactionId'];
  }

  if (args['auctionId']) {
    o.auctionId = args['auctionId'];
  }

  if (args['mediaType']) {
    o.mediaType = args['mediaType'];
  }

  if (args['source']) {
    o.source = args['source'];
  }

  if (args['cpm']) {
    o.cpm = args['cpm'];
  }

  if (args['currency']) {
    o.currency = args['currency'];
  }

  if (args['creativeId']) {
    o.creativeId = args['creativeId'];
  }

  if (args['netRevenue']) {
    o.netRevenue = args['netRevenue'];
  }

  if (args['originalCpm']) {
    o.originalCpm = args['originalCpm'];
  }

  if (args['originalCurrency']) {
    o.originalCurrency = args['originalCurrency'];
  }

  if (args['adUnitCode']) {
    o.adUnitCode = args['adUnitCode'];
  }

  if (args['timeToRespond']) {
    o.timeToRespond = args['timeToRespond'];
  }

  if (args['size']) {
    o.size = args['size'];
  }

  if (args['status']) {
    o.status = args['status'];
  }

  handleEvent('hb_bid_won', o);
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
    window.XS.track.event(name, undefined, data);
    return;
  }

  if (window.FRVR && window.FRVR.tracker && window.FRVR.tracker.logEvent) {
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
      code: e.code
    }
  });
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
      timeout: e.timeout
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
    if (b.transactionId) {
      r.transactionId = b.transactionId;
    }
    if (b.width) {
      r.size = [b.width, b.height];
    }
    if (b.requestId) {
      r.requestId = b.requestId;
    }
    if (b.cpm) {
      r.cpm = b.cpm;
    }
    if (b.currency) {
      r.currency = b.currency;
    }
    if (b.auctionId) {
      r.auctionId = b.auctionId;
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
      case CONSTANTS.EVENTS.AUCTION_END:
        handleAuctionEnd(args);
        break;
      case CONSTANTS.EVENTS.BID_WON:
        handleBidWon(args);
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
