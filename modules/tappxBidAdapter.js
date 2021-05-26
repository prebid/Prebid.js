'use strict';

import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'tappx';
const TTL = 360;
const CUR = 'USD';
const TAPPX_BIDDER_VERSION = '0.1.10514';
const TYPE_CNN = 'prebidjs';
const VIDEO_SUPPORT = ['instream'];

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
      utils.logWarn('[TAPPX]: Empty response body HTTP 204, no bids');
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
      url += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
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
    utils.logWarn(`[TAPPX]: Please review the mandatory Tappx parameters.`);
    return false;
  }

  if (bid.params.tappxkey == null) {
    utils.logWarn(`[TAPPX]: Please review the mandatory Tappxkey parameter.`);
    return false;
  }

  if (bid.params.host == null) {
    utils.logWarn(`[TAPPX]: Please review the mandatory Host parameter.`);
    return false;
  }

  let classicEndpoint = true
  if ((new RegExp(`^(vz.*|zz.*)\.*$`, 'i')).test(bid.params.host)) {
    classicEndpoint = false
  }

  if (classicEndpoint && bid.params.endpoint == null) {
    utils.logWarn(`[TAPPX]: Please review the mandatory endpoint Tappx parameters.`);
    return false;
  }

  return true;
}

function validMediaType(bid) {
  const video = utils.deepAccess(bid, 'mediaTypes.video');

  // Video validations
  if (typeof video != 'undefined') {
    if (VIDEO_SUPPORT.indexOf(video.context) === -1) {
      utils.logWarn(`[TAPPX]: Please review the mandatory Tappx parameters for Video. Only "instream" is suported.`);
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

  if (typeof serverBid.dealId != 'undefined') { bidReturned.dealId = serverBid.dealId }

  if (typeof request.bids.mediaTypes != 'undefined' && typeof request.bids.mediaTypes.video != 'undefined') {
    bidReturned.vastXml = serverBid.adm;
    bidReturned.vastUrl = serverBid.lurl;
    bidReturned.ad = serverBid.adm;
    bidReturned.mediaType = VIDEO;
  } else {
    bidReturned.ad = serverBid.adm;
    bidReturned.mediaType = BANNER;
  }

  if (typeof bidReturned.adomain != 'undefined' || bidReturned.adomain != null) {
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
  let hostInfo = getHostInfo(validBidRequests);
  const ENDPOINT = hostInfo.endpoint;
  hostDomain = hostInfo.domain;

  const TAPPXKEY = utils.deepAccess(validBidRequests, 'params.tappxkey');
  const BIDFLOOR = utils.deepAccess(validBidRequests, 'params.bidfloor');
  const BIDEXTRA = utils.deepAccess(validBidRequests, 'params.ext');
  const bannerMediaType = utils.deepAccess(validBidRequests, 'mediaTypes.banner');
  const videoMediaType = utils.deepAccess(validBidRequests, 'mediaTypes.video');
  const { refererInfo } = bidderRequest;

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
    let site = {};
    site.name = (bidderRequest && refererInfo) ? utils.parseUrl(refererInfo.referer).hostname : window.location.hostname;
    site.bundle = (bidderRequest && refererInfo) ? utils.parseUrl(refererInfo.referer).hostname : window.location.hostname;
    site.domain = (bidderRequest && refererInfo) ? utils.parseUrl(refererInfo.referer).hostname : window.location.hostname;
    publisher.name = (bidderRequest && refererInfo) ? utils.parseUrl(refererInfo.referer).hostname : window.location.hostname;
    publisher.domain = (bidderRequest && refererInfo) ? utils.parseUrl(refererInfo.referer).hostname : window.location.hostname;
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

  if (videoMediaType) {
    let video = {};
    w = videoMediaType.playerSize[0][0];
    h = videoMediaType.playerSize[0][1];
    video.w = w;
    video.h = h;

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
        utils.logWarn('[TAPPX]: ', 'Currency not valid. Use only USD with Tappx.');
      }
    } catch (e) {
      utils.logWarn('[TAPPX]: ', e);
      imp.bidfloor = utils.deepAccess(validBidRequests, 'params.bidfloor'); // Be sure that we have an imp.bidfloor
    }
  }

  let bidder = {};
  bidder.tappxkey = TAPPXKEY;
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

  // > Params
  let params = {};
  params.host = 'tappx.com';
  params.bidfloor = BIDFLOOR;
  // < Params

  // > GDPR
  let regs = {};
  regs.gdpr = 0;
  if (!(bidderRequest.gdprConsent == null)) {
    if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') { regs.gdpr = bidderRequest.gdprConsent.gdprApplies; }
    if (regs.gdpr) { regs.consent = bidderRequest.gdprConsent.consentString; }
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

  // Universal ID
  const eidsArr = utils.deepAccess(validBidRequests, 'userIdAsEids');
  payload.user = {
    ext: {
      eids: eidsArr
    }
  };
  // < GDPR

  // > Payload
  payload.id = validBidRequests.auctionId;
  payload.test = utils.deepAccess(validBidRequests, 'params.test') ? 1 : 0;
  payload.at = 1;
  payload.tmax = bidderRequest.timeout ? bidderRequest.timeout : 600;
  payload.bidder = BIDDER_CODE;
  payload.imp = [imp];

  payload.device = device;
  payload.params = params;
  payload.regs = regs;
  // < Payload

  return {
    method: 'POST',
    url: `${hostInfo.url}?type_cnn=${TYPE_CNN}&v=${TAPPX_BIDDER_VERSION}`,
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

function getHostInfo(validBidRequests) {
  let domainInfo = {};
  let endpoint = utils.deepAccess(validBidRequests, 'params.endpoint');
  let hostParam = utils.deepAccess(validBidRequests, 'params.host');

  domainInfo.domain = hostParam.split('/', 1)[0];

  let regexNewEndpoints = new RegExp(`^(vz.*|zz.*)\.pub\.tappx\.com$`, 'i');
  let regexClassicEndpoints = new RegExp(`^([a-z]{3}|testing)\.[a-z]{3}\.tappx\.com$`, 'i');

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

registerBidder(spec);
