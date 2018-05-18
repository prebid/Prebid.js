import {ajax} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';
import { logInfo, generateUUID } from 'src/utils';

const analyticsType = 'endpoint';
const DEFAULT_HOST = 'integrations.rivr.simplaex.net';
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
        if (rivrAnalytics.context.queue) {
          rivrAnalytics.context.queue.init();
        }
        if (rivrAnalytics.context.auctionObject) {
          rivrAnalytics.context.auctionObject = fulfillAuctionObject();
          fetchLocalization();
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
      handler(args)
    }
  }
});

function sendAuction() {
  let auctionObject = rivrAnalytics.context.auctionObject;
  let req = Object.assign({}, {Auction: auctionObject});
  auctionObject = fulfillAuctionObject();
  logInfo('sending request to analytics => ', req);
  ajax(`http://${rivrAnalytics.context.host}/${rivrAnalytics.context.clientURL}/auctions`, () => {
  }, JSON.stringify(req));
};

function sendImpressions() {
  let impressions = rivrAnalytics.context.queue.popAll();
  if (impressions.length !== 0) {
    let impressionsReq = Object.assign({}, {impressions});
    logInfo('sending impressions request to analytics => ', impressionsReq);
    ajax(`http://${rivrAnalytics.context.host}/impressions`, () => {
    }, JSON.stringify(impressionsReq));
  }
};

function trackAuctionInit(args) {
  rivrAnalytics.context.auctionTimeStart = Date.now();
  rivrAnalytics.context.auctionObject.id = args.auctionId;
};

function trackBidRequest(args) {
  setCurrentPublisherId(args);
};

function trackBidResponse(args) {
  let bidResponse = createBidResponse(args);
  rivrAnalytics.context.auctionObject.bidResponses.push(bidResponse);
};

function trackBidWon(args) {
  let auctionObject = rivrAnalytics.context.auctionObject;
  let bidResponse = createBidResponse(args);
  let auctionImpression = createAuctionImpression(args);
  auctionObject.bidResponses.push(bidResponse);
  auctionObject.imp.push(auctionImpression);
};

function trackAuctionEnd(args) {
  rivrAnalytics.context.auctionTimeEnd = Date.now();
};

function trackBidTimeout(args) {
  return [args];
};

function setCurrentPublisherId(bidRequested) {
  let site = rivrAnalytics.context.auctionObject.site;
  let app = rivrAnalytics.context.auctionObject.app;
  let pubId = rivrAnalytics.context.pubId;
  if (!site.publisher.id || app.publisher.id) {
    if (pubId) {
      site.publisher.id = pubId;
      app.publisher.id = pubId;
    } else {
      site.publisher.id = bidRequested.bids[0].crumbs.pubcid;
      app.publisher.id = bidRequested.bids[0].crumbs.pubcid;
    }
  }
};

function fetchLocalization() {
  navigator.geolocation.getCurrentPosition((position) => {
    let deviceLocation = rivrAnalytics.context.auctionObject.device.geo;
    deviceLocation.lat = position.coords.latitude;
    deviceLocation.long = position.coords.longitude;
  });
};

function getPlatformType() {
  if (navigator.userAgent.match(/mobile/i)) {
    return 'Mobile';
  } else if (navigator.userAgent.match(/iPad|Android|Touch/i)) {
    return 'Tablet';
  } else {
    return 'Desktop';
  }
};

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
};

function createAuctionImpression(bidWonEvent) {
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
};

function reportClickEvent(event) {
  let link = event.currentTarget.getElementsByTagName('a')[0];
  let clickUrl;
  if (link) {
    clickUrl = link.getAttribute('href');
  }
  let timestamp = new Date().toISOString();
  let requestId = generateUUID();
  let req = {
    timestamp,
    'request_id': requestId,
    'click_url': clickUrl
  };
  logInfo('Sending click events with parameters: ', req);
  ajax(`http://${rivrAnalytics.context.host}/${rivrAnalytics.context.clientURL}/clicks`, () => {
  }, JSON.stringify(req));
};

function clickHandler(bannersIds) {
  setTimeout(function () {
    bannersIds.forEach(function (bannerId) {
      let doc = document.getElementById(bannerId);
      if (doc) {
        let iframe = doc.getElementsByTagName('iframe')[0];
        if (iframe) {
          iframe.contentDocument.addEventListener('click', reportClickEvent);
        }
      }
    });
  }, 1500);
};

function displayedImpressionHandler(bannersIds) {
  setTimeout(function () {
    bannersIds.forEach((bannerId) => {
      let doc = document.getElementById(bannerId);
      if (doc) {
        let iframe = doc.getElementsByTagName('iframe')[0];
        if (iframe) {
          let displayedImpressionImg = iframe.contentDocument.getElementsByTagName('img').length > 0;
          if (displayedImpressionImg) {
            let timestamp = new Date().toISOString();
            let requestId = generateUUID();
            let impression = {
              timestamp,
              'request_id': requestId,
            };
            if (rivrAnalytics.context.queue) {
              rivrAnalytics.context.queue.push(impression);
            }
          }
        }
      }
    });
    sendImpressions();
  }, 3000);
};

function fulfillAuctionObject() {
  return {
    id: null,
    timestamp: null,
    at: null,
    bcat: [],
    imp: [],
    app: {
      id: null,
      name: null,
      domain: rivrAnalytics.context.clientURL,
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
      domain: rivrAnalytics.context.clientURL,
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
      connectiontype: navigator.connection.effectiveType,
      devicetype: getPlatformType(),
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
};
/**
 * Expiring queue implementation. Fires callback on elapsed timeout since last last update or creation.
 * @param callback
 * @param ttl
 * @constructor
 */
export function ExpiringQueue(sendImpressions, sendAuction, ttl, log) {
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
      sendAuction();
      if (queue.length) {
        sendImpressions();
      }
    }, ttl);
  }
};

// save the base class function
rivrAnalytics.originEnableAnalytics = rivrAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
rivrAnalytics.enableAnalytics = (config) => {
  rivrAnalytics.context = {
    host: config.options.host || DEFAULT_HOST,
    pubId: config.options.pubId,
    auctionObject: {},
    clientURL: window.location.href,
    queue: new ExpiringQueue(sendImpressions, sendAuction, config.options.queueTimeout || DEFAULT_QUEUE_TIMEOUT)
  };
  clickHandler(config.options.bannersIds);
  displayedImpressionHandler(config.options.bannersIds);
  logInfo('Rivr Analytics enabled with config', rivrAnalytics.context);
  rivrAnalytics.originEnableAnalytics(config);
};

adaptermanager.registerAnalyticsAdapter({
  adapter: rivrAnalytics,
  code: 'rivr'
});

export default rivrAnalytics
