import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { AUCTION_COMPLETED, AUCTION_IN_PROGRESS, getPriceGranularity } from '../src/auction.js';
import includes from 'core-js-pure/features/array/includes.js';

const analyticsType = 'endpoint';
const ENDPOINT = 'https://pb-logs.media.net/log?logid=kfk&evtid=prebid_analytics_events_client';
const CONFIG_URL = 'https://prebid.media.net/rtb/prebid/analytics/config';
const EVENT_PIXEL_URL = 'https://qsearch-a.akamaihd.net/log';
const DEFAULT_LOGGING_PERCENT = 50;
const ANALYTICS_VERSION = '1.0.0';

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
const BID_FLOOR_REJECTED = 12;
const DUMMY_BIDDER = '-2';

const CONFIG_PENDING = 0;
const CONFIG_PASS = 1;
const CONFIG_ERROR = 3;

const VALID_URL_KEY = ['canonical_url', 'og_url', 'twitter_url'];
const DEFAULT_URL_KEY = 'page';

const LOG_TYPE = {
  AP: 'AP',
  PR: 'PR',
  APPR: 'APPR',
  RA: 'RA'
};

const BATCHING = {
  SINGLE: 'SINGLE',
  MULTI: 'MULTI'
}

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
    this.gdprApplies = undefined;
    this.uspConsent = undefined;
    this.pixelWaitTime = 0;
    this.apLoggingPct = 0;
    this.prLoggingPct = 0;
    this.batching = BATCHING.SINGLE;
    this.shouldBeLogged = {};
    this.mnetDebugConfig = '';
  }

  set publisherLper(plper) {
    this.pubLper = plper;
  }

  getLoggingData() {
    return {
      cid: this.cid,
      lper: Math.round(100 / this.loggingPercent),
      plper: this.pubLper,
      gdpr: this.gdprApplies ? '1' : '0',
      gdprConsent: this.gdprConsent,
      ccpa: this.uspConsent,
      ajx: this.ajaxState,
      pbv: PREBID_VERSION,
      pbav: ANALYTICS_VERSION,
      flt: 1,
    }
  }

  _configURL() {
    return CONFIG_URL + '?cid=' + encodeURIComponent(this.cid) + '&dn=' + encodeURIComponent(pageDetails.domain);
  }

  _parseResponse(response) {
    try {
      response = JSON.parse(response);
      this.setDataFromResponse(response);
      this.overrideDomainLevelData(response);
      this.overrideToDebug(this.mnetDebugConfig);
      this.urlToConsume = includes(VALID_URL_KEY, response.urlKey) ? response.urlKey : this.urlToConsume;
      this.ajaxState = CONFIG_PASS;
    } catch (e) {
      this.ajaxState = CONFIG_ERROR;
      /* eslint no-new: "error" */
      new ErrorLogger(ERROR_CONFIG_JSON_PARSE, e).send();
    }
  }

  setDataFromResponse(response) {
    if (!isNaN(parseInt(response.percentage, 10))) {
      this.loggingPercent = response.percentage;
    }

    if (!isNaN(parseInt(response.pixelwaittime, 10))) {
      this.pixelWaitTime = response.pixelwaittime;
    }

    if (!isNaN(parseInt(response.aplper, 10))) {
      this.apLoggingPct = response.aplper;
      this.batching = BATCHING.MULTI;
    }

    if (!isNaN(parseInt(response.prlper, 10))) {
      this.prLoggingPct = response.prlper;
      this.batching = BATCHING.MULTI;
    }
  }

  overrideDomainLevelData(response) {
    const domain = utils.deepAccess(response, 'domain.' + pageDetails.domain);
    if (domain) {
      this.setDataFromResponse(domain);
    }
  }

  overrideToDebug(response) {
    if (response === '') return;
    try {
      this.setDataFromResponse(JSON.parse(decodeURIComponent(response)));
    } catch (e) {
    }
  }

  _errorFetch() {
    this.ajaxState = CONFIG_ERROR;
    /* eslint no-new: "error" */
    new ErrorLogger(ERROR_CONFIG_FETCH).send();
  }

  init() {
    // Forces Logging % to 100%
    let urlObj = URL.parseUrl(pageDetails.page);
    if (utils.deepAccess(urlObj, 'search.medianet_test') || urlObj.hostname === 'localhost') {
      this.loggingPercent = 100;
      this.ajaxState = CONFIG_PASS;
      this.debug = true;
      return;
    }
    if (utils.deepAccess(urlObj, 'search.mnet_setconfig')) {
      this.mnetDebugConfig = utils.deepAccess(urlObj, 'search.mnet_setconfig');
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

    this.domain = URL.parseUrl(refererInfo.referer).hostname;
    this.page = refererInfo.referer;
    this.is_top = refererInfo.reachedTop;
    this.referrer = this._getTopWindowReferrer();
    this.canonical_url = canonicalUrl;
    this.og_url = ogUrl;
    this.twitter_url = twitterUrl;
    this.screen = this._getWindowSize();
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
  constructor(tmax, supplyAdCode, context, adext) {
    this.tmax = tmax;
    this.supplyAdCode = supplyAdCode;
    this.context = context;
    this.adext = adext;
    this.logged = {};
    this.logged[LOG_TYPE.PR] = false;
    this.logged[LOG_TYPE.AP] = false;
    this.logged[LOG_TYPE.APPR] = false;
    this.targeting = undefined;
    this.medianetPresent = 0;
  }

  getShouldBeLogged(logType) {
    if (!config.shouldBeLogged.hasOwnProperty(logType)) {
      config.shouldBeLogged[logType] = isSampled(logType);
    }
    config.shouldBeLogged[logType] = isSampled(logType);
    return config.shouldBeLogged[logType];
  }

  getLoggingData() {
    return Object.assign({
      supcrid: this.supplyAdCode,
      tmax: this.tmax,
      targ: JSON.stringify(this.targeting),
      ismn: this.medianetPresent,
      vplcmtt: this.context,
    },
    this.adext && {'adext': JSON.stringify(this.adext)},
    );
  }
}

class Bid {
  constructor(bidId, bidder, src, start, adUnitCode, mediaType, allMediaTypeSizes) {
    this.bidId = bidId;
    this.bidder = bidder;
    this.src = src;
    this.start = start;
    this.adUnitCode = adUnitCode;
    this.allMediaTypeSizes = allMediaTypeSizes;
    this.iwb = 0;
    this.winner = 0;
    this.status = bidder === DUMMY_BIDDER ? BID_SUCCESS : BID_TIMEOUT;
    this.ext = {};
    this.originalCpm = undefined;
    this.cpm = undefined;
    this.dfpbd = undefined;
    this.width = undefined;
    this.height = undefined;
    this.mediaType = mediaType;
    this.timeToRespond = undefined;
    this.dealId = undefined;
    this.creativeId = undefined;
    this.adId = undefined;
    this.currency = undefined;
    this.crid = undefined;
    this.pubcrid = undefined;
    this.mpvid = undefined;
    this.floorPrice = undefined;
    this.floorRule = undefined;
    this.serverLatencyMillis = undefined;
  }

  get size() {
    if (!this.width || !this.height) {
      return '';
    }
    return this.width + 'x' + this.height;
  }

  getLoggingData() {
    return {
      adid: this.adId,
      pvnm: this.bidder,
      src: this.src,
      ogbdp: this.originalCpm,
      bdp: this.cpm,
      cbdp: this.dfpbd,
      dfpbd: this.dfpbd,
      szs: this.allMediaTypeSizes.map(sz => sz.join('x')).join('|'),
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
      bidflr: this.floorPrice,
      flrrule: this.floorRule,
      ext: JSON.stringify(this.ext),
      rtime: this.serverLatencyMillis,
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
    this.floorData = {};
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
      aucstatus: this.status,
      acid: this.acid,
      flrdata: this._mergeFieldsToLog({
        ln: this.floorData.location,
        skp: this.floorData.skipped,
        enfj: utils.deepAccess(this.floorData, 'enforcements.enforceJS'),
        enfd: utils.deepAccess(this.floorData, 'enforcements.floorDeals'),
        sr: this.floorData.skipRate,
        fs: this.floorData.fetchStatus
      }),
      flrver: this.floorData.modelVersion
    }
  }

  addSlot({ adUnitCode, supplyAdCode, mediaTypes, allMediaTypeSizes, tmax, adext, context }) {
    if (adUnitCode && this.adSlots[adUnitCode] === undefined) {
      this.adSlots[adUnitCode] = new AdSlot(tmax, supplyAdCode, context, adext);
      this.addBid(new Bid('-1', DUMMY_BIDDER, 'client', '-1', adUnitCode, mediaTypes, allMediaTypeSizes));
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
      .filter((bid) => bid.adUnitCode === adslot)
      .map((bid) => bid.getLoggingData());
  }

  getWinnerAdslotBid(adslot) {
    return this.getAdslotBids(adslot).filter((bid) => bid.winner);
  }

  _mergeFieldsToLog(objParams) {
    let logParams = [];
    let value;
    for (const param of Object.keys(objParams)) {
      value = objParams[param];
      logParams.push(param + '=' + (value === undefined ? '' : value));
    }
    return logParams.join('||');
  }
}

function auctionInitHandler({auctionId, adUnits, timeout, timestamp, bidderRequests}) {
  if (auctionId && auctions[auctionId] === undefined) {
    auctions[auctionId] = new Auction(auctionId);
    auctions[auctionId].auctionInitTime = timestamp;
  }
  addAddSlots(auctionId, adUnits, timeout);
  const floorData = utils.deepAccess(bidderRequests, '0.bids.0.floorData');
  if (floorData) {
    auctions[auctionId].floorData = {...floorData};
  }
}

function addAddSlots(auctionId, adUnits, tmax) {
  adUnits = adUnits || [];
  const groupedAdUnits = utils.groupBy(adUnits, 'code');
  Object.keys(groupedAdUnits).forEach((adUnitCode) => {
    const adUnits = groupedAdUnits[adUnitCode];
    const supplyAdCode = utils.deepAccess(adUnits, '0.adUnitCode') || adUnitCode;
    let context = '';
    let adext = {};

    const mediaTypeMap = {};
    const oSizes = {banner: [], video: []};
    adUnits.forEach(({mediaTypes, sizes, ext}) => {
      mediaTypes = mediaTypes || {};
      adext = Object.assign(adext, ext || utils.deepAccess(mediaTypes, 'banner.ext'));
      context = utils.deepAccess(mediaTypes, 'video.context') || context;
      Object.keys(mediaTypes).forEach((mediaType) => mediaTypeMap[mediaType] = 1);
      const sizeObject = _getSizes(mediaTypes, sizes);
      sizeObject.banner.forEach(size => oSizes.banner.push(size));
      sizeObject.video.forEach(size => oSizes.video.push(size));
    });

    adext = utils.isEmpty(adext) ? undefined : adext;
    oSizes.banner = oSizes.banner.filter(utils.uniques);
    oSizes.video = oSizes.video.filter(utils.uniques);
    oSizes.native = mediaTypeMap.native === 1 ? [[1, 1]] : [];
    const allMediaTypeSizes = [].concat(oSizes.banner, oSizes.native, oSizes.video);
    const mediaTypes = Object.keys(mediaTypeMap).join('|');

    auctions[auctionId].addSlot({adUnitCode, supplyAdCode, mediaTypes, allMediaTypeSizes, context, tmax, adext});
  });
}

function bidRequestedHandler({ auctionId, auctionStart, bids, start, uspConsent, gdpr }) {
  if (!(auctions[auctionId] instanceof Auction)) {
    return;
  }

  config.gdprApplies = !!(gdpr && gdpr.gdprApplies);
  if (config.gdprApplies) {
    config.gdprConsent = gdpr.consentString || '';
  }

  config.uspConsent = config.uspConsent || uspConsent;

  auctions[auctionId].auctionStartTime = auctionStart;
  bids.forEach(bid => {
    const { adUnitCode, bidder, bidId, src, mediaTypes, sizes } = bid;
    const sizeObject = _getSizes(mediaTypes, sizes);
    const requestSizes = [].concat(sizeObject.banner, sizeObject.native, sizeObject.video);
    const bidObj = new Bid(bidId, bidder, src, start, adUnitCode, mediaTypes && Object.keys(mediaTypes).join('|'), requestSizes);
    auctions[auctionId].addBid(bidObj);
    if (bidder === MEDIANET_BIDDER_CODE) {
      bidObj.crid = utils.deepAccess(bid, 'params.crid');
      bidObj.pubcrid = utils.deepAccess(bid, 'params.crid');
      auctions[auctionId].adSlots[adUnitCode].medianetPresent = 1;
    }
  });
}

function _getSizes(mediaTypes, sizes) {
  const banner = utils.deepAccess(mediaTypes, 'banner.sizes') || sizes || [];
  const native = utils.deepAccess(mediaTypes, 'native') ? [[1, 1]] : [];
  const playerSize = utils.deepAccess(mediaTypes, 'video.playerSize') || [];
  let video = [];
  if (playerSize.length === 2) {
    video = [playerSize]
  }
  return { banner, native, video }
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
    { adId, currency }
  );
  bidObj.floorPrice = utils.deepAccess(bid, 'floorData.floorValue');
  bidObj.floorRule = utils.deepAccess(bid, 'floorData.floorRule');
  bidObj.originalCpm = originalCpm || cpm;
  let dfpbd = utils.deepAccess(bid, 'adserverTargeting.hb_pb');
  if (!dfpbd) {
    let priceGranularity = getPriceGranularity(mediaType, bid);
    let priceGranularityKey = PRICE_GRANULARITY[priceGranularity];
    dfpbd = bid[priceGranularityKey] || cpm;
  }
  bidObj.dfpbd = dfpbd;
  if (bid.status === CONSTANTS.BID_STATUS.BID_REJECTED) {
    bidObj.status = BID_FLOOR_REJECTED;
  } else {
    bidObj.status = BID_SUCCESS;
  }

  if (bidderCode === MEDIANET_BIDDER_CODE && bid.ext instanceof Object) {
    Object.assign(
      bidObj,
      { 'ext': bid.ext },
      { 'mpvid': bid.ext.pvid },
      bid.ext.crid && { 'crid': bid.ext.crid }
    );
  }
  if (typeof bid.serverResponseTimeMs !== 'undefined') {
    bidObj.serverLatencyMillis = bid.serverResponseTimeMs;
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

function auctionEndHandler({auctionId, auctionEnd, adUnitCodes}) {
  if (!(auctions[auctionId] instanceof Auction)) {
    return;
  }
  auctions[auctionId].status = AUCTION_COMPLETED;
  auctions[auctionId].auctionEndTime = auctionEnd;

  if (config.batching === BATCHING.MULTI) {
    adUnitCodes.forEach(function (adUnitCode) {
      sendEvent(auctionId, adUnitCode, LOG_TYPE.PR);
    });
  }
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
        if (key.indexOf(CONSTANTS.TARGETING_KEYS.AD_ID) !== -1) {
          result[key] = params[adunit][key]
        }
        return result;
      }, {});
      const winnerAdId = params[adunit][CONSTANTS.TARGETING_KEYS.AD_ID];
      let winningBid;
      let bidAdIds = Object.keys(targetingObj).map(k => targetingObj[k]);
      auctionObj.bids.filter((bid) => bidAdIds.indexOf(bid.adId) !== -1).map(function(bid) {
        bid.iwb = 1;
        if (bid.adId === winnerAdId) {
          winningBid = bid;
        }
      });
      auctionObj.bids.forEach(bid => {
        if (bid.bidder === DUMMY_BIDDER && bid.adUnitCode === adunit) {
          bid.iwb = bidAdIds.length === 0 ? 0 : 1;
          bid.width = utils.deepAccess(winningBid, 'width');
          bid.height = utils.deepAccess(winningBid, 'height');
        }
      });
      sendEvent(auctionId, adunit, getLogType());
    }
  }
}

