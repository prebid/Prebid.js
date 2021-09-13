'use strict';

import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { Renderer } from '../src/Renderer.js';

const BIDDER_CODE = 'tappx';
const TTL = 360;
const CUR = 'USD';
const TAPPX_BIDDER_VERSION = '0.1.0818';
const TYPE_CNN = 'prebidjs';
const LOG_PREFIX = '[TAPPX]: ';
const VIDEO_SUPPORT = ['instream', 'outstream'];

const DATA_TYPES = {
  'NUMBER': 'number',
  'STRING': 'string',
  'BOOLEAN': 'boolean',
  'ARRAY': 'array',
  'OBJECT': 'object'
};
const VIDEO_CUSTOM_PARAMS = {
  'minduration': DATA_TYPES.NUMBER,
  'maxduration': DATA_TYPES.NUMBER,
  'startdelay': DATA_TYPES.NUMBER,
  'playbackmethod': DATA_TYPES.ARRAY,
  'api': DATA_TYPES.ARRAY,
  'protocols': DATA_TYPES.ARRAY,
  'w': DATA_TYPES.NUMBER,
  'h': DATA_TYPES.NUMBER,
  'battr': DATA_TYPES.ARRAY,
  'linearity': DATA_TYPES.NUMBER,
  'placement': DATA_TYPES.NUMBER,
  'minbitrate': DATA_TYPES.NUMBER,
  'maxbitrate': DATA_TYPES.NUMBER,
  'skip': DATA_TYPES.NUMBER
}

var hostDomain;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function(bid) {
    return validBasic(bid) && validMediaType(bid)
  },

  /**
   * Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
   * Make a server request from the list of BidRequests.
   *
   * @param {*} validBidRequests
   * @param {*} bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    let requests = [];
    validBidRequests.forEach(oneValidRequest => {
      requests.push(buildOneRequest(oneValidRequest, bidderRequest));
    });
    return requests;
  },

  /**
   * Parse the response and generate one or more bid objects.
   *
   * @param {*} serverResponse
   * @param {*} originalRequest
   */
  interpretResponse: function(serverResponse, originalRequest) {
    const responseBody = serverResponse.body;
    if (!serverResponse.body) {
      utils.logWarn(LOG_PREFIX, 'Empty response body HTTP 204, no bids');
      return [];
    }

    const bids = [];
    responseBody.seatbid.forEach(serverSeatBid => {
      serverSeatBid.bid.forEach(serverBid => {
        bids.push(interpretBid(serverBid, originalRequest));
      });
    });

    return bids;
  },

  /**
   * If the publisher allows user-sync activity, the platform will call this function and the adapter may register pixels and/or iframe user syncs.
   *
   * @param {*} syncOptions
   * @param {*} serverResponses
   * @param {*} gdprConsent
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    let url = `https://${hostDomain}/cs/usersync.php?`;

    // GDPR & CCPA
    if (gdprConsent) {
      url += '&gdpr_optin=' + (gdprConsent.gdprApplies ? 1 : 0);
      url += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }
    if (uspConsent) {
      url += '&us_privacy=' + encodeURIComponent(uspConsent);
    }

    // SyncOptions
    if (syncOptions.iframeEnabled) {
      url += '&type=iframe'
      return [{
        type: 'iframe',
        url: url
      }];
    } else {
      url += '&type=img'
      return [{
        type: 'image',
        url: url
      }];
    }
  }
}

function validBasic(bid) {
  if (bid.params == null) {
    utils.logWarn(LOG_PREFIX, 'Please review the mandatory Tappx parameters.');
    return false;
  }

  if (bid.params.tappxkey == null) {
    utils.logWarn(LOG_PREFIX, 'Please review the mandatory Tappxkey parameter.');
    return false;
  }

  if (bid.params.host == null) {
    utils.logWarn(LOG_PREFIX, 'Please review the mandatory Host parameter.');
    return false;
  }

  let classicEndpoint = true
  if ((new RegExp(`^(vz.*|zz.*)\\.*$`, 'i')).test(bid.params.host)) {
    classicEndpoint = false
  }

  if (classicEndpoint && bid.params.endpoint == null) {
    utils.logWarn(LOG_PREFIX, 'Please review the mandatory endpoint Tappx parameters.');
    return false;
  }

  return true;
}

function validMediaType(bid) {
  const video = utils.deepAccess(bid, 'mediaTypes.video');

  // Video validations
  if (typeof video !== 'undefined') {
    if (VIDEO_SUPPORT.indexOf(video.context) === -1) {
      utils.logWarn(LOG_PREFIX, 'Please review the mandatory Tappx parameters for Video. Video context not supported.');
      return false;
    }
    if (typeof video.mimes == 'undefined') {
      utils.logWarn(LOG_PREFIX, 'Please review the mandatory Tappx parameters for Video. Mimes param is mandatory.');
      return false;
    }
  }

  return true;
}

/**
 * Parse the response and generate one bid object.
 *
 * @param {object} serverBid Bid by OpenRTB 2.5
 * @returns {object} Prebid banner bidObject
 */
