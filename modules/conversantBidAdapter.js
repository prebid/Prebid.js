import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import { BANNER, VIDEO } from '../src/mediaTypes';

const BIDDER_CODE = 'conversant';
const URL = '//web.hb.ad.cpe.dotomi.com/s2s/header/24';
const VERSION = '2.2.4';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['cnvr'], // short code
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid - The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (!bid || !bid.params) {
      utils.logWarn(BIDDER_CODE + ': Missing bid parameters');
      return false;
    }

    if (!utils.isStr(bid.params.site_id)) {
      utils.logWarn(BIDDER_CODE + ': site_id must be specified as a string')
      return false;
    }

    if (isVideoRequest(bid)) {
      if (!bid.params.mimes) {
        // Give a warning but let it pass
        utils.logWarn(BIDDER_CODE + ': mimes should be specified for videos');
      } else if (!utils.isArray(bid.params.mimes) || !bid.params.mimes.every(s => utils.isStr(s))) {
        utils.logWarn(BIDDER_CODE + ': mimes must be an array of strings');
        return false;
      }
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return {ServerRequest} Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const loc = utils.getTopWindowLocation();
    const page = loc.href;
    const isPageSecure = (loc.protocol === 'https:') ? 1 : 0;
    let siteId = '';
    let requestId = '';
    let pubcid = null;

    const conversantImps = validBidRequests.map(function(bid) {
      const bidfloor = utils.getBidIdParameter('bidfloor', bid.params);
      const secure = isPageSecure || (utils.getBidIdParameter('secure', bid.params) ? 1 : 0);

      siteId = utils.getBidIdParameter('site_id', bid.params);
      requestId = bid.auctionId;

      const imp = {
        id: bid.bidId,
        secure: secure,
        bidfloor: bidfloor || 0,
        displaymanager: 'Prebid.js',
        displaymanagerver: VERSION
      };

      copyOptProperty(bid.params.tag_id, imp, 'tagid');

      if (isVideoRequest(bid)) {
        const videoData = utils.deepAccess(bid, 'mediaTypes.video') || {};
        const format = convertSizes(videoData.playerSize || bid.sizes);
        const video = {};

        if (format && format[0]) {
          copyOptProperty(format[0].w, video, 'w');
          copyOptProperty(format[0].h, video, 'h');
        }

        copyOptProperty(bid.params.position, video, 'pos');
        copyOptProperty(bid.params.mimes || videoData.mimes, video, 'mimes');
        copyOptProperty(bid.params.maxduration, video, 'maxduration');
        copyOptProperty(bid.params.protocols || videoData.protocols, video, 'protocols');
        copyOptProperty(bid.params.api || videoData.api, video, 'api');

        imp.video = video;
      } else {
        const bannerData = utils.deepAccess(bid, 'mediaTypes.banner') || {};
        const format = convertSizes(bannerData.sizes || bid.sizes);
        const banner = {format: format};

        copyOptProperty(bid.params.position, banner, 'pos');

        imp.banner = banner;
      }

      if (bid.userId && bid.userId.pubcid) {
        pubcid = bid.userId.pubcid;
      } else if (bid.crumbs && bid.crumbs.pubcid) {
        pubcid = bid.crumbs.pubcid;
      }

      return imp;
    });

    const payload = {
      id: requestId,
      imp: conversantImps,
      site: {
        id: siteId,
        mobile: document.querySelector('meta[name="viewport"][content*="width=device-width"]') !== null ? 1 : 0,
        page: page
      },
      device: getDevice(),
      at: 1
    };

    let userExt = {};

    // Add GDPR flag and consent string
    if (bidderRequest && bidderRequest.gdprConsent) {
      userExt.consent = bidderRequest.gdprConsent.consentString;

      if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
        payload.regs = {
          ext: {
            gdpr: (bidderRequest.gdprConsent.gdprApplies ? 1 : 0)
          }
        };
      }
    }

    // Add common id if available
    if (pubcid) {
      userExt.fpc = pubcid;
    }

    // Only add the user object if it's not empty
    if (!utils.isEmpty(userExt)) {
      payload.user = {ext: userExt};
    }

    return {
      method: 'POST',
      url: URL,
      data: payload,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    const requestMap = {};
    serverResponse = serverResponse.body;

    if (bidRequest && bidRequest.data && bidRequest.data.imp) {
      utils._each(bidRequest.data.imp, imp => requestMap[imp.id] = imp);
    }

    if (serverResponse && utils.isArray(serverResponse.seatbid)) {
      utils._each(serverResponse.seatbid, function(bidList) {
        utils._each(bidList.bid, function(conversantBid) {
          const responseCPM = parseFloat(conversantBid.price);
          if (responseCPM > 0.0 && conversantBid.impid) {
            const responseAd = conversantBid.adm || '';
            const responseNurl = conversantBid.nurl || '';
            const request = requestMap[conversantBid.impid];

            const bid = {
              requestId: conversantBid.impid,
              currency: serverResponse.cur || 'USD',
              cpm: responseCPM,
              creativeId: conversantBid.crid || '',
              ttl: 300,
              netRevenue: true
            };

            if (request.video) {
              bid.vastUrl = responseAd;
              bid.mediaType = 'video';
              bid.width = request.video.w;
              bid.height = request.video.h;
            } else {
              bid.ad = responseAd + '<img src="' + responseNurl + '" />';
              bid.width = conversantBid.w;
              bid.height = conversantBid.h;
            }

            bidResponses.push(bid);
          }
        })
      });
    }

    return bidResponses;
  },

  /**
   * Covert bid param types for S2S
   * @param {Object} params bid params
   * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
   * @return {Object} params bid params
   */
  transformBidParams: function(params, isOpenRtb) {
    return utils.convertTypes({
      'site_id': 'string',
      'secure': 'number',
      'mobile': 'number'
    }, params);
  }
};

/**
 * Determine do-not-track state
 *
 * @returns {boolean}
 */
function getDNT() {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNoTrack === '1' || navigator.doNotTrack === 'yes';
}

/**
 * Return openrtb device object that includes ua, width, and height.
 *
 * @returns {Device} Openrtb device object
 */
function getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    h: screen.height,
    w: screen.width,
    dnt: getDNT() ? 1 : 0,
    language: navigator[language].split('-')[0],
    make: navigator.vendor ? navigator.vendor : '',
    ua: navigator.userAgent
  };
}

/**
 * Convert arrays of widths and heights to an array of objects with w and h properties.
 *
 * [[300, 250], [300, 600]] => [{w: 300, h: 250}, {w: 300, h: 600}]
 *
 * @param {number[2][]|number[2]} bidSizes - arrays of widths and heights
 * @returns {object[]} Array of objects with w and h
 */
function convertSizes(bidSizes) {
  let format;
  if (Array.isArray(bidSizes)) {
    if (bidSizes.length === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
      format = [{w: bidSizes[0], h: bidSizes[1]}];
    } else {
      format = utils._map(bidSizes, d => { return {w: d[0], h: d[1]}; });
    }
  }

  return format;
}

/**
 * Check if it's a video bid request
 *
 * @param {BidRequest} bid - Bid request generated from ad slots
 * @returns {boolean} True if it's a video bid
 */
function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!utils.deepAccess(bid, 'mediaTypes.video');
}

/**
 * Copy property if exists from src to dst
 *
 * @param {object} src - source object
 * @param {object} dst - destination object
 * @param {string} dstName - destination property name
 */
function copyOptProperty(src, dst, dstName) {
  if (src) {
    dst[dstName] = src;
  }
}

registerBidder(spec);