function getLogType() {
  if (config.batching === BATCHING.SINGLE) {
    return LOG_TYPE.APPR;
  }
  return LOG_TYPE.AP;
}

function setBidderDone(params) {
  if (config.pixelWaitTime != null && config.pixelWaitTime > 0) {
    setTimeout(fireApAfterWait, config.pixelWaitTime, params)
  }
}

function fireApAfterWait(params) {
  params.bids.forEach(function (adUnit) {
    sendEvent(params.auctionId, adUnit.adUnitCode, LOG_TYPE.AP);
  });
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
  sendEvent(auctionId, adUnitCode, LOG_TYPE.RA);
}

function isSampled(logType) {
  return Math.random() * 100 < parseFloat(getLogPercentage(logType));
}

function getLogPercentage(logType) {
  let logPercentage = config.loggingPercent;
  if (config.batching === BATCHING.MULTI) {
    if (logType === LOG_TYPE.AP) {
      logPercentage = config.apLoggingPct;
    } else if (logType === LOG_TYPE.PR) {
      logPercentage = config.prLoggingPct;
    }
  }
  return logPercentage;
}

function isValidAuctionAdSlot(acid, adtag) {
  return (auctions[acid] instanceof Auction) && (auctions[acid].adSlots[adtag] instanceof AdSlot);
}

