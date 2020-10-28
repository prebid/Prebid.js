import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
const BIDDER_CODE = 'zeta_global';
const ENDPOINT_URL = 'https://prebid.rfihub.com/prebid';
const USER_SYNC_URL = 'https://p.rfihub.com/cm?pub=42770&in=1';
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
  isBidRequestValid: function(bid) {
    // check for all required bid fields
    let isValid = !!(
      bid &&
      bid.bidId &&
      bid.params &&
      bid.params.ip &&
      bid.params.user &&
      bid.params.user.buyeruid &&
      bid.params.definerId
    );
    if (!isValid) {
      utils.logWarn('Invalid bid request');
    }
    return isValid;
  },

  /**
     * Make a server request from the list of BidRequests.
     *
     * @param {Bids[]} validBidRequests - an array of bidRequest objects
     * @param {BidderRequest} bidderRequest - master bidRequest object
     * @return ServerRequest Info describing the request to the server.
     */
  buildRequests: function(validBidRequests, bidderRequest) {
    const secure = 1; // treat all requests as secure
    const request = validBidRequests[0];
    const params = request.params;
    let impData = {
      id: request.bidId,
      secure: secure,
      banner: buildBanner(request)
    };
    let isMobile = /(ios|ipod|ipad|iphone|android)/i.test(navigator.userAgent) ? 1 : 0;
    let payload = {
      id: bidderRequest.auctionId,
      cur: [DEFAULT_CUR],
      imp: [impData],
      site: {
        mobile: isMobile,
        page: bidderRequest.refererInfo.referer
      },
      device: {
        ua: navigator.userAgent,
        ip: params.ip
      },
      user: {
        buyeruid: params.user.buyeruid,
        uid: params.user.uid
      },
      ext: {
        definerId: params.definerId
      }
    };
    if (params.test) {
      payload.test = params.test;
    }
    if (request.gdprConsent) {
      payload.regs = {
        ext: {
          gdpr: request.gdprConsent.gdprApplies === true ? 1 : 0
        }
      };
    }
    if (request.gdprConsent && request.gdprConsent.gdprApplies) {
      payload.user = {
        ext: {
          consent: request.gdprConsent.consentString
        }
      };
    }
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(payload),
    };
  },

  /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {ServerResponse} serverResponse A successful response from the server.
     * @param bidRequest The payload from the server's response.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: function(serverResponse, bidRequest) {
    let bidResponse = [];
    if (Object.keys(serverResponse.body).length !== 0) {
      let zetaResponse = serverResponse.body;
      let zetaBid = zetaResponse.seatbid[0].bid[0];
      let bid = {
        requestId: zetaBid.impid,
        cpm: zetaBid.price,
        currency: zetaResponse.cur,
        width: zetaBid.w,
        height: zetaBid.h,
        ad: zetaBid.adm,
        ttl: TTL,
        creativeId: zetaBid.crid,
        netRevenue: NET_REV
      };
      bidResponse.push(bid);
    }
    return bidResponse;
  },

  /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @param gdprConsent The GDPR consent parameters
     * @param uspConsent The USP consent parameters
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: USER_SYNC_URL
      });
    }
    return syncs;
  }
}

function buildBanner(request) {
  let sizes = request.sizes;
  if (request.mediaTypes &&
    request.mediaTypes.banner &&
    request.mediaTypes.banner.sizes) {
    sizes = request.mediaTypes.banner.sizes;
  }
  return {
    w: sizes[0][0],
    h: sizes[0][1]
  };
}

registerBidder(spec);
