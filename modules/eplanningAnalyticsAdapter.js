import { logError } from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';

const analyticsType = 'endpoint';
const EPL_HOST = 'https://ads.us.e-planning.net/hba/1/';

function auctionEndHandler(args) {
  return {auctionId: args.auctionId};
}

function auctionInitHandler(args) {
  return {
    auctionId: args.auctionId,
    time: args.timestamp
  };
}

function bidRequestedHandler(args) {
  return {
    auctionId: args.auctionId,
    time: args.start,
    bidder: args.bidderCode,
    bids: args.bids.map(function(bid) {
      return {
        time: bid.startTime,
        bidder: bid.bidder,
        placementCode: bid.placementCode,
        auctionId: bid.auctionId,
        sizes: bid.sizes
      };
    }),
  };
}

function bidResponseHandler(args) {
  return {
    bidder: args.bidder,
    size: args.size,
    auctionId: args.auctionId,
    cpm: args.cpm,
    time: args.responseTimestamp,
  };
}

function bidWonHandler(args) {
  return {
    auctionId: args.auctionId,
    size: args.width + 'x' + args.height,
  };
}

function bidTimeoutHandler(args) {
  return args.map(function(bid) {
    return {
      bidder: bid.bidder,
      auctionId: bid.auctionId
    };
  })
}

function callHandler(evtype, args) {
  let handler = null;

  if (evtype === EVENTS.AUCTION_INIT) {
    handler = auctionInitHandler;
    eplAnalyticsAdapter.context.events = [];
  } else if (evtype === EVENTS.AUCTION_END) {
    handler = auctionEndHandler;
  } else if (evtype === EVENTS.BID_REQUESTED) {
    handler = bidRequestedHandler;
  } else if (evtype === EVENTS.BID_RESPONSE) {
    handler = bidResponseHandler
  } else if (evtype === EVENTS.BID_TIMEOUT) {
    handler = bidTimeoutHandler;
  } else if (evtype === EVENTS.BID_WON) {
    handler = bidWonHandler;
  }

  if (handler) {
    eplAnalyticsAdapter.context.events.push({ec: evtype, p: handler(args)});
  }
}

var eplAnalyticsAdapter = Object.assign(adapter(
  {
    EPL_HOST,
    analyticsType
  }),
{
  track({eventType, args}) {
    if (typeof args !== 'undefined') {
      callHandler(eventType, args);
    }

    if (eventType === EVENTS.AUCTION_END) {
      try {
        let strjson = JSON.stringify(eplAnalyticsAdapter.context.events);
        ajax(eplAnalyticsAdapter.context.host + eplAnalyticsAdapter.context.ci + '?d=' + encodeURIComponent(strjson));
      } catch (err) {}
    }
  }
}
);

eplAnalyticsAdapter.originEnableAnalytics = eplAnalyticsAdapter.enableAnalytics;

eplAnalyticsAdapter.enableAnalytics = function (config) {
  if (!config.options.ci) {
    logError('Client ID (ci) option is not defined. Analytics won\'t work');
    return;
  }

  eplAnalyticsAdapter.context = {
    events: [],
    host: config.options.host || EPL_HOST,
    ci: config.options.ci
  };

  eplAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: eplAnalyticsAdapter,
  code: 'eplanning'
});

export default eplAnalyticsAdapter;
