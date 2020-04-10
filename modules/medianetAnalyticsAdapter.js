import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getPriceGranularity, AUCTION_IN_PROGRESS, AUCTION_COMPLETED } from '../src/auction.js'

const analyticsType = 'endpoint';
const ENDPOINT = 'https://pb-logs.media.net/log?logid=kfk&evtid=prebid_analytics_events_client';
const CONFIG_URL = 'https://prebid.media.net/rtb/prebid/analytics/config';
const EVENT_PIXEL_URL = 'https://qsearch-a.akamaihd.net/log';
const DEFAULT_LOGGING_PERCENT = 50;
const PRICE_GRANULARITY = {
  'auto': 'pbAg',
  'custom': 'pbCg',
  'dense': 'pbDg',
  'low': 'pbLg',
  'medium': 'pbMg',
  'high': 'pbHg',
};

const MEDIANET_BIDDER_CODE = 'medianet';
// eslint-disable-next-line no-undef
const PREBID_VERSION = $$PREBID_GLOBAL$$.version;
const ERROR_CONFIG_JSON_PARSE = 'analytics_config_parse_fail';
const ERROR_CONFIG_FETCH = 'analytics_config_ajax_fail';
const BID_SUCCESS = 1;
const BID_NOBID = 2;
const BID_TIMEOUT = 3;
const DUMMY_BIDDER = '-2';

const CONFIG_PENDING = 0;
const CONFIG_PASS = 1;
const CONFIG_ERROR = 3;

const VALID_URL_KEY = ['canonical_url', 'og_url', 'twitter_url'];
const DEFAULT_URL_KEY = 'page';

let auctions = {};
let config;
let pageDetails;
let logsQueue = [];

class ErrorLogger {
  constructor(event, additionalData) {
    this.event = event;
    this.logid = 'kfk';
    this.evtid = 'projectevents';
    this.project = 'prebidanalytics';
    this.dn = pageDetails.domain || '';
    this.requrl = pageDetails.requrl || '';
    this.event = this.event;
    this.pbversion = PREBID_VERSION;
    this.cid = config.cid || '';
    this.rd = additionalData;
  }

  send() {
    let url = EVENT_PIXEL_URL + '?' + formatQS(this);
    utils.triggerPixel(url);
  }
}

class Configure {
  constructor(cid) {
    this.cid = cid;
    this.pubLper = -1;
    this.ajaxState = CONFIG_PENDING;
    this.loggingPercent = DEFAULT_LOGGING_PERCENT;
    this.urlToConsume = DEFAULT_URL_KEY;
    this.debug = false;
    this.gdprConsent = undefined;
    this.uspConsent = undefined;
  }

  set publisherLper(plper) {
    this.pubLper = plper;
  }

  getLoggingData() {
    return {
      cid: this.cid,
      lper: Math.round(100 / this.loggingPercent),
      plper: this.pubLper,
      gdpr: this.gdprConsent,
      ccpa: this.uspConsent,
      ajx: this.ajaxState,
      pbv: PREBID_VERSION,
      flt: 1,
    }
  }

  _configURL() {
    return CONFIG_URL + '?cid=' + encodeURIComponent(this.cid) + '&dn=' + encodeURIComponent(pageDetails.domain);
  }

  _parseResponse(response) {
    try {
      response = JSON.parse(response);
      if (isNaN(response.percentage)) {
        throw new Error('not a number');
      }
      this.loggingPercent = response.percentage;
      this.urlToConsume = VALID_URL_KEY.includes(response.urlKey) ? response.urlKey : this.urlToConsume;
      this.ajaxState = CONFIG_PASS;
    } catch (e) {
      this.ajaxState = CONFIG_ERROR;
      /* eslint no-new: "error" */
      new ErrorLogger(ERROR_CONFIG_JSON_PARSE, e).send();
    }
  }

  _errorFetch() {
    this.ajaxState = CONFIG_ERROR;
    /* eslint no-new: "error" */
    new ErrorLogger(ERROR_CONFIG_FETCH).send();
  }

