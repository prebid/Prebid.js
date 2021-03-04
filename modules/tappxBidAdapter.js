'use strict';

import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'tappx';
const TTL = 360;
const CUR = 'USD';
var HOST;
var hostDomain;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
  */
  isBidRequestValid: function(bid) {
    if ((bid.params == null) || (bid.params.endpoint == null) || (bid.params.tappxkey == null)) {
      utils.logWarn(`[TAPPX]: Please review the mandatory Tappx parameters. ${JSON.stringify(bid)}`);
      return false;
    }
    return true;
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
        bids.push(interpretBannerBid(serverBid, originalRequest));
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

/**
 * Parse the response and generate one bid object.
 *
 * @param {object} serverBid Bid by OpenRTB 2.5
 * @returns {object} Prebid banner bidObject
 */
function interpretBannerBid(serverBid, request) {
  return {
    requestId: request.bids.bidId,
    cpm: serverBid.price,
    currency: serverBid.cur ? serverBid.cur : CUR,
    width: serverBid.w,
    height: serverBid.h,
    ad: serverBid.adm,
    ttl: TTL,
    creativeId: serverBid.crid,
    netRevenue: true,
    mediaType: BANNER,
  }
}

/**
* Build and makes the request
*
* @param {*} validBidRequests
* @param {*} bidderRequest
* @return response ad
*/
function buildOneRequest(validBidRequests, bidderRequest) {
  HOST = utils.deepAccess(validBidRequests, 'params.host');
  hostDomain = HOST.split('/', 1)[0];

  const ENDPOINT = utils.deepAccess(validBidRequests, 'params.endpoint');
  const TAPPXKEY = utils.deepAccess(validBidRequests, 'params.tappxkey');
  const BIDFLOOR = utils.deepAccess(validBidRequests, 'params.bidfloor');
  const bannerMediaType = utils.deepAccess(validBidRequests, 'mediaTypes.banner');
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

  imp.id = validBidRequests.bidId;
  imp.tagid = tagid;
  imp.secure = 1;

  imp.bidfloor = utils.deepAccess(validBidRequests, 'params.bidfloor');
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
  params.tappxkey = TAPPXKEY;
  params.endpoint = ENDPOINT;
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
    url: `https://${HOST}/${ENDPOINT}?type_cnn=prebidjs`,
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

registerBidder(spec);
