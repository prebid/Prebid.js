import {config} from '../src/config.js';
import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getGlobal} from '../src/prebidGlobal.js';

const VIDEO_TARGETING = ['startdelay', 'mimes', 'minduration', 'maxduration', 'delivery',
  'startdelay', 'skip', 'playbackmethod', 'api', 'protocol', 'boxingallowed', 'maxextended',
  'linearity', 'delivery', 'protocols', 'placement', 'minbitrate', 'maxbitrate', 'battr', 'ext'];
const BIDDER_CODE = 'nexx360';
const REQUEST_URL = 'https://fast.nexx360.io/booster';

const PAGE_VIEW_ID = utils.generateUUID();

const BIDDER_VERSION = '1.0';

const GVLID = 965;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [
    { code: 'revenuemaker' },
    { code: 'first-id', gvlid: 1178 },
    { code: 'adwebone' },
    { code: 'league-m', gvlid: 965 }
  ],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);

/**
         * Determines whether or not the given bid request is valid.
         *
         * @param {BidRequest} bid The bid params to validate.
         * @return boolean True if this is a valid bid, and false otherwise.
         */
function isBidRequestValid(bid) {
  return !!bid.params.tagId || !!bid.params.videoTagId;
};

/**
         * Make a server request from the list of BidRequests.
         *
         * @param {validBidRequests[]} - an array of bids
         * @return ServerRequest Info describing the request to the server.
         */

function buildRequests(bids, bidderRequest) {
  const data = getBaseRequest(bids[0], bidderRequest);
  bids.forEach((bid) => {
    const impObject = createImpObject(bid);
    if (isBannerBid(bid)) impObject.banner = getBannerObject(bid);
    if (isVideoBid(bid)) impObject.video = getVideoObject(bid);
    data.imp.push(impObject);
  });
  return {
    method: 'POST',
    url: REQUEST_URL,
    data,
  }
}

function createImpObject(bid) {
  const floor = getFloor(bid, BANNER);
  const imp = {
    id: bid.bidId,
    tagid: bid.adUnitCode,
    ext: {
      divId: bid.adUnitCode,
      nexx360: {
        videoTagId: bid.params.videoTagId,
        tagId: bid.params.tagId,
        allBids: bid.params.allBids === true,
      }
    }
  };
  enrichImp(imp, bid, floor);
  return imp;
}

function getBannerObject(bid) {
  return {
    format: toFormat(bid.mediaTypes.banner.sizes),
    topframe: utils.inIframe() ? 0 : 1
  };
}

function getVideoObject(bid) {
  let width, height;
  const videoParams = utils.deepAccess(bid, `mediaTypes.video`);
  const playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
  const context = utils.deepAccess(bid, 'mediaTypes.video.context');
  // normalize config for video size
  if (utils.isArray(bid.sizes) && bid.sizes.length === 2 && !utils.isArray(bid.sizes[0])) {
    width = parseInt(bid.sizes[0], 10);
    height = parseInt(bid.sizes[1], 10);
  } else if (utils.isArray(bid.sizes) && utils.isArray(bid.sizes[0]) && bid.sizes[0].length === 2) {
    width = parseInt(bid.sizes[0][0], 10);
    height = parseInt(bid.sizes[0][1], 10);
  } else if (utils.isArray(playerSize) && playerSize.length === 2) {
    width = parseInt(playerSize[0], 10);
    height = parseInt(playerSize[1], 10);
  }
  const video = {
    playerSize: [height, width],
    context,
  };

  Object.keys(videoParams)
    .filter(param => VIDEO_TARGETING.includes(param))
    .forEach(param => video[param] = videoParams[param]);
  return video;
}

function isVideoBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return utils.deepAccess(bid, 'mediaTypes.banner') || !isVideoBid(bid);
}

function toFormat(sizes) {
  return sizes.map((s) => {
    return { w: s[0], h: s[1] };
  });
}

function getFloor(bid, mediaType) {
  let floor = 0;
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: mediaType,
      size: '*'
    });

    if (typeof floorInfo === 'object' &&
      floorInfo.currency === 'USD' &&
      !isNaN(parseFloat(floorInfo.floor))) {
      floor = Math.max(floor, parseFloat(floorInfo.floor));
    }
  }

  return floor;
}

function enrichImp(imp, bid, floor) {
  if (floor > 0) {
    imp.bidfloor = floor;
    imp.bidfloorcur = 'USD';
  } else if (bid.params.customFloor) {
    imp.bidfloor = bid.params.customFloor;
  }
  if (bid.ortb2Imp && bid.ortb2Imp.ext && bid.ortb2Imp.ext.data) {
    imp.ext.data = bid.ortb2Imp.ext.data;
  }
}