  init() {
    // Forces Logging % to 100%
    let urlObj = utils.parseUrl(pageDetails.page);
    if (utils.deepAccess(urlObj, 'search.medianet_test') || urlObj.hostname === 'localhost') {
      this.loggingPercent = 100;
      this.ajaxState = CONFIG_PASS;
      this.debug = true;
      return;
    }
    ajax(
      this._configURL(),
      {
        success: this._parseResponse.bind(this),
        error: this._errorFetch.bind(this)
      }
    );
  }
}

class PageDetail {
  constructor () {
    const canonicalUrl = this._getUrlFromSelector('link[rel="canonical"]', 'href');
    const ogUrl = this._getUrlFromSelector('meta[property="og:url"]', 'content');
    const twitterUrl = this._getUrlFromSelector('meta[name="twitter:url"]', 'content');
    const refererInfo = getRefererInfo();

    this.domain = utils.parseUrl(refererInfo.referer).host;
    this.page = refererInfo.referer;
    this.is_top = refererInfo.reachedTop;
    this.referrer = this._getTopWindowReferrer();
    this.canonical_url = canonicalUrl;
    this.og_url = ogUrl;
    this.twitter_url = twitterUrl;
    this.screen = this._getWindowSize()
  }

  _getTopWindowReferrer() {
    try {
      return window.top.document.referrer;
    } catch (e) {
      return document.referrer;
    }
  }

  _getWindowSize() {
    let w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || -1;
    let h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || -1;
    return `${w}x${h}`;
  }

  _getAttributeFromSelector(selector, attribute) {
    try {
      let doc = utils.getWindowTop().document;
      let element = doc.querySelector(selector);
      if (element !== null && element[attribute]) {
        return element[attribute];
      }
    } catch (e) {}
  }

  _getAbsoluteUrl(url) {
    let aTag = utils.getWindowTop().document.createElement('a');
    aTag.href = url;

    return aTag.href;
  }

  _getUrlFromSelector(selector, attribute) {
    let attr = this._getAttributeFromSelector(selector, attribute);
    return attr && this._getAbsoluteUrl(attr);
  }

  getLoggingData() {
    return {
      requrl: this[config.urlToConsume] || this.page,
      dn: this.domain,
      ref: this.referrer,
      screen: this.screen
    }
  }
}

class AdSlot {
  constructor(mediaTypes, bannerSizes, tmax, supplyAdCode, adext) {
    this.mediaTypes = mediaTypes;
    this.bannerSizes = bannerSizes;
    this.tmax = tmax;
    this.supplyAdCode = supplyAdCode;
    this.adext = adext;
    this.logged = false;
    this.targeting = undefined;
  }

  getLoggingData() {
    return Object.assign({
      supcrid: this.supplyAdCode,
      mediaTypes: this.mediaTypes && this.mediaTypes.join('|'),
      szs: this.bannerSizes.join('|'),
      tmax: this.tmax,
      targ: JSON.stringify(this.targeting)
    },
    this.adext && {'adext': JSON.stringify(this.adext)},
    );
  }
}

class Bid {
  constructor(bidId, bidder, src, start, supplyAdCode) {
    this.bidId = bidId;
    this.bidder = bidder;
    this.src = src;
    this.start = start;
    this.supplyAdCode = supplyAdCode;
    this.iwb = 0;
    this.winner = 0;
    this.status = bidder === DUMMY_BIDDER ? BID_SUCCESS : BID_TIMEOUT;
    this.ext = {};
    this.originalCpm = undefined;
    this.cpm = undefined;
    this.dfpbd = undefined;
    this.width = undefined;
    this.height = undefined;
    this.mediaType = undefined;
    this.timeToRespond = undefined;
    this.dealId = undefined;
    this.creativeId = undefined;
    this.adId = undefined;
    this.currency = undefined;
    this.crid = undefined;
    this.pubcrid = undefined;
    this.mpvid = undefined;
  }

  get size() {
    if (!this.width || !this.height) {
      return '';
    }
    return this.width + 'x' + this.height;
  }

