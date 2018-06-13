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
  rivrAnalytics.context.auctionObject = fulfillAuctionObject();
  logInfo('sending request to analytics => ', req);
  ajax(`http://${rivrAnalytics.context.host}/${rivrAnalytics.context.clientID}/auctions`, () => {
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
  let bidRequest = args;
  rivrAnalytics.context.auctionObject.bidRequests.push(bidRequest);
};

function trackBidResponse(args) {
  let bidResponse = createBidResponse(args);
  rivrAnalytics.context.auctionObject.bidResponses.push(bidResponse);
};

function trackBidWon(args) {
  let auctionObject = rivrAnalytics.context.auctionObject;
  let auctionImpression = createAuctionImpression(args);
  auctionObject.imp.push(auctionImpression);
  assignBidWonStatusToResponse(args);
};

function trackAuctionEnd(args) {
  rivrAnalytics.context.auctionTimeEnd = Date.now();
  createEmptyBidResponses();
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
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
      if (permission.status === 'granted') {
        navigator.geolocation.getCurrentPosition((position) => {
          let deviceLocation = rivrAnalytics.context.auctionObject.device.geo;
          deviceLocation.lat = position.coords.latitude;
          deviceLocation.long = position.coords.longitude;
        });
      }
    });
  }
}

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
    seatbid: [
      {
        seat: null,
        bid: [
          {
            status: 2,
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

function createSingleEmptyBidResponse(bidResponse) {
  return {
    timestamp: bidResponse.start,
    total_duration: 'noResponseDuration',
    bidderId: null,
    bidder_name: bidResponse.bidder,
    cur: null,
    response: 'noBid',
    seatbid: []
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
  ajax(`http://${rivrAnalytics.context.host}/${rivrAnalytics.context.clientID}/clicks`, () => {
  }, JSON.stringify(req));
};

function addClickHandler(bannerId) {
  pinHandlerToHTMLElement(bannerId, dataLoaderForHandler, addClickListener);
};

function addDisplayedImpHandler(bannerId) {
  pinHandlerToHTMLElement(bannerId, dataLoaderForHandler, impHandler);
};

function pinHandlerToHTMLElement(elementId, dataLoaderForHandler, specializedHandler) {
  function waitForElement() {
    let element = document.getElementById(elementId);
    if (!element) {
      window.requestAnimationFrame(waitForElement);
    } else {
      dataLoaderForHandler(element, specializedHandler);
    }
  }
  waitForElement();
}

function dataLoaderForHandler(element, specializedHandler) {
  function waitForElement() {
    let iframe = element.getElementsByTagName('iframe')[0];
    if (!iframe) {
      window.requestAnimationFrame(waitForElement);
    } else {
      let displayedImpression = iframe.contentDocument.getElementsByTagName('img').length > 0;
      if (!displayedImpression) {
        window.requestAnimationFrame(waitForElement);
      } else {
        specializedHandler(iframe);
      }
    }
  }
  waitForElement();
};

function addClickListener(iframe) {
  iframe.contentDocument.addEventListener('click', reportClickEvent);
}

function impHandler(iframe) {
  let timestamp = new Date().toISOString();
  let requestId = generateUUID();
  let adContainerId = iframe.parentElement.parentElement.id;
  let impression = {
    timestamp,
    'request_id': requestId,
    'tag_id': adContainerId
  };
  if (rivrAnalytics.context.queue) {
    rivrAnalytics.context.queue.push(impression);
  }
}

function addHandlers(bannersIds) {
  bannersIds.forEach((bannerId) => {
    addClickHandler(bannerId);
    addDisplayedImpHandler(bannerId);
  })
};

function fulfillAuctionObject() {
  let newAuction = {
    id: null,
    timestamp: null,
    at: null,
    bcat: [],
    imp: [],
    app: {
      id: null,
      name: null,
      domain: window.location.href,
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
      domain: window.location.href,
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
    bidResponses: [],
    bidRequests: []
  }
  return newAuction;
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

function assignBidWonStatusToResponse(wonBid) {
  let wonBidId = wonBid.adId;
  rivrAnalytics.context.auctionObject.bidResponses.forEach((response) => {
    if (response.seatbid.length > 0) {
      let bidObjectResponse = response.seatbid[0].bid[0];
      if (wonBidId === bidObjectResponse.adid) {
        bidObjectResponse.status = 1
      }
    }
  });
};

function createEmptyBidResponses() {
  let unRespondedBidRequests = findAllUnrespondedBidRequests();
  unRespondedBidRequests.forEach((bid) => {
    let emptyBidResponse = createSingleEmptyBidResponse(bid);
    rivrAnalytics.context.auctionObject.bidResponses.push(emptyBidResponse);
  });
};

function findAllUnrespondedBidRequests() {
  let respondedBidIds = getAllRespondedBidIds();
  let bidRequests = rivrAnalytics.context.auctionObject.bidRequests;
  let allNotRespondedBidRequests = bidRequests.reduce((cache, requestBidder) => {
    let notRespondedBids = requestBidder.bids.filter((bid) => !respondedBidIds.includes(bid.bidId));
    notRespondedBids.forEach((bid) => bid.start = requestBidder.start);
    return cache.concat(notRespondedBids);
  }, []);
  return allNotRespondedBidRequests;
};

function getAllRespondedBidIds() {
  return rivrAnalytics.context.auctionObject.bidResponses.map((response) => response.seatbid[0].bid[0].adid);
};

// save the base class function
rivrAnalytics.originEnableAnalytics = rivrAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
rivrAnalytics.enableAnalytics = (config) => {
  rivrAnalytics.context = {
    host: config.options.host || DEFAULT_HOST,
    pubId: config.options.pubId,
    auctionObject: {},
    clientID: config.options.clientID,
    queue: new ExpiringQueue(sendImpressions, sendAuction, config.options.queueTimeout || DEFAULT_QUEUE_TIMEOUT)
  };
  let bannersIds = config.options.bannersIds
  if (bannersIds) {
    if (bannersIds.length > 0) {
      addHandlers(config.options.bannersIds);
    }
  }
  logInfo('Rivr Analytics enabled with config', rivrAnalytics.context);
  rivrAnalytics.originEnableAnalytics(config);
};

adaptermanager.registerAnalyticsAdapter({
  adapter: rivrAnalytics,
  code: 'rivr'
});

export default rivrAnalytics
