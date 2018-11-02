import {ajax} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import find from 'core-js/library/fn/array/find';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';
import { logInfo, generateUUID, timestamp } from 'src/utils';

const analyticsType = 'endpoint';
const rivrUsrIdCookieKey = 'rvr_usr_id';
const DEFAULT_HOST = 'tracker.rivr.simplaex.com';
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
        logInfo(`CONSTANTS.EVENTS.AUCTION_INIT rivrAnalytics.context.auctionObject`, rivrAnalytics.context.auctionObject);
        if (rivrAnalytics.context.queue) {
          rivrAnalytics.context.queue.init();
        }
        if (rivrAnalytics.context.auctionObject) {
          rivrAnalytics.context.auctionObject = createNewAuctionObject();
          saveUnoptimisedAdUnits();
          fetchLocalization();
        }
        handler = trackAuctionInit;
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

export function sendAuction() {
  if (rivrAnalytics.context.authToken) {
    removeEmptyProperties(rivrAnalytics.context.auctionObject);
    let auctionObject = rivrAnalytics.context.auctionObject;
    let req = Object.assign({}, {Auction: auctionObject});
    rivrAnalytics.context.auctionObject = createNewAuctionObject();
    logInfo('sending request to analytics => ', req);
    ajax(
      `http://${rivrAnalytics.context.host}/${rivrAnalytics.context.clientID}/auctions`,
      () => {},
      JSON.stringify(req),
      {
        contentType: 'application/json',
        customHeaders: {
          'Authorization': 'Basic ' + rivrAnalytics.context.authToken
        }
      }
    );
  }
};

export function sendImpressions() {
  if (rivrAnalytics.context.authToken) {
    let impressions = rivrAnalytics.context.queue.popAll();
    if (impressions.length !== 0) {
      let impressionsReq = Object.assign({}, {impressions});
      logInfo('sending impressions request to analytics => ', impressionsReq);
      ajax(
        `http://${rivrAnalytics.context.host}/${rivrAnalytics.context.clientID}/impressions`,
        () => {},
        JSON.stringify(impressionsReq),
        {
          contentType: 'application/json',
          customHeaders: {
            'Authorization': 'Basic ' + rivrAnalytics.context.authToken
          }
        }
      );
    }
  }
};

function trackAuctionInit(args) {
  rivrAnalytics.context.auctionTimeStart = Date.now();
  rivrAnalytics.context.auctionObject.id = args.auctionId;
};

function trackBidWon(args) {
  setWinningBidStatus(args);
};

function setWinningBidStatus(args) {
  let auctionObject = rivrAnalytics.context.auctionObject;
  const bidderObjectForThisWonBid = find(auctionObject.bidders, (bidder) => {
    return bidder.id === args.bidderCode;
  });
  if (bidderObjectForThisWonBid) {
    const bidObjectForThisWonBid = find(bidderObjectForThisWonBid.bids, (bid) => {
      return bid.impId === args.adUnitCode;
    });
    if (bidObjectForThisWonBid) {
      bidObjectForThisWonBid.status = 1;
    }
  }
};

export function trackAuctionEnd(args) {
  rivrAnalytics.context.auctionTimeEnd = Date.now();
  rivrAnalytics.context.auctionObject.bidders = buildBiddersArrayFromAuctionEnd(args);
  rivrAnalytics.context.auctionObject.impressions = buildImpressionsArrayFromAuctionEnd(args);
};

function buildImpressionsArrayFromAuctionEnd(auctionEndEvent) {
  return auctionEndEvent.adUnits.map((adUnit) => {
    const impression = {};
    impression.id = adUnit.code;
    impression.adType = 'unknown';
    impression.acceptedSizes = [];
    const bidReceivedForThisAdUnit = find(auctionEndEvent.bidsReceived, (bidReceived) => {
      return adUnit.code === bidReceived.adUnitCode;
    });
    if (adUnit.mediaTypes) {
      if (adUnit.mediaTypes.banner) {
        buildAdTypeDependentFieldsForImpression(impression, 'banner', adUnit, bidReceivedForThisAdUnit);
      } else if (adUnit.mediaTypes.video) {
        buildAdTypeDependentFieldsForImpression(impression, 'video', adUnit, bidReceivedForThisAdUnit);
      }
    }
    return impression;
  });
}

function buildAdTypeDependentFieldsForImpression(impression, adType, adUnit, bidReceivedForThisAdUnit) {
  impression.adType = adType;
  impression.acceptedSizes = adUnit.mediaTypes[adType].sizes.map((acceptedSize) => {
    return {
      w: acceptedSize[0],
      h: acceptedSize[1]
    };
  });
  if (bidReceivedForThisAdUnit) {
    impression[adType] = {
      w: bidReceivedForThisAdUnit.width,
      h: bidReceivedForThisAdUnit.height
    };
  }
}

function buildBiddersArrayFromAuctionEnd(auctionEndEvent) {
  return auctionEndEvent.bidderRequests.map((bidderRequest) => {
    const bidder = {};
    bidder.id = bidderRequest.bidderCode;
    bidder.bids = bidderRequest.bids.map((bid) => {
      const bidReceivedForThisRequest = find(auctionEndEvent.bidsReceived, (bidReceived) => {
        return bidderRequest.bidderCode === bidReceived.bidderCode &&
          bid.bidId === bidReceived.adId &&
          bid.adUnitCode === bidReceived.adUnitCode;
      });
      return {
        adomain: [''],
        clearPrice: 0.0,
        impId: bid.adUnitCode,
        price: bidReceivedForThisRequest ? bidReceivedForThisRequest.cpm : 0.0,
        status: 0
      };
    });
    return bidder;
  });
}