  getLoggingData() {
    return {
      pvnm: this.bidder,
      src: this.src,
      ogbdp: this.originalCpm,
      bdp: this.cpm,
      cbdp: this.dfpbd,
      dfpbd: this.dfpbd,
      size: this.size,
      mtype: this.mediaType,
      dId: this.dealId,
      winner: this.winner,
      curr: this.currency,
      rests: this.timeToRespond,
      status: this.status,
      iwb: this.iwb,
      crid: this.crid,
      pubcrid: this.pubcrid,
      mpvid: this.mpvid,
      ext: JSON.stringify(this.ext)
    }
  }
}

class Auction {
  constructor(acid) {
    this.acid = acid;
    this.status = AUCTION_IN_PROGRESS;
    this.bids = [];
    this.adSlots = {};
    this.auctionInitTime = undefined;
    this.auctionStartTime = undefined;
    this.setTargetingTime = undefined;
    this.auctionEndTime = undefined;
    this.bidWonTime = undefined;
  }

  hasEnded() {
    return this.status === AUCTION_COMPLETED;
  }

  getLoggingData() {
    return {
      sts: this.auctionStartTime - this.auctionInitTime,
      ets: this.auctionEndTime - this.auctionInitTime,
      tts: this.setTargetingTime - this.auctionInitTime,
      wts: this.bidWonTime - this.auctionInitTime,
      aucstatus: this.status
    }
  }

  addSlot(supplyAdCode, { mediaTypes, bannerSizes, tmax, adext }) {
    if (supplyAdCode && this.adSlots[supplyAdCode] === undefined) {
      this.adSlots[supplyAdCode] = new AdSlot(mediaTypes, bannerSizes, tmax, supplyAdCode, adext);
      this.addBid(
        new Bid('-1', DUMMY_BIDDER, 'client', '-1', supplyAdCode)
      );
    }
  }

  addBid(bid) {
    this.bids.push(bid);
  }

  findBid(key, value) {
    return this.bids.filter(bid => {
      return bid[key] === value
    })[0];
  }

  getAdslotBids(adslot) {
    return this.bids
      .filter((bid) => bid.supplyAdCode === adslot)
      .map((bid) => bid.getLoggingData());
  }

  getWinnerAdslotBid(adslot) {
    return this.getAdslotBids(adslot).filter((bid) => bid.winner);
  }
}

function auctionInitHandler({auctionId, timestamp}) {
  if (auctionId && auctions[auctionId] === undefined) {
    auctions[auctionId] = new Auction(auctionId);
    auctions[auctionId].auctionInitTime = timestamp;
  }
}

function bidRequestedHandler({ auctionId, auctionStart, bids, start, timeout, uspConsent, gdpr }) {
  if (!(auctions[auctionId] instanceof Auction)) {
    return;
  }

  if (gdpr && gdpr.gdprApplies) {
    config.gdprConsent = gdpr.consentString || '';
  }

  config.uspConsent = config.uspConsent || uspConsent;

  bids.forEach(bid => {
    const { adUnitCode, bidder, mediaTypes, sizes, bidId, src } = bid;
    if (!auctions[auctionId].adSlots[adUnitCode]) {
      auctions[auctionId].auctionStartTime = auctionStart;
      auctions[auctionId].addSlot(
        adUnitCode,
        Object.assign({},
          (mediaTypes instanceof Object) && { mediaTypes: Object.keys(mediaTypes) },
          { bannerSizes: utils.deepAccess(mediaTypes, 'banner.sizes') || sizes || [] },
          { adext: utils.deepAccess(mediaTypes, 'banner.ext') || '' },
          { tmax: timeout }
        )
      );
    }
    let bidObj = new Bid(bidId, bidder, src, start, adUnitCode);
    auctions[auctionId].addBid(bidObj);
    if (bidder === MEDIANET_BIDDER_CODE) {
      bidObj.crid = utils.deepAccess(bid, 'params.crid');
      bidObj.pubcrid = utils.deepAccess(bid, 'params.crid');
    }
  });
}