function interpretBid(serverBid, request) {
  let bidReturned = {
    requestId: request.bids.bidId,
    cpm: serverBid.price,
    currency: serverBid.cur ? serverBid.cur : CUR,
    width: serverBid.w,
    height: serverBid.h,
    ttl: TTL,
    creativeId: serverBid.crid,
    netRevenue: true,
  }

  if (typeof serverBid.dealId !== 'undefined') { bidReturned.dealId = serverBid.dealId }
  if (typeof serverBid.lurl != 'undefined') { bidReturned.lurl = serverBid.lurl }
  if (typeof serverBid.nurl != 'undefined') { bidReturned.nurl = serverBid.nurl }
  if (typeof serverBid.burl != 'undefined') { bidReturned.burl = serverBid.burl }

  if (typeof request.bids.mediaTypes !== 'undefined' && typeof request.bids.mediaTypes.video !== 'undefined') {
    bidReturned.vastXml = serverBid.adm;
    bidReturned.vastUrl = serverBid.lurl;
    bidReturned.ad = serverBid.adm;
    bidReturned.mediaType = VIDEO;
    bidReturned.width = serverBid.w;
    bidReturned.height = serverBid.h;

    if (request.bids.mediaTypes.video.context === 'outstream') {
      const url = (serverBid.ext.purl) ? serverBid.ext.purl : false;
      if (typeof url === 'undefined') {
        utils.logWarn(LOG_PREFIX, 'Error getting player outstream from tappx');
        return false;
      }
      bidReturned.renderer = createRenderer(bidReturned, request, url);
    }
  } else {
    bidReturned.ad = serverBid.adm;
    bidReturned.mediaType = BANNER;
  }

  if (typeof bidReturned.adomain !== 'undefined' || bidReturned.adomain !== null) {
    bidReturned.meta = { advertiserDomains: request.bids.adomain };
  }

  return bidReturned;
}

