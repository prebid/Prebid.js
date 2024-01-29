import {deepAccess, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'zmaticoo';
const ENDPOINT_URL = 'https://bid.zmaticoo.com/prebid/bid';
const DEFAULT_CUR = 'USD';
const TTL = 200;
const NET_REV = true;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // check for all required bid fields
    if (!(bid && bid.bidId && bid.params)) {
      logWarn('Invalid bid request - missing required bid data');
      return false;
    }

    if (!(bid.params.pubId)) {
      logWarn('Invalid bid request - missing required field pubId');
      return false;
    }

    if (!(bid.params.device && bid.params.device.ip)) {
      logWarn('Invalid bid request - missing required device data');
      return false;
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Bids[]} validBidRequests - an array of bidRequest objects
   * @param {BidderRequest} bidderRequest - master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const secure = 1;
    const request = validBidRequests[0];
    const params = request.params;
    let impData = {
      id: request.bidId,
      secure: secure,
      banner: buildBanner(request),
      ext: {
        bidder: {
          pubId: params.pubId
        }
      }
    };
    let payload = {
      id: bidderRequest.bidderRequestId,
      imp: [impData],
      site: params.site ? params.site : {},
      app: params.app ? params.app : {},
      device: params.device ? params.device : {},
      user: params.user ? params.user : {},
      at: params.at,
      tmax: params.tmax,
      wseat: params.wseat,
      bseat: params.bseat,
      allimps: params.allimps,
      cur: [DEFAULT_CUR],
      wlang: params.wlang,
      bcat: deepAccess(bidderRequest.ortb2Imp, 'bcat') || params.bcat,
      badv: params.badv,
      bapp: params.bapp,
      source: params.source ? params.source : {},
      regs: params.regs ? params.regs : {},
      ext: params.ext ? params.ext : {}
    };

    payload.device.ua = navigator.userAgent;
    payload.device.ip = navigator.ip;
    payload.site.page = bidderRequest.refererInfo.page;
    payload.site.mobile = /(ios|ipod|ipad|iphone|android)/i.test(navigator.userAgent) ? 1 : 0;
    if (params.test) {
      payload.test = params.test;
    }
    if (request.gdprConsent) {
      payload.regs.ext = Object.assign(payload.regs.ext, {gdpr: request.gdprConsent.gdprApplies === true ? 1 : 0});
    }
    if (request.gdprConsent && request.gdprConsent.gdprApplies) {
      payload.user.ext = Object.assign(payload.user.ext, {consent: request.gdprConsent.consentString});
    }
    const postUrl = ENDPOINT_URL;
    return {
      method: 'POST', url: postUrl, data: JSON.stringify(payload),
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest The payload from the server's response.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    let bidResponse = [];
    if (Object.keys(serverResponse.body).length !== 0) {
      let zresponse = serverResponse.body;
      let zbid = zresponse.seatbid[0].bid[0];
      let bid = {
        requestId: zbid.impid,
        cpm: zbid.price,
        currency: zbid.cur,
        width: zbid.w,
        height: zbid.h,
        ad: zbid.adm,
        ttl: TTL,
        creativeId: zbid.crid,
        netRevenue: NET_REV
      };
      bidResponse.push(bid);
    }
    return bidResponse;
  }
}

function buildBanner(request) {
  let sizes = request.sizes;
  if (request.mediaTypes && request.mediaTypes.banner && request.mediaTypes.banner.sizes) {
    sizes = request.mediaTypes.banner.sizes;
  }
  return {
    w: sizes[0][0], h: sizes[0][1]
  };
}

registerBidder(spec);
