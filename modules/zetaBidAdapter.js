import { registerBidder } from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
const BIDDER_CODE = 'Zeta Global';
const ENDPOINT_URL = 'https://prebid.rfihub.com/prebid';
const USER_SYNC_URL = 'http://p.rfihub.com/cm?pub=42770&in=1';
const DEFAULT_CUR = 'USD';

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
    return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
  },

  /**
     * Make a server request from the lqist of BidRequests.
     *
     * @param {validBidRequests[]} - an array of bidRequest objects
     * @param {bidderRequest} - master bidRequest object
     * @return ServerRequest Info describing the request to the server.
     */
  buildRequests: function(validBidRequests, bidderRequest) {
    const secure = location.protocol.indexOf('https') > -1 ? 1 : 0;
    const request = validBidRequests[0];
    const params = request.params;
    let impData = {
      id: request.bidId,
      secure,
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
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: function(serverResponse, bidRequest) {
    const ttl = 200;
    const netRev = true;
    let bidResponse = [];
    if (serverResponse.body !== {}) {
      let zetaResponse = serverResponse.body;
      let cur = zetaResponse.cur;
      let zetaBid = zetaResponse.seatbid[0].bid[0];
      let bid = {
        requestId: zetaResponse.id,
        cpm: zetaBid.price,
        currency: cur,
        width: zetaBid.w,
        height: zetaBid.h,
        ad: zetaBid.adm,
        ttl: ttl,
        creativeId: zetaBid.crid,
        netRevenue: netRev
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
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []
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
  let sizes;
  request.mediaTypes &&
    request.mediaTypes.banner &&
    request.mediaTypes.banner.sizes
    ? sizes = request.mediaTypes.banner.sizes
    : sizes = request.sizes;
  return {
    w: sizes[0][0],
    h: sizes[0][1]
  };
}

registerBidder(spec);
