import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import * as adaptermanager from 'src/adaptermanager';
import {parse} from "../src/url";
import {ajax} from "../src/ajax"

const utils = require('src/utils');


/**
 * 1. UTM
 * 2. SessionId
 * 3. AdUnits
 * 4. PublisherId
 * 5. Content-type
 */


let options = new Config();
let roxotAdapter = Object.assign(adapter({analyticsType: 'endpoint'}), new RoxotAnalyticAdapter);

adaptermanager.registerAnalyticsAdapter({
  adapter: roxotAdapter,
  code: 'roxot'
});

export default roxotAdapter;


function RoxotAnalyticAdapter() {

  return {
    transport: new AjaxTransport,
    requestStack: new RequestStack,
    track({eventType, args}) {
      args = args || {};

      if(eventType === CONSTANTS.EVENTS.AUCTION_INIT){
        options.fill(args['config'])
      }

      let requestId = this.requestStack.presentRequestId(args['requestId']);
      let request = this.requestStack.ensureRequestPresented(requestId);

      let isImpression = eventType === CONSTANTS.EVENTS.BID_WON;
      let isBid = eventType === CONSTANTS.EVENTS.BID_ADJUSTMENT;
      let isBidAfterTimeout = (request.isFinished() && isBid);
      let isBidRequested = eventType === CONSTANTS.EVENTS.BID_REQUESTED;
      let isAuctionEnd = eventType === CONSTANTS.EVENTS.AUCTION_END;

      if (isBidRequested) {
        let adUnitCodes = args.bids.map((bid) => bid.placementCode);
        let auctions = adUnitCodes.map((code) => request.ensureAdUnitPresented(code));
        //todo check source
        let bidder = new Bidder(args);
        return auctions.forEach((auction) => auction.bidderRequested(bidder));
      }

      if (isImpression || isBidAfterTimeout) {
        let newEvent = {};

        newEvent[args['adUnitCode']] = {
          eventType: isBidAfterTimeout ? 'BidAfterTimeoutEvent' : 'AdUnitImpressionEvent',
          auctionInfo: request.findAuction(args['adUnitCode']).auctionInfo,
          data: (new Bid(args))
        };

        this.transport.send(newEvent);
      }
      // TODO add bid ajustment processing

      if (isBid) {
        let auction = request.findAuction(args['adUnitCode']);
        auction.bidReceived(new Bid(args));
      }

      if (isAuctionEnd) {
        this.requestStack.finish(request.requestId);
        return this.transport.send(request.buildData());
      }
    }
  };
}

function Config() {
  let parser = parse(window.location);

  let customHost = parser.search['pa_host'];
  let host = parser.host;

  return {
    // TODO add tags
    // TODO set analyitc host from parameters
    analyticHost: customHost || '//pa.rxthdr.com/api/v2/',
    // TODO extract only host without www
    currentHost: host,
    adUnits: [],
    iUrl: '/i',
    aUrl: '/a',
    bUrl: '/b',
    prefix: 'roxot_analytics_',
    publisherId: null,
    utm: {},
    sessionId: {},

    fill: function (config) {
      this.publisherId = extractPublisherId(config);
      this.currentHost = extractHost(config);
      this.adUnits = extractAdUnits(config);
      this.utm = extractUtmData();
      this.sessionId = extractSessionId();
    }
  };

  function extractAdUnits(config) {
    return config['adUnits'] !== undefined ? config['adUnits'] : [];
  }

  function extractHost(config, currentHost) {
    return config['host'] !== undefined ? config['host'] : currentHost;
  }

  function extractPublisherId(config) {
    return config['publisherIds'][0];
  }

  function extractSessionId() {
    let currentSessionId = (new SessionId).load();

    if (currentSessionId.isLive()) {
      currentSessionId.persist();
      return currentSessionId.id();
    }

    let newSessionId = (new SessionId).generate();
    newSessionId.persist();

    return newSessionId.id();

  }

  function extractUtmData() {
    let previousUtm = (new Utm).fromLocalStorage();
    let currentUtm = (new Utm).fromUrl(window.location);

    if (currentUtm.isDetected()) {
      currentUtm.persist();
      return currentUtm.data;
    }

    if (previousUtm.isLive()) {
      previousUtm.persist();
      return previousUtm.data;
    }

    return {};
  }
}

function AjaxTransport() {
  return {
    send(data) {
      let preparedData = this.prepareData(data);
      let fullUrl = options.analyticHost + '?publisherId[]=' + options.publisherId + '&analyticHost=' + options.currentHost;

      ajax(fullUrl, null, JSON.stringify(preparedData), {withCredentials: true});
    },
    // TODO не верное место для этого метода
    prepareData(originData) {
      let data = Object.assign({}, originData);
      Object.keys(data).map(function (objectKey) {
        let event = data[objectKey];

        event.data = event.data || {};
        event.data.utmTagData = options.utm;
        event.data.sessionId = options.sessionId;
      });

      return data;
    }
  }
}