function getBaseRequest(bid, bidderRequest) {
  let req = {
    id: bidderRequest.auctionId,
    imp: [],
    cur: [config.getConfig('currency.adServerCurrency') || 'USD'],
    at: 1,
    tmax: config.getConfig('bidderTimeout'),
    site: {
      page: bidderRequest.refererInfo.topmostLocation || bidderRequest.refererInfo.page,
      domain: bidderRequest.refererInfo.domain,
    },
    regs: {
      coppa: (config.getConfig('coppa') === true || bid.params.coppa) ? 1 : 0,
    },
    device: {
      dnt: (utils.getDNT() || bid.params.doNotTrack) ? 1 : 0,
      h: screen.height,
      w: screen.width,
      ua: window.navigator.userAgent,
      language: window.navigator.language.split('-').shift()
    },
    user: {},
    ext: {
      source: 'prebid.js',
      version: '$prebid.version$',
      pageViewId: PAGE_VIEW_ID,
      bidderVersion: BIDDER_VERSION,
    }
  };

  if (bid.params.platform) {
    utils.deepSetValue(req, 'ext.platform', bid.params.platform);
  }
  if (bid.params.response_template_name) {
    utils.deepSetValue(req, 'ext.response_template_name', bid.params.response_template_name);
  }
  req.test = config.getConfig('debug') ? 1 : 0;
  if (bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      utils.deepSetValue(req, 'regs.ext.gdpr', bidderRequest.gdprConsent.gdprApplies === true ? 1 : 0);
    }
    if (bidderRequest.gdprConsent.consentString !== undefined) {
      utils.deepSetValue(req, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    }
    if (bidderRequest.gdprConsent.addtlConsent !== undefined) {
      utils.deepSetValue(req, 'user.ext.ConsentedProvidersSettings.consented_providers', bidderRequest.gdprConsent.addtlConsent);
    }
  }
  if (bidderRequest.uspConsent) {
    utils.deepSetValue(req, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }
  if (bid.schain) {
    utils.deepSetValue(req, 'source.ext.schain', bid.schain);
  }
  if (bid.userIdAsEids) {
    utils.deepSetValue(req, 'user.ext.eids', bid.userIdAsEids);
  }
  const commonFpd = bidderRequest.ortb2 || {};
  if (commonFpd.site) {
    utils.mergeDeep(req, {site: commonFpd.site});
  }
  if (commonFpd.user) {
    utils.mergeDeep(req, {user: commonFpd.user});
  }
  return req;
}

/**
         * Unpack the response from the server into a list of bids.
         *
         * @param {ServerResponse} serverResponse A successful response from the server.
         * @return {Bid[]} An array of bids which were nested inside the server.
         */
function interpretResponse(response, req) {
  const { bidderSettings } = getGlobal();
  const allowAlternateBidderCodes = bidderSettings && bidderSettings.standard ? bidderSettings.standard.allowAlternateBidderCodes : false;
  const respBody = response.body;
  if (!respBody || !Array.isArray(respBody.seatbid)) {
    return [];
  }

  let bids = [];
  respBody.seatbid.forEach(seatbid => {
    const ssp = seatbid.seat;
    bids = [...bids, ...seatbid.bid.map(bid => {
      const response = {
        requestId: bid.impid,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        dealId: bid.dealid,
        currency: respBody.cur || 'USD',
        netRevenue: true,
        ttl: 120,
        mediaType: bid.type === 'banner' ? 'banner' : 'video',
        meta: {
          advertiserDomains: bid.adomain,
          demandSource: ssp,
        },
      };
      if (allowAlternateBidderCodes) response.bidderCode = `n360-${bid.ssp}`;

      if (response.mediaType === 'banner') {
        response.adUrl = bid.adUrl;
      }

      if (['instream', 'outstream'].includes(bid.type)) response.vastXml = bid.vastXml;

      if (bid.ext) {
        response.meta.networkId = bid.ext.dsp_id;
        response.meta.advertiserId = bid.ext.buyer_id;
        response.meta.brandId = bid.ext.brand_id;
      }
      return response;
    })];
  });
  return bids;
}

/**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  if (typeof serverResponses === 'object' && serverResponses != null && serverResponses.length > 0 && serverResponses[0].hasOwnProperty('body') &&
        serverResponses[0].body.hasOwnProperty('cookies') && typeof serverResponses[0].body.cookies === 'object') {
    return serverResponses[0].body.cookies.slice(0, 5);
  } else {
    return [];
  }
};