function sendEvent(id, adunit, logType) {
  if (!isValidAuctionAdSlot(id, adunit)) {
    return;
  }
  if (logType === LOG_TYPE.RA) {
    fireAuctionLog(id, adunit, logType);
  } else {
    fireApPrLog(id, adunit, logType)
  }
}

function fireApPrLog(auctionId, adUnitName, logType) {
  const adSlot = auctions[auctionId].adSlots[adUnitName];
  if (adSlot.getShouldBeLogged(logType) && !adSlot.logged[logType]) {
    if (config.batching === BATCHING.SINGLE) {
      adSlot.logged[LOG_TYPE.AP] = true;
      adSlot.logged[LOG_TYPE.PR] = true;
    } else {
      adSlot.logged[logType] = true;
    }
    fireAuctionLog(auctionId, adUnitName, logType);
  }
}

function getCommonLoggingData(acid, adtag) {
  let commonParams = Object.assign(pageDetails.getLoggingData(), config.getLoggingData());
  let adunitParams = auctions[acid].adSlots[adtag].getLoggingData();
  let auctionParams = auctions[acid].getLoggingData();
  return Object.assign(commonParams, adunitParams, auctionParams);
}

function fireAuctionLog(acid, adtag, logType) {
  let commonParams = getCommonLoggingData(acid, adtag);
  commonParams.lgtp = logType;
  let targeting = utils.deepAccess(commonParams, 'targ');

  Object.keys(commonParams).forEach((key) => (commonParams[key] == null) && delete commonParams[key]);
  delete commonParams.targ;

  let bidParams;

  if (logType === LOG_TYPE.RA) {
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

class URL {
  static parseUrl(url) {
    let parsed = document.createElement('a');
    parsed.href = decodeURIComponent(url);
    return {
      hostname: parsed.hostname,
      search: URL.parseQS(parsed.search || ''),
      host: parsed.host || window.location.host
    };
  }
  static parseQS(query) {
    return !query ? {} : query
      .replace(/^\?/, '')
      .split('&')
      .reduce((acc, criteria) => {
        let [k, v] = criteria.split('=');
        if (/\[\]$/.test(k)) {
          k = k.replace('[]', '');
          acc[k] = acc[k] || [];
          acc[k].push(v);
        } else {
          acc[k] = v || '';
        }
        return acc;
      }, {});
  }
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
      case CONSTANTS.EVENTS.BIDDER_DONE : {
        setBidderDone(args);
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
  $$PREBID_GLOBAL$$.medianetGlobals = $$PREBID_GLOBAL$$.medianetGlobals || {};
  $$PREBID_GLOBAL$$.medianetGlobals.analyticsEnabled = true;

  pageDetails = new PageDetail();

  config = new Configure(configuration.options.cid);
  config.publisherLper = configuration.options.sampling || '';
  config.init();
  configuration.options.sampling = 1;
  medianetAnalytics.originEnableAnalytics(configuration);
};

adapterManager.registerAnalyticsAdapter({
  adapter: medianetAnalytics,
  code: 'medianetAnalytics',
  gvlid: 142,
});

export default medianetAnalytics;
