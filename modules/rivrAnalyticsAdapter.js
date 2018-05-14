import {ajax} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';
import { logInfo } from 'src/utils';

const analyticsType = 'endpoint';
const DEFAULT_HOST = 'integrations.rivr.simplaex.net/prebid';
const DEFAULT_QUEUE_TIMEOUT = 4000;

let rivrAnalytics = Object.assign(adapter({analyticsType}), {
  track({ eventType, args }) {
    if (!rivrAnalytics.context) {
      return;
    }
    logInfo(`ARGUMENTS FOR TYPE: ============= ${eventType}`, args);
    let handler = null;
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        if (rivrAnalytics.context.impressionsQueue) {
          rivrAnalytics.context.impressionsQueue.init();
        }
        handler = trackAuctionInit;
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        handler = trackBidRequest;
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        handler = trackBidResponse;
        break;
      case CONSTANTS.EVENTS.BID_WON:
        handler = trackBidWon;
        break;
      case CONSTANTS.EVENTS.BID_TIMEOUT:
        handler = trackBidTimeout;
        break;
      case CONSTANTS.EVENTS.AUCTION_END:
        handler = trackAuctionEnd;
        break;
    }
    if (handler) {
      if (handler == trackBidWon) {
        let impressions = handler(args);
        if (rivrAnalytics.context.impressionsQueue) {
          rivrAnalytics.context.impressionsQueue.push(impressions);
        }
      } else {
        handler(args)
      }
    }
  }
});

function sendAll() {
  let impressions = rivrAnalytics.context.impressionsQueue.popAll();
  let auctionObject = rivrAnalytics.context.auctionObject
  let req = Object.assign({}, {Auction: auctionObject});
  auctionObject = createAuctionObject();
  logInfo('sending request to analytics => ', req);
  ajax(`http://${rivrAnalytics.context.host}/auctions`, () => {
  }, JSON.stringify(req));

  if (impressions.length !== 0) {
    let impressionsReq = Object.assign({}, {impressions});
    logInfo('sending impressions request to analytics => ', impressionsReq);
    ajax(`http://${rivrAnalytics.context.host}/impressions`, () => {
    }, JSON.stringify(impressionsReq));
  }
}

function trackAuctionInit(args) {
  rivrAnalytics.context.auctionTimeStart = Date.now();
  rivrAnalytics.context.auctionObject.id = args.auctionId
}

function trackBidRequest(args) {
  setCurrentUserId(args);
}

function trackBidResponse(args) {
  let bidResponse = createBidResponse(args);
  rivrAnalytics.context.auctionObject.bidResponses.push(bidResponse)
}

function trackBidWon(args) {
  let auctionObject = rivrAnalytics.context.auctionObject;
  let bidResponse = createBidResponse(args)
  let impression = createImpression(args)
  let imp = createImp(args);
  auctionObject.bidResponses.push(bidResponse)
  auctionObject.imp.push(imp)

  return [impression];
}

function trackAuctionEnd(args) {
  rivrAnalytics.context.auctionTimeEnd = Date.now();
}

function trackBidTimeout(args) {
  return [args]
}

function setCurrentUserId(bidRequested) {
  let user = rivrAnalytics.context.auctionObject.user
  if (!user.id) {
    rivrAnalytics.context.pubId ? user.id = rivrAnalytics.context.pubId : user.id = bidRequested.bids[0].crumbs.pubcid
  }
}

function createBidResponse(bidResponseEvent) {
  return {
    timestamp: bidResponseEvent.responseTimestamp,
    status: bidResponseEvent.getStatusCode(),
    total_duration: bidResponseEvent.timeToRespond,
    bidderId: null,
    bidder_name: bidResponseEvent.bidder,
    cur: bidResponseEvent.currency,
    seatid: [
      {
        seat: null,
        bid: [
          {
            status: bidResponseEvent.getStatusCode(),
            clear_price: bidResponseEvent.cpm,
            attr: [],
            crid: bidResponseEvent.creativeId,
            cid: null,
            id: null,
            adid: bidResponseEvent.adId,
            adomain: [],
            iurl: null
          }
        ]
      }
    ]
  }
}

function createImpression(bidWonEvent) {
  return {
    timestamp: bidWonEvent.responseTimestamp,
    requestId: bidWonEvent.auctionId,
    chargePrice: bidWonEvent.adserverTargeting.hb_pb,
    publisherRevenue: bidWonEvent.cpm
  }
}

function createImp(bidWonEvent) {
  return {
    tagid: bidWonEvent.adUnitCode,
    displaymanager: null,
    displaymanagerver: null,
    secure: null,
    bidfloor: null,
    banner: {
      w: bidWonEvent.width,
      h: bidWonEvent.height,
      pos: null,
      expandable: [],
      api: []
    }
  }
}

function createAuctionObject() {
  return {
    id: null,
    timestamp: null,
    at: null,
    bcat: [],
    imp: [],
    app: {
      id: null,
      name: null,
      domain: null,
      bundle: null,
      cat: [],
      publisher: {
        id: null,
        name: null
      }
    },
    site: {
      id: null,
      name: null,
      domain: null,
      cat: [],
      publisher: {
        id: null,
        name: null
      }
    },
    device: {
      geo: {
        city: null,
        country: null,
        region: null,
        zip: null,
        type: null,
        metro: null
      },
      connectiontype: null,
      devicetype: null,
      osv: null,
      os: null,
      model: null,
      make: null,
      carrier: null,
      ip: null,
      didsha1: null,
      dpidmd5: null,
      ext: {
        uid: null
      }
    },
    user: {
      id: null,
      yob: null,
      gender: null,
    },
    bidResponses: []
  }
}
/**
 * Expiring queue implementation. Fires callback on elapsed timeout since last last update or creation.
 * @param callback
 * @param ttl
 * @constructor
 */
export function ExpiringQueue(callback, ttl, log) {
  let queue = [];
  let timeoutId;

  this.push = (event) => {
    if (event instanceof Array) {
      queue.push.apply(queue, event);
    } else {
      queue.push(event);
    }
    reset();
  };

  this.popAll = () => {
    let result = queue;
    queue = [];
    reset();
    return result;
  };
  /**
   * For test/debug purposes only
   * @return {Array}
   */
  this.peekAll = () => {
    return queue;
  };

  this.init = reset;

  function reset() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (queue.length) {
        callback();
      }
    }, ttl);
  }
}

// save the base class function
rivrAnalytics.originEnableAnalytics = rivrAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
rivrAnalytics.enableAnalytics = (config) => {
  rivrAnalytics.context = {
    host: config.options.host || DEFAULT_HOST,
    pubId: config.options.pubId,
    auctionObject: createAuctionObject(),
    impressionsQueue: new ExpiringQueue(sendAll, config.options.queueTimeout || DEFAULT_QUEUE_TIMEOUT)
  };
  logInfo('Rivr Analytics enabled with config', rivrAnalytics.context);
  rivrAnalytics.originEnableAnalytics(config);
};

adaptermanager.registerAnalyticsAdapter({
  adapter: rivrAnalytics,
  code: 'rivr'
});

export default rivrAnalytics