function RequestStack() {
  return {
    stack: {},

    current: null,

    ensureRequestPresented(requestId) {
      if (!this.stack[requestId]) {
        this.stack[requestId] = new Request(requestId, options.publisherId);
      }

      return this.stack[requestId];
    },

    findRequest(requestId) {
      return this.stack[requestId];
    },
    finish(requestId) {
      this.current = null;
      this.findRequest(requestId).finish();
    },

    clear() {
      this.stack = {};
      this.current = null;
    },

    presentRequestId(requestId) {
      requestId = requestId || this.current;

      if (this.current && this.current !== requestId) {
        throw 'Try to rewrite current auction';
      }

      this.current = requestId;

      return this.current;
    },
  };

  function Request(requestId, publisherId) {
    this.requestId = requestId;
    this.publisherId = publisherId;
    this.auctions = {};
    this.isEnd = false;

    this.ensureAdUnitPresented = function (adUnitCode) {
      if (!this.auctions[adUnitCode]) {
        this.auctions[adUnitCode] = AuctionInfo(this.requestId, adUnitCode)
      }

      return this.auctions[adUnitCode];
    };

    this.findAuction = (adUnitCode) => this.auctions[adUnitCode];
    this.buildData = () => this.auctions;
    this.finish = () => this.isEnd = true;
    this.isFinished = () => this.isEnd;

    return this;

    function AuctionInfo(requestId, adUnitCode) {

      return {
        eventType: "AdUnitAuctionEvent",
        auctionInfo: {
          requestId: requestId,
          publisherId: publisherId,
          adUnitCode: adUnitCode,
          host: options.currentHost,
          requestedBids: {},
          bids: [],
          bidsAfterTimeout: []
        },
        isFinish: false,
        finish: () => this.isFinish = true,
        bidderRequested(bidder) {
          this.auctionInfo.requestedBids[bidder.bidderCode] = bidder;
        },
        bidReceived(bid) {
          if (this.isFinish) {
            return this.auctionInfo.bidsAfterTimeout.push(bid);
          }

          // todo Only one bid from bidder per auction
          return this.auctionInfo.bids.push(bid);
        }

      };
    }
  }

}

function Bid({width, height, adUnitCode, bidderCode, source, timeToRespond, cpm}) {
  // todo check timeToRespond,size,cpm
  this.size = width + 'x' + height;
  this.adUnitCode = adUnitCode;
  this.bidder = new Bidder({bidderCode, source});
  this.timeToRespond = timeToRespond;
  this.cpm = cpm;
}

function Bidder({bidderCode, source}) {
  this.bidderCode = bidderCode;
  this.source = source;
}

function SessionId(realId) {
  let key = options.prefix.concat('session_id');
  let timeout = {
    key: options.prefix.concat('session_timeout'),
    ms: 60 * 60 * 1000
  };
  let id = realId || null;
  let live = false;

  this.id = () => id;

  this.generate = function () {
    return new SessionId(uuid());
  };

  this.persist = function () {
    if (!live) {
      return utils.logError("Cann't persist rotten id");
    }

    localStorage.setItem(key, id);
    localStorage.setItem(timeout.key, Date.now());
  };

  this.isLive = function () {
    return isFresh();
  };

  this.load = function () {
    id = localStorage.getItem(key) || null;

    if (id && isFresh()) {
      live = true;
    }

    return this;

  };

  function isFresh() {
    let ts = localStorage.getItem(timeout.key);

    if (!ts) {
      return true;
    }

    return Date.now() - ts <= timeout.ms;
  }
}

function Utm() {
  let tags = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  let prefix = options.prefix.concat('utm');
  let timeout = {
    key: 'utm_timeout',
    ms: 60 * 60 * 1000
  };

  let detected = false;
  this.data = {};

  this.isDetected = function () {
    return detected;
  };

  this.isLive = function () {
    return detected && isFresh(localStorage.getItem(timeout.key) || 0);
  };

  this.fromUrl = function (url) {
    let $this = this;
    tags.forEach(function (tag) {
      let utmTagValue = parse(url).search[tag];

      if (utmTagValue !== '') {
        detected = true;
      }

      $this.data[tag] = utmTagValue;
    });

    return this;
  };

  this.fromLocalStorage = function () {
    let $this = this;
    tags.forEach(function (utmTagKey) {
      $this.data[utmTagKey] = localStorage.getItem(buildUtmLocalStorageKey(utmTagKey)) ? localStorage.getItem(buildUtmLocalStorageKey(utmTagKey)) : '';
    });

    return this;
  };

  this.persist = function () {
    let $this = this;
    Object.keys(this.data).map(function (tagKey) {
      localStorage.setItem(buildUtmLocalStorageKey(tagKey), $this.data[tagKey]);
    });

    localStorage.setItem(timeout.key, Date.now());
  };

  function buildUtmLocalStorageKey(key) {
    return prefix.concat(key);
  }

  function isFresh(utmTimestamp) {
    return (Date.now() - utmTimestamp) > timeout.ms;
  }

}

function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