/**
* Build and makes the request
*
* @param {*} validBidRequests
* @param {*} bidderRequest
* @return response ad
*/
function buildOneRequest(validBidRequests, bidderRequest) {
  let hostInfo = _getHostInfo(validBidRequests);
  const ENDPOINT = hostInfo.endpoint;
  hostDomain = hostInfo.domain;

  const TAPPXKEY = utils.deepAccess(validBidRequests, 'params.tappxkey');
  const MKTAG = utils.deepAccess(validBidRequests, 'params.mktag');
  const BIDFLOOR = utils.deepAccess(validBidRequests, 'params.bidfloor');
  const BIDEXTRA = utils.deepAccess(validBidRequests, 'params.ext');
  const bannerMediaType = utils.deepAccess(validBidRequests, 'mediaTypes.banner');
  const videoMediaType = utils.deepAccess(validBidRequests, 'mediaTypes.video');

  // let requests = [];
  let payload = {};
  let publisher = {};
  let tagid;
  let api = {};

  // > App/Site object
  if (utils.deepAccess(validBidRequests, 'params.app')) {
    let app = {};
    app.name = utils.deepAccess(validBidRequests, 'params.app.name');
    app.bundle = utils.deepAccess(validBidRequests, 'params.app.bundle');
    app.domain = utils.deepAccess(validBidRequests, 'params.app.domain');
    publisher.name = utils.deepAccess(validBidRequests, 'params.app.publisher.name');
    publisher.domain = utils.deepAccess(validBidRequests, 'params.app.publisher.domain');
    tagid = `${app.name}_typeAdBanVid_${getOs()}`;
    payload.app = app;
    api[0] = utils.deepAccess(validBidRequests, 'params.api') ? utils.deepAccess(validBidRequests, 'params.api') : [3, 5];
  } else {
    let bundle = _extractPageUrl(validBidRequests, bidderRequest);
    let site = {};
    site.name = bundle;
    site.domain = bundle;
    publisher.name = bundle;
    publisher.domain = bundle;
    tagid = `${site.name}_typeAdBanVid_${getOs()}`;
    payload.site = site;
  }
  // < App/Site object

  // > Imp object
  let imp = {};
  let w;
  let h;

  if (bannerMediaType) {
    let banner = {};
    w = bannerMediaType.sizes[0][0];
    h = bannerMediaType.sizes[0][1];
    banner.w = w;
    banner.h = h;
    if (
      ((bannerMediaType.sizes[0].indexOf(480) >= 0) && (bannerMediaType.sizes[0].indexOf(320) >= 0)) ||
      ((bannerMediaType.sizes[0].indexOf(768) >= 0) && (bannerMediaType.sizes[0].indexOf(1024) >= 0))) {
      banner.pos = 7
    } else {
      banner.pos = 4
    }

    banner.api = api;

    let format = {};
    format[0] = {};
    format[0].w = w;
    format[0].h = h;
    banner.format = format;

    imp.banner = banner;
  }

  if (typeof videoMediaType !== 'undefined') {
    let video = {};

    let videoParams = utils.deepAccess(validBidRequests, 'params.video');
    if (typeof videoParams !== 'undefined') {
      for (var key in VIDEO_CUSTOM_PARAMS) {
        if (videoParams.hasOwnProperty(key)) {
          video[key] = _checkParamDataType(key, videoParams[key], VIDEO_CUSTOM_PARAMS[key]);
        }
      }
    }

    if ((video.w === undefined || video.w == null || video.w <= 0) ||
        (video.h === undefined || video.h == null || video.h <= 0)) {
      w = videoMediaType.playerSize[0][0];
      h = videoMediaType.playerSize[0][1];
      video.w = w;
      video.h = h;
    }

    video.mimes = videoMediaType.mimes;

    imp.video = video;
  }

  imp.id = validBidRequests.bidId;
  imp.tagid = tagid;
  imp.secure = 1;

  imp.bidfloor = utils.deepAccess(validBidRequests, 'params.bidfloor');
  if (utils.isFn(validBidRequests.getFloor)) {
    try {
      let floor = validBidRequests.getFloor({
        currency: CUR,
        mediaType: '*',
        size: '*'
      });
      if (utils.isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
        imp.bidfloor = floor.floor;
      } else {
        utils.logWarn(LOG_PREFIX, 'Currency not valid. Use only USD with Tappx.');
      }
    } catch (e) {
      utils.logWarn(LOG_PREFIX, e);
      imp.bidfloor = utils.deepAccess(validBidRequests, 'params.bidfloor'); // Be sure that we have an imp.bidfloor
    }
  }

  let bidder = {};
  bidder.endpoint = ENDPOINT;
  bidder.host = hostInfo.url;
  bidder.bidfloor = BIDFLOOR;
  bidder.ext = (typeof BIDEXTRA == 'object') ? BIDEXTRA : undefined;

  imp.ext = {};
  imp.ext.bidder = bidder;
  // < Imp object

  // > Device object
  let device = {};
  // Mandatory
  device.os = getOs();
  device.ip = 'peer';
  device.ua = navigator.userAgent;
  device.ifa = validBidRequests.ifa;

  // Optional
  device.h = screen.height;
  device.w = screen.width;
  device.dnt = utils.getDNT() ? 1 : 0;
  device.language = getLanguage();
  device.make = navigator.vendor ? navigator.vendor : '';

  let geo = {};
  geo.country = utils.deepAccess(validBidRequests, 'params.geo.country');
  // < Device object

  // > GDPR
  let user = {};
  user.ext = {};

  // Universal ID
  let eidsArr = utils.deepAccess(validBidRequests, 'userIdAsEids');
  if (typeof eidsArr !== 'undefined') {
    eidsArr = eidsArr.filter(
      uuid =>
        (typeof uuid !== 'undefined' && uuid !== null) &&
        (typeof uuid.source == 'string' && uuid.source !== null) &&
        (typeof uuid.uids[0].id == 'string' && uuid.uids[0].id !== null)
    )

    if (typeof user !== 'undefined') { user.ext.eids = eidsArr }
  };

  let regs = {};
  regs.gdpr = 0;
  if (!(bidderRequest.gdprConsent == null)) {
    if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') { regs.gdpr = bidderRequest.gdprConsent.gdprApplies; }
    if (regs.gdpr) { user.ext.consent = bidderRequest.gdprConsent.consentString; }
  }

  // CCPA
  regs.ext = {};
  if (!(bidderRequest.uspConsent == null)) {
    regs.ext.us_privacy = bidderRequest.uspConsent;
  }

  // COPPA compliance
  if (config.getConfig('coppa') === true) {
    regs.coppa = config.getConfig('coppa') === true ? 1 : 0;
  }
  // < GDPR

  // > Payload Ext
  let payloadExt = {};
  payloadExt.bidder = {};
  payloadExt.bidder.tappxkey = TAPPXKEY;
  payloadExt.bidder.mktag = MKTAG;
  payloadExt.bidder.bcid = utils.deepAccess(validBidRequests, 'params.bcid');
  payloadExt.bidder.bcrid = utils.deepAccess(validBidRequests, 'params.bcrid');
  payloadExt.bidder.ext = (typeof BIDEXTRA == 'object') ? BIDEXTRA : {};
  if (typeof videoMediaType !== 'undefined') {
    payloadExt.bidder.ext.pbvidtype = videoMediaType.context;
  }
  // < Payload Ext

  // > Payload
  payload.id = validBidRequests.auctionId;
  payload.test = utils.deepAccess(validBidRequests, 'params.test') ? 1 : 0;
  payload.at = 1;
  payload.tmax = bidderRequest.timeout ? bidderRequest.timeout : 600;
  payload.bidder = BIDDER_CODE;
  payload.imp = [imp];
  payload.user = user;
  payload.ext = payloadExt;

  payload.device = device;
  payload.regs = regs;
  // < Payload

  let pbjsv = ($$PREBID_GLOBAL$$.version !== null) ? encodeURIComponent($$PREBID_GLOBAL$$.version) : -1;

  return {
    method: 'POST',
    url: `${hostInfo.url}?type_cnn=${TYPE_CNN}&v=${TAPPX_BIDDER_VERSION}&pbjsv=${pbjsv}`,
    data: JSON.stringify(payload),
    bids: validBidRequests
  };
}