function bidResponseHandler(bid) {
  const { width, height, mediaType, cpm, requestId, timeToRespond, auctionId, dealId } = bid;
  const {originalCpm, bidderCode, creativeId, adId, currency} = bid;

  if (!(auctions[auctionId] instanceof Auction)) {
    return;
  }
  let bidObj = auctions[auctionId].findBid('bidId', requestId);
  if (!(bidObj instanceof Bid)) {
    return;
  }
  Object.assign(
    bidObj,
    { cpm, width, height, mediaType, timeToRespond, dealId, creativeId },
    { adId, currency, originalCpm }
  );
  let dfpbd = utils.deepAccess(bid, 'adserverTargeting.hb_pb');
  if (!dfpbd) {
    let priceGranularity = getPriceGranularity(mediaType, bid);
    let priceGranularityKey = PRICE_GRANULARITY[priceGranularity];
    dfpbd = bid[priceGranularityKey] || cpm;
  }
  bidObj.dfpbd = dfpbd;
  bidObj.status = BID_SUCCESS;

  if (bidderCode === MEDIANET_BIDDER_CODE && bid.ext instanceof Object) {
    Object.assign(
      bidObj,
      { 'ext': bid.ext },
      { 'mpvid': bid.ext.pvid },
      bid.ext.crid && { 'crid': bid.ext.crid }
    );
  }
}

function noBidResponseHandler({ auctionId, bidId }) {
  if (!(auctions[auctionId] instanceof Auction)) {
    return;
  }
  if (auctions[auctionId].hasEnded()) {
    return;
  }
  let bidObj = auctions[auctionId].findBid('bidId', bidId);
  if (!(bidObj instanceof Bid)) {
    return;
  }
  bidObj.status = BID_NOBID;
}

function bidTimeoutHandler(timedOutBids) {
  timedOutBids.map(({bidId, auctionId}) => {
    if (!(auctions[auctionId] instanceof Auction)) {
      return;
    }
    let bidObj = auctions[auctionId].findBid('bidId', bidId);
    if (!(bidObj instanceof Bid)) {
      return;
    }
    bidObj.status = BID_TIMEOUT;
  })
}

function auctionEndHandler({ auctionId, auctionEnd }) {
  if (!(auctions[auctionId] instanceof Auction)) {
    return;
  }
  auctions[auctionId].status = AUCTION_COMPLETED;
  auctions[auctionId].auctionEndTime = auctionEnd;
}

function setTargetingHandler(params) {
  for (const adunit of Object.keys(params)) {
    for (const auctionId of Object.keys(auctions)) {
      let auctionObj = auctions[auctionId];
      let adunitObj = auctionObj.adSlots[adunit];
      if (!(adunitObj instanceof AdSlot)) {
        continue;
      }
      adunitObj.targeting = params[adunit];
      auctionObj.setTargetingTime = Date.now();
      let targetingObj = Object.keys(params[adunit]).reduce((result, key) => {
        if (key.indexOf('hb_adid') !== -1) {
          result[key] = params[adunit][key]
        }
        return result;
      }, {});
      let bidAdIds = Object.keys(targetingObj).map(k => targetingObj[k]);
      auctionObj.bids.filter((bid) => bidAdIds.indexOf(bid.adId) !== -1).map(function(bid) {
        bid.iwb = 1;
      });
      sendEvent(auctionId, adunit, false);
    }
  }
}

function bidWonHandler(bid) {
  const { requestId, auctionId, adUnitCode } = bid;
  if (!(auctions[auctionId] instanceof Auction)) {
    return;
  }
  let bidObj = auctions[auctionId].findBid('bidId', requestId);
  if (!(bidObj instanceof Bid)) {
    return;
  }
  auctions[auctionId].bidWonTime = Date.now();
  bidObj.winner = 1;
  sendEvent(auctionId, adUnitCode, true);
}

function isSampled() {
  return Math.random() * 100 < parseFloat(config.loggingPercent);
}

function isValidAuctionAdSlot(acid, adtag) {
  return (auctions[acid] instanceof Auction) && (auctions[acid].adSlots[adtag] instanceof AdSlot);
}

function sendEvent(id, adunit, isBidWonEvent) {
  if (!isValidAuctionAdSlot(id, adunit)) {
    return;
  }
  if (isBidWonEvent) {
    fireAuctionLog(id, adunit, isBidWonEvent);
  } else if (isSampled() && !auctions[id].adSlots[adunit].logged) {
    auctions[id].adSlots[adunit].logged = true;
    fireAuctionLog(id, adunit, isBidWonEvent);
  }
}

