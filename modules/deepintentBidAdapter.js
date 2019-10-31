import {registerBidder} from '../src/adapters/bidderFactory';
import {BANNER} from '../src/mediaTypes';
import * as utils from '../src/utils';
const BIDDER_CODE = 'deepintent';
const BIDDER_ENDPOINT = 'https://prebid.deepintent.com/prebid';
const USER_SYNC_URL = 'https://beacon.deepintent.com/usersync.html';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  aliases: [],

  // tagId is mandatory param
  isBidRequestValid: bid => {
    let valid = false;
    if (bid && bid.params && bid.params.tagId) {
      if (typeof bid.params.tagId === 'string' || bid.params.tagId instanceof String) {
        valid = true;
      }
    }
    return valid;
  },
  interpretResponse: function(bidResponse, request) {
    let responses = [];
    if (bidResponse && bidResponse.body) {
      let bids = bidResponse.body.seatbid && bidResponse.body.seatbid[0] ? bidResponse.body.seatbid[0].bid : [];
      responses = bids.map(bid => formatResponse(bid))
    }
    return responses;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const openRtbBidRequest = {
      id: utils.generateUUID(),
      at: 1,
      imp: validBidRequests.map(bid => buildImpression(bid)),
      site: buildSite(bidderRequest),
      device: buildDevice(),
      source: {
        fd: 0,
        ext: {
          type: 2
        }
      }
    };

    return {
      method: 'POST',
      url: BIDDER_ENDPOINT,
      data: JSON.stringify(openRtbBidRequest),
      options: {
        contentType: 'application/json'
      }
    };
  },
  /**
   * Register User Sync.
   */
  getUserSyncs: syncOptions => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USER_SYNC_URL
      }];
    }
  }

};

function formatResponse(bid) {
  return {
    requestId: bid && bid.id ? bid.id : undefined,
    cpm: bid && bid.price ? bid.price : 0.0,
    width: bid && bid.w ? bid.w : 0,
    height: bid && bid.h ? bid.h : 0,
    ad: bid && bid.adm ? bid.adm : '',
    creativeId: bid && bid.crid ? bid.crid : undefined,
    netRevenue: false,
    currency: bid && bid.cur ? bid.cur : 'USD',
    ttl: 300,
    dealId: bid && bid.dealId ? bid.dealId : undefined
  }
}

function buildImpression(bid) {
  return {
    id: bid.bidId,
    tagid: bid.params.tagId || '',
    secure: window.location.protocol === 'https' ? 1 : 0,
    banner: buildBanner(bid),
    ext: bid.params.custom ? bid.params.custom : {}
  };
}

function buildBanner(bid) {
  if (utils.deepAccess(bid, 'mediaTypes.banner')) {
    // Get Sizes from MediaTypes Object, Will always take first size, will be overrided by params for exact w,h
    if (utils.deepAccess(bid, 'mediaTypes.banner.sizes') && !bid.params.height && !bid.params.width) {
      let sizes = utils.deepAccess(bid, 'mediaTypes.banner.sizes');
      if (utils.isArray(sizes) && sizes.length > 0) {
        return {
          h: sizes[0][0],
          w: sizes[0][1]
        }
      }
    } else {
      return {
        h: bid.params.height,
        w: bid.params.width
      }
    }
  }
}

function buildSite(bidderRequest) {
  let site = {};
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
    site.page = bidderRequest.refererInfo.referer;
    site.domain = getDomain(bidderRequest.refererInfo.referer);
  }
  return site;
}

function getDomain(referer) {
  if (referer) {
    let domainA = document.createElement('a');
    domainA.href = referer;
    return domainA.hostname;
  }
}

function buildDevice() {
  return {
    ua: navigator.userAgent,
    js: 1,
    dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack === '1') ? 1 : 0,
    h: screen.height,
    w: screen.width,
    language: navigator.language
  }
}

registerBidder(spec);
