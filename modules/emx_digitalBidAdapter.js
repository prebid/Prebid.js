import * as utils from 'src/utils';
import {
  registerBidder
} from 'src/adapters/bidderFactory';
import {
  BANNER
} from 'src/mediaTypes';
import {
  config
} from 'src/config';

const BIDDER_CODE = 'emx_digital';
const ENDPOINT = 'hb.emxdgt.com';

let emxAdapter = {};

emxAdapter.validateSizes = function(sizes) {
  if (!utils.isArray(sizes) || typeof sizes[0] === 'undefined') {
    return false;
  }
  return sizes.every(size => utils.isArray(size) && size.length === 2);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!bid.params.tagid &&
            typeof bid.params.tagid === 'string' &&
            (typeof bid.params.bidfloor === 'undefined' || typeof bid.params.bidfloor === 'string') &&
            bid.bidder === BIDDER_CODE &&
            (emxAdapter.validateSizes(bid.mediaTypes.banner.sizes) || emxAdapter.validateSizes(bid.sizes));
  },
  buildRequests: function (validBidRequests, bidRequests) {
    const {host, href, protocol} = utils.getTopWindowLocation();
    let emxData = {};
    let emxImps = [];
    const auctionId = bidRequests.auctionId;
    const timeout = config.getConfig('bidderTimeout');
    const timestamp = Date.now();
    const url = location.protocol + '//' + ENDPOINT + ('?t=' + timeout + '&ts=' + timestamp);
    const networkProtocol = protocol.indexOf('https') > -1 ? 1 : 0;

    utils._each(validBidRequests, function (bid) {
      let tagId = utils.getBidIdParameter('tagid', bid.params);
      let bidFloor = parseFloat(utils.getBidIdParameter('bidfloor', bid.params)) || 0;
      let sizes = bid.mediaTypes.banner.sizes;
      if (!emxAdapter.validateSizes(sizes)) {
        sizes = bid.sizes
      }
      let emxBid = {
        id: bid.bidId,
        tid: bid.transactionId,
        tagid: tagId,
        secure: networkProtocol,
        banner: {
          format: sizes.map(function (size) {
            return {
              w: size[0],
              h: size[1]
            };
          }),
          w: sizes[0][0],
          h: sizes[0][1]
        }
      }
      if (bidFloor > 0) {
        emxBid.bidfloor = bidFloor
      }
      emxImps.push(emxBid);
    });
    emxData = {
      id: auctionId,
      imp: emxImps,
      site: {
        domain: host,
        page: href
      }
    };
    if (bidRequests.gdprConsent) {
      emxData.regs = {
        ext: {
          gdpr: bidRequests.gdprConsent.gdprApplies === true ? 1 : 0
        }
      };
    }
    if (bidRequests.gdprConsent && bidRequests.gdprConsent.gdprApplies) {
      emxData.user = {
        ext: {
          consent: bidRequests.gdprConsent.consentString
        }
      };
    }
    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(emxData),
      options: {
        withCredentials: true
      }
    };
  },
  interpretResponse: function (serverResponse) {
    let emxBidResponses = [];
    let response = serverResponse.body || {};
    if (response.seatbid && response.seatbid.length > 0 && response.seatbid[0].bid) {
      response.seatbid.forEach(function (emxBid) {
        emxBid = emxBid.bid[0];
        emxBidResponses.push({
          requestId: emxBid.id,
          cpm: emxBid.price,
          width: emxBid.w,
          height: emxBid.h,
          creativeId: emxBid.crid || emxBid.id,
          dealId: emxBid.dealid || null,
          currency: 'USD',
          netRevenue: true,
          mediaType: BANNER,
          ad: decodeURIComponent(emxBid.adm),
          ttl: emxBid.ttl
        });
      });
    }
    return emxBidResponses;
  },
  getUserSyncs: function (syncOptions) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: '//biddr.brealtime.com/check.html'
      });
    }
    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: '//edba.brealtime.com/'
      });
    }
    return syncs;
  }
};
registerBidder(spec);