function getCommonLoggingData(acid, adtag) {
  let commonParams = Object.assign(pageDetails.getLoggingData(), config.getLoggingData());
  let adunitParams = auctions[acid].adSlots[adtag].getLoggingData();
  let auctionParams = auctions[acid].getLoggingData();
  return Object.assign(commonParams, adunitParams, auctionParams);
}

function fireAuctionLog(acid, adtag, isBidWonEvent) {
  let commonParams = getCommonLoggingData(acid, adtag);
  let targeting = utils.deepAccess(commonParams, 'targ');

  Object.keys(commonParams).forEach((key) => (commonParams[key] == null) && delete commonParams[key]);
  delete commonParams.targ;

  let bidParams;

  if (isBidWonEvent) {
    bidParams = auctions[acid].getWinnerAdslotBid(adtag);
    commonParams.lper = 1;
  } else {
    bidParams = auctions[acid].getAdslotBids(adtag).map(({winner, ...restParams}) => restParams);
    delete commonParams.wts;
  }
  let mnetPresent = bidParams.filter(b => b.pvnm === MEDIANET_BIDDER_CODE).length > 0;
  if (!mnetPresent) {
    bidParams = bidParams.map(({mpvid, crid, ext, pubcrid, ...restParams}) => restParams);
  }

  let url = formatQS(commonParams) + '&';
  bidParams.forEach(function(bidParams) {
    url = url + formatQS(bidParams) + '&';
  });
  url = url + formatQS({targ: targeting});
  firePixel(url);
}

function formatQS(data) {
  return utils._map(data, (value, key) => {
    if (value === undefined) {
      return key + '=';
    }
    if (utils.isPlainObject(value)) {
      value = JSON.stringify(value);
    }
    return key + '=' + encodeURIComponent(value);
  }).join('&');
}

function firePixel(qs) {
  logsQueue.push(ENDPOINT + '&' + qs);
  utils.triggerPixel(ENDPOINT + '&' + qs);
}

let medianetAnalytics = Object.assign(adapter({URL, analyticsType}), {
  getlogsQueue() {
    return logsQueue;
  },
  clearlogsQueue() {
    logsQueue = [];
    auctions = {};
  },
  track({ eventType, args }) {
    if (config.debug) {
      utils.logInfo(eventType, args);
    }
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT: {
        auctionInitHandler(args);
        break;
      }
      case CONSTANTS.EVENTS.BID_REQUESTED: {
        bidRequestedHandler(args);
        break;
      }
      case CONSTANTS.EVENTS.BID_RESPONSE: {
        bidResponseHandler(args);
        break;
      }
      case CONSTANTS.EVENTS.BID_TIMEOUT: {
        bidTimeoutHandler(args);
        break;
      }
      case CONSTANTS.EVENTS.NO_BID: {
        noBidResponseHandler(args);
        break;
      }
      case CONSTANTS.EVENTS.AUCTION_END: {
        auctionEndHandler(args);
        break;
      }
      case CONSTANTS.EVENTS.SET_TARGETING : {
        setTargetingHandler(args);
        break;
      }
      case CONSTANTS.EVENTS.BID_WON: {
        bidWonHandler(args);
        break;
      }
    }
  }});

medianetAnalytics.originEnableAnalytics = medianetAnalytics.enableAnalytics;

medianetAnalytics.enableAnalytics = function (configuration) {
  if (!configuration || !configuration.options || !configuration.options.cid) {
    utils.logError('Media.net Analytics adapter: cid is required.');
    return;
  }
  pageDetails = new PageDetail();

  config = new Configure(configuration.options.cid);
  config.publisherLper = configuration.options.sampling || '';
  config.init();
  configuration.options.sampling = 1;
  medianetAnalytics.originEnableAnalytics(configuration);
};

adapterManager.registerAnalyticsAdapter({
  adapter: medianetAnalytics,
  code: 'medianetAnalytics'
});

export default medianetAnalytics;