function trackBidTimeout(args) {
  return [args];
};

export function fetchLocalization() {
  if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
      if (permission.status === 'granted') {
        navigator.geolocation.getCurrentPosition((position) => {
          setAuctionAbjectPosition(position);
        });
      }
    });
  }
}

export function setAuctionAbjectPosition(position) {
  rivrAnalytics.context.auctionObject.device.geo.lat = position.coords.latitude;
  rivrAnalytics.context.auctionObject.device.geo.long = position.coords.longitude;
}

function getPlatformType() {
  if (navigator.userAgent.match(/mobile/i) || navigator.userAgent.match(/iPad|Android|Touch/i)) {
    return 1;
  } else {
    return 2;
  }
};

export function reportClickEvent(event) {
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
  ajax(
    `http://${rivrAnalytics.context.host}/${rivrAnalytics.context.clientID}/clicks`,
    () => {},
    JSON.stringify(req),
    {
      contentType: 'application/json',
      customHeaders: {
        'Authorization': 'Basic ' + rivrAnalytics.context.authToken
      }
    }
  );
};

function addClickHandler(bannerId) {
  pinHandlerToHTMLElement(bannerId, dataLoaderForHandler, addClickListener);
};

function addDisplayedImpHandler(bannerId) {
  pinHandlerToHTMLElement(bannerId, dataLoaderForHandler, impHandler);
};

export function pinHandlerToHTMLElement(elementId, dataLoaderForHandler, specializedHandler) {
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

export function dataLoaderForHandler(element, specializedHandler) {
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

export function createNewAuctionObject() {
  const auction = {
    id: '',
    publisher: rivrAnalytics.context.clientID,
    blockedCategories: [''],
    timestamp: timestamp(),
    user: {
      id: rivrAnalytics.context.userId
    },
    site: {
      domain: window.location.host,
      page: window.location.pathname,
      categories: rivrAnalytics.context.siteCategories
    },
    impressions: [],
    bidders: [],
    device: {
      userAgent: navigator.userAgent,
      browser: '',
      deviceType: getPlatformType()
    },
    'ext.rivr.originalvalues': [],
    'ext.rivr.optimiser': localStorage.getItem('rivr_should_optimise') || 'unoptimised',
    modelVersion: localStorage.getItem('rivr_model_version') || null,
  }

  return auction;
};

export function saveUnoptimisedAdUnits() {
  let units = rivrAnalytics.context.adUnits;
  if (units) {
    if (units.length > 0) {
      let allUnits = concatAllUnits(units);
      allUnits.forEach((adUnit) => {
        adUnit.bids.forEach((bid) => {
          let configForBidder = fetchConfigForBidder(bid.bidder);
          if (configForBidder) {
            let unOptimisedParamsField = createUnOptimisedParamsField(bid, configForBidder);
            rivrAnalytics.context.auctionObject['ext.rivr.originalvalues'].push(unOptimisedParamsField);
          }
        })
      });
    }
  }
};

export function concatAllUnits(units) {
  return Array.prototype.concat.apply([], units);
}

export function createUnOptimisedParamsField(bid, config) {
  let floorPriceLabel = config['floorPriceLabel'];
  let currencyLabel = config['currencyLabel'];
  let pmpLabel = config['pmpLabel'];
  return {
    'ext.rivr.demand_source_original': bid.bidder,
    'ext.rivr.bidfloor_original': bid.params[floorPriceLabel],
    'ext.rivr.currency_original': bid.params[currencyLabel],
    'ext.rivr.pmp_original': bid.params[pmpLabel],
  }
}

function fetchConfigForBidder(bidderName) {
  let config = localStorage.getItem('rivr_config_string');
  if (config) {
    let parsed = JSON.parse(config);
    return parsed.demand.map((bidderConfig) => {
      if (bidderName === bidderConfig.partner) {
        return bidderConfig
      };
    })[0];
  }
}
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

function removeEmptyProperties(obj) {
  Object.keys(obj).forEach(function(key) {
    if (obj[key] && typeof obj[key] === 'object') removeEmptyProperties(obj[key])
    else if (obj[key] == null) delete obj[key]
  });
};

function getCookie(name) {
  var value = '; ' + document.cookie;
  var parts = value.split('; ' + name + '=');
  if (parts.length == 2) return parts.pop().split(';').shift();
}

function storeAndReturnRivrUsrIdCookie() {
  return document.cookie = 'rvr_usr_id=' + generateUUID();
}

// save the base class function
rivrAnalytics.originEnableAnalytics = rivrAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
rivrAnalytics.enableAnalytics = (config) => {
  let copiedUnits;
  if (config.options.adUnits) {
    let stringifiedAdUnits = JSON.stringify(config.options.adUnits);
    copiedUnits = JSON.parse(stringifiedAdUnits);
  }
  rivrAnalytics.context = {
    userId: getCookie(rivrUsrIdCookieKey) || storeAndReturnRivrUsrIdCookie(),
    host: config.options.host || DEFAULT_HOST,
    auctionObject: {},
    adUnits: copiedUnits,
    siteCategories: config.options.siteCategories || [],
    clientID: config.options.clientID,
    authToken: config.options.authToken,
    queue: new ExpiringQueue(sendImpressions, sendAuction, config.options.queueTimeout || DEFAULT_QUEUE_TIMEOUT)
  };

  let bannersIds = config.options.bannersIds;
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