function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

function getOs() {
  let ua = navigator.userAgent;
  if (ua == null) { return 'unknown'; } else if (ua.match(/(iPhone|iPod|iPad)/)) { return 'ios'; } else if (ua.match(/Android/)) { return 'android'; } else if (ua.match(/Window/)) { return 'windows'; } else { return 'unknown'; }
}

export function _getHostInfo(validBidRequests) {
  let domainInfo = {};
  let endpoint = utils.deepAccess(validBidRequests, 'params.endpoint');
  let hostParam = utils.deepAccess(validBidRequests, 'params.host');

  domainInfo.domain = hostParam.split('/', 1)[0];

  let regexNewEndpoints = new RegExp(`^(vz.*|zz.*)\\.[a-z]{3}\\.tappx\\.com$`, 'i');
  let regexClassicEndpoints = new RegExp(`^([a-z]{3}|testing)\\.[a-z]{3}\\.tappx\\.com$`, 'i');

  if (regexNewEndpoints.test(domainInfo.domain)) {
    domainInfo.newEndpoint = true;
    domainInfo.endpoint = domainInfo.domain.split('.', 1)[0]
    domainInfo.url = `https://${hostParam}`
  } else if (regexClassicEndpoints.test(domainInfo.domain)) {
    domainInfo.newEndpoint = false;
    domainInfo.endpoint = endpoint
    domainInfo.url = `https://${hostParam}${endpoint}`
  }

  return domainInfo;
}

function outstreamRender(bid, request) {
  bid.renderer.push(() => {
    window.tappxOutstream.renderAd({
      sizes: [bid.width, bid.height],
      targetId: bid.adUnitCode,
      adResponse: bid.adResponse,
      rendererOptions: {
        content: bid.vastXml
      }
    });
  });
}

function createRenderer(bid, request, url) {
  const rendererInst = Renderer.install({
    id: request.id,
    url: url,
    loaded: false
  });

  try {
    rendererInst.setRender(outstreamRender);
  } catch (err) {
    utils.logWarn(LOG_PREFIX, 'Prebid Error calling setRender on renderer');
  }

  return rendererInst;
}

export function _checkParamDataType(key, value, datatype) {
  var errMsg = 'Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value;
  var functionToExecute;
  switch (datatype) {
    case DATA_TYPES.BOOLEAN:
      functionToExecute = utils.isBoolean;
      break;
    case DATA_TYPES.NUMBER:
      functionToExecute = utils.isNumber;
      break;
    case DATA_TYPES.STRING:
      functionToExecute = utils.isStr;
      break;
    case DATA_TYPES.ARRAY:
      functionToExecute = utils.isArray;
      break;
  }
  if (functionToExecute(value)) {
    return value;
  }
  utils.logWarn(LOG_PREFIX, errMsg);
  return undefined;
}

export function _extractPageUrl(validBidRequests, bidderRequest) {
  let referrer = utils.deepAccess(bidderRequest, 'refererInfo.referer');
  let page = utils.deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || utils.deepAccess(window, 'location.href');
  let paramUrl = utils.deepAccess(validBidRequests, 'params.domainUrl') || config.getConfig('pageUrl');

  let domainUrl = referrer || page || paramUrl;

  try {
    domainUrl = domainUrl.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img)[0].replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?/img, '');
  } catch (error) {
    domainUrl = undefined;
  }

  return domainUrl;
}

registerBidder(spec);
