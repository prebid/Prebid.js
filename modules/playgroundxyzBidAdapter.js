import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';
import * as utils from '../src/utils';

const BIDDER_CODE = 'playgroundxyz';
const URL = 'https://ads.playground.xyz/host-config/prebid?v=2';
const DEFAULT_CURRENCY = 'USD';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['playgroundxyz', 'pxyz'],
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const referer = bidderRequest.refererInfo.referer;
    const parts = referer.split('/');

    let protocol, hostname;
    if (parts.length >= 3) {
      protocol = parts[0];
      hostname = parts[2];
    }

    const payload = {
      id: bidRequests[0].auctionId,
      site: {
        domain: protocol + '//' + hostname,
        name: hostname,
        page: referer,
      },
      device: {
        ua: navigator.userAgent,
        language: navigator.language,
        devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2,
      },
      imp: bidRequests.map(mapImpression)
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.user = {ext: {consent: bidderRequest.gdprConsent.consentString}};
      const gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      payload.regs = {ext: {gdpr: gdpr}};
    }

    return {
      method: 'POST',
      url: URL,
      data: JSON.stringify(payload),
      bidderRequest
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, { bidderRequest }) {
    serverResponse = serverResponse.body;
    const bids = [];

    if (!serverResponse || serverResponse.error) {
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
      if (serverResponse && serverResponse.error) {
        errorMessage += `: ${serverResponse.error}`;
        utils.logError(errorMessage);
      }
      return bids;
    }

    if (!utils.isArray(serverResponse.seatbid)) {
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter `;
      utils.logError(errorMessage += 'Malformed seatbid response');
      return bids;
    }

    if (!serverResponse.seatbid) {
      return bids;
    }

    const currency = serverResponse.cur || DEFAULT_CURRENCY;
    serverResponse.seatbid.forEach(sBid => {
      if (sBid.hasOwnProperty('bid')) {
        sBid.bid.forEach(iBid => {
          if (iBid.price !== 0) {
            const bid = newBid(iBid, currency);
            bids.push(bid);
          }
        });
      }
    });
    return bids;
  },

  getUserSyncs: function (syncOptions) {
    return [{
      type: 'image',
      url: '//ib.adnxs.com/getuidnb?https://ads.playground.xyz/usersync?partner=appnexus&uid=$UID'
    }];
  }
}

function newBid(bid, currency) {
  return {
    requestId: bid.impid,
    mediaType: BANNER,
    cpm: bid.price,
    creativeId: bid.adid,
    ad: bid.adm,
    width: bid.w,
    height: bid.h,
    ttl: 300,
    netRevenue: true,
    currency: currency,
  };
}

function mapImpression(bid) {
  return {
    id: bid.bidId,
    banner: mapBanner(bid),
    ext: {
      appnexus: {
        placement_id: parseInt(bid.params.placementId, 10)
      },
      pxyz: {
        adapter: {
          vendor: 'prebid',
          prebid: '$prebid.version$'
        }
      }
    }
  };
}

function mapBanner(bid) {
  return {
    w: parseInt(bid.sizes[0][0], 10),
    h: parseInt(bid.sizes[0][1], 10),
    format: mapSizes(bid.sizes)
  };
}

function mapSizes(bidSizes) {
  const format = [];
  bidSizes.forEach(size => {
    format.push({
      w: parseInt(size[0], 10),
      h: parseInt(size[1], 10)
    });
  });
  return format;
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i).test(navigator.userAgent);
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(navigator.userAgent);
}

registerBidder(spec);
