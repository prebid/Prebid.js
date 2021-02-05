'use strict';

import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'tappx';
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
      utils.logWarn(`[TAPPX]: The Tappx endpoint and Tappxkey are mandatory. ${JSON.stringify(bid)}`);
      return false;
    }
    return true;
  },

  /**
   * Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test.
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    // Host definition
    HOST = getParameters(validBidRequests, 'params.host');
    hostDomain = HOST.split('/', 1)[0];

    const ENDPOINT = getParameters(validBidRequests, 'params.endpoint');
    const TAPPXKEY = getParameters(validBidRequests, 'params.tappxkey');
    const BIDFLOOR = getParameters(validBidRequests, 'params.bidfloor');
    const bannerMediaType = getParameters(validBidRequests, 'mediaTypes.banner');

    let requests = [];
    let payload = {};
    let publisher = {};
    let tagid;
    let api = {};

    // > App/Site object
    if (getParameters(validBidRequests, 'params.app')) {
      let app = {};
      app.name = getParameters(validBidRequests, 'params.app.name');
      app.bundle = getParameters(validBidRequests, 'params.app.bundle');
      app.domain = getParameters(validBidRequests, 'params.app.domain');
      publisher.name = getParameters(validBidRequests, 'params.app.publisher.name');
      publisher.domain = getParameters(validBidRequests, 'params.app.publisher.domain');
      tagid = `${app.name}_typeAdBanVid_${getOs()}`;
      payload.app = app;
      api[0] = getParameters(validBidRequests, 'params.api') ? getParameters(validBidRequests, 'params.api') : [3, 5];
    } else {
      let site = {};
      site.name = window.location.hostname;
      site.bundle = window.location.hostname;
      site.domain = window.location.hostname;
      publisher.name = window.location.hostname;
      publisher.domain = window.location.hostname;
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

    imp.id = 1;
    imp.tagid = tagid;
    imp.secure = 1;

    imp.bidfloor = getParameters(validBidRequests, 'params.bidfloor');
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
    geo.country = getParameters(validBidRequests, 'params.geo.country');
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
    payload.id = validBidRequests[0].auctionId;
    payload.test = 1;
    payload.at = 1;
    payload.tmax = 500;
    payload.bidder = BIDDER_CODE;
    payload.imp = [imp];

    payload.device = device;
    payload.params = params;
    payload.regs = regs;
    // < Payload

    requests.push({
      method: 'POST',
      url: `https://${HOST}/${ENDPOINT}?type_cnn=prebidjs`,
      data: JSON.stringify(payload),
      bids: validBidRequests
    });

    return requests;
  },

  /**
   *
   * @param {*} serverResponse
   * @param {*} bids
   */
  interpretResponse: function(serverResponse, { bids }) {
    if (!serverResponse.body) {
      utils.logWarn('[TAPPX]: Empty response body HTTP 204, no bids');
      return [];
    }
    const { seatbid, cur } = serverResponse.body;

    const bidResponses = flatten(seatbid.map(seat => seat.bid)).reduce((result, bid) => {
      result[bid.impid - 1] = bid;
      return result;
    }, []);

    return bids.map((bid, id) => {
      const bidResponse = bidResponses[id];
      if (bidResponse) {
        let bidReturned = {
          requestId: bid.bidId,
          cpm: bidResponse.price,
          width: bidResponse.w,
          height: bidResponse.h,
          size: `${bidResponse.w}x${bidResponse.h}`,
          ad: bidResponse.adm,
          ttl: 360,
          creativeId: bidResponse.crid,
          adId: bid.bidId,
          netRevenue: bid.netRevenue === 'net',
          currency: cur,
          bidderCode: BIDDER_CODE,
        };

        if (bid.mediaTypes.banner) {
          bidReturned.ad = bidResponse.adm;
          bidReturned.mediaType = BANNER;
        }

        return bidReturned;
      }
    }).filter(Boolean);
  },

  /**
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

function getParameters(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = utils.deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return navigator[language].split('-')[0];
}

function getOs() {
  let ua = navigator.userAgent;
  if (ua == null) { return 'unknown'; } else if (ua.match(/(iPhone|iPod|iPad)/)) { return 'ios'; } else if (ua.match(/Android/)) { return 'android'; } else if (ua.match(/Window/)) { return 'windows'; } else { return 'unknown'; }
}

function flatten(arr) {
  return [].concat(...arr);
}

registerBidder(spec);
