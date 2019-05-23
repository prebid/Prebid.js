import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, VIDEO } from '../src/mediaTypes';
import { config } from '../src/config';
import includes from 'core-js/library/fn/array/includes';

const BIDDER_CODE = 'emx_digital';
const ENDPOINT = 'hb.emxdgt.com';

export const emxAdapter = {
  validateSizes: (sizes) => {
    if (!utils.isArray(sizes) || typeof sizes[0] === 'undefined') {
      utils.logWarn(BIDDER_CODE + ': Sizes should be an array');
      return false;
    }
    return sizes.every(size => utils.isArray(size) && size.length === 2);
  },
  checkVideoContext: (bid) => {
    return (bid && bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.context && bid.mediaTypes.video.context === 'instream');
  },
  buildBanner: (bid) => {
    let sizes = [];
    bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes ? sizes = bid.mediaTypes.banner.sizes : sizes = bid.sizes;
    if (!emxAdapter.validateSizes(sizes)) {
      utils.logWarn(BIDDER_CODE + ': could not detect mediaType banner sizes. Assigning to bid sizes instead');
      sizes = bid.sizes
    }
    return {
      format: sizes.map((size) => {
        return {
          w: size[0],
          h: size[1]
        };
      }),
      w: sizes[0][0],
      h: sizes[0][1]
    };
  },
  formatVideoResponse: (bidResponse, emxBid) => {
    bidResponse.vastXml = emxBid.adm;
    return bidResponse;
  },
  buildVideo: (bid) => {
    bid.params.video.h = bid.mediaTypes.video.playerSize[0][1];
    bid.params.video.w = bid.mediaTypes.video.playerSize[0][0];
    return emxAdapter.cleanProtocols(bid.params.video);
  },
  cleanProtocols: (video) => {
    if (video.protocols && includes(video.protocols, 7)) {
      utils.logWarn(BIDDER_CODE + ': VAST 4.0 is currently not supported. This protocol has been filtered out of the request.');
      video.protocols = video.protocols.filter(protocol => protocol !== 7);
    }
    return video;
  },
  getGdpr: (bidRequests, emxData) => {
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

    return emxData;
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    if (!bid || !bid.params) {
      utils.logWarn(BIDDER_CODE + ': Missing bid or bid params.');
      return false;
    }

    if (bid.bidder !== BIDDER_CODE) {
      utils.logWarn(BIDDER_CODE + ': Must use "emx_digital" as bidder code.');
      return false;
    }

    if (!bid.params.tagid || !utils.isStr(bid.params.tagid)) {
      utils.logWarn(BIDDER_CODE + ': Missing tagid param or tagid present and not type String.');
      return false;
    }

    if (bid.mediaTypes && bid.mediaTypes.banner) {
      let sizes;
      bid.mediaTypes.banner.sizes ? sizes = bid.mediaTypes.banner.sizes : sizes = bid.sizes;
      if (!emxAdapter.validateSizes(sizes)) {
        utils.logWarn(BIDDER_CODE + ': Missing sizes in bid');
        return false;
      }
    } else if (bid.mediaTypes && bid.mediaTypes.video) {
      if (!emxAdapter.checkVideoContext(bid)) {
        utils.logWarn(BIDDER_CODE + ': Missing video context: instream');
        return false;
      }

      if (!bid.mediaTypes.video.playerSize) {
        utils.logWarn(BIDDER_CODE + ': Missing video playerSize');
        return false;
      }
    }

    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const page = bidderRequest.refererInfo.referer;
    let emxImps = [];
    const timeout = config.getConfig('bidderTimeout');
    const timestamp = Date.now();
    const url = location.protocol + '//' + ENDPOINT + ('?t=' + timeout + '&ts=' + timestamp);
    const networkProtocol = location.protocol.indexOf('https') > -1 ? 1 : 0;

    utils._each(validBidRequests, function (bid) {
      let tagId = utils.getBidIdParameter('tagid', bid.params);
      let bidFloor = parseFloat(utils.getBidIdParameter('bidfloor', bid.params)) || 0;
      let isVideo = !!bid.mediaTypes.video;
      let data = {
        id: bid.bidId,
        tid: bid.transactionId,
        tagid: tagId,
        secure: networkProtocol
      };
      let typeSpecifics = isVideo ? { video: emxAdapter.buildVideo(bid) } : { banner: emxAdapter.buildBanner(bid) };
      let emxBid = Object.assign(data, typeSpecifics);

      if (bidFloor > 0) {
        emxBid.bidfloor = bidFloor
      }
      emxImps.push(emxBid);
    });

    let emxData = {
      id: bidderRequest.auctionId,
      imp: emxImps,
      site: {
        domain: window.top.document.location.host,
        page: page
      },
      version: '1.21.1'
    };

    emxData = emxAdapter.getGdpr(bidderRequest, Object.assign({}, emxData));
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
        let isVideo = false;
        let bidResponse = {
          requestId: emxBid.id,
          cpm: emxBid.price,
          width: emxBid.w,
          height: emxBid.h,
          creativeId: emxBid.crid || emxBid.id,
          dealId: emxBid.dealid || null,
          currency: 'USD',
          netRevenue: true,
          ttl: emxBid.ttl,
          ad: decodeURIComponent(emxBid.adm)
        };
        if (emxBid.adm && emxBid.adm.indexOf('<?xml version=') > -1) {
          isVideo = true;
          bidResponse = emxAdapter.formatVideoResponse(bidResponse, Object.assign({}, emxBid));
        }
        bidResponse.mediaType = (isVideo ? VIDEO : BANNER);
        emxBidResponses.push(bidResponse);
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
