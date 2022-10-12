import { deepAccess, generateUUID, inIframe } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { createEidsArray } from './userId/eids.js';

const VERSION = '4.3.0';
const BIDDER_CODE = 'sharethrough';
const SUPPLY_ID = 'WYu2BXv1';

const STR_ENDPOINT = `https://btlr.sharethrough.com/universal/v1?supply_id=${SUPPLY_ID}`;

// this allows stubbing of utility function that is used internally by the sharethrough adapter
export const sharethroughInternal = {
  getProtocol,
};

export const sharethroughAdapterSpec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],
  gvlid: 80,
  isBidRequestValid: bid => !!bid.params.pkey && bid.bidder === BIDDER_CODE,

  buildRequests: (bidRequests, bidderRequest) => {
    const timeout = config.getConfig('bidderTimeout');
    const firstPartyData = bidderRequest.ortb2 || {};

    const nonHttp = sharethroughInternal.getProtocol().indexOf('http') < 0;
    const secure = nonHttp || (sharethroughInternal.getProtocol().indexOf('https') > -1);

    const req = {
      id: generateUUID(),
      at: 1,
      cur: ['USD'],
      tmax: timeout,
      site: {
        domain: deepAccess(bidderRequest, 'refererInfo.domain', window.location.hostname),
        page: deepAccess(bidderRequest, 'refererInfo.page', window.location.href),
        ref: deepAccess(bidderRequest, 'refererInfo.ref'),
        ...firstPartyData.site,
      },
      device: {
        ua: navigator.userAgent,
        language: navigator.language,
        js: 1,
        dnt: navigator.doNotTrack === '1' ? 1 : 0,
        h: window.screen.height,
        w: window.screen.width,
      },
      regs: {
        coppa: config.getConfig('coppa') === true ? 1 : 0,
        ext: {},
      },
      source: {
        tid: bidderRequest.auctionId,
        ext: {
          version: '$prebid.version$',
          str: VERSION,
          schain: bidRequests[0].schain,
        },
      },
      bcat: deepAccess(bidderRequest.ortb2, 'bcat') || bidRequests[0].params.bcat || [],
      badv: deepAccess(bidderRequest.ortb2, 'badv') || bidRequests[0].params.badv || [],
      test: 0,
    };

    req.user = nullish(firstPartyData.user, {});
    if (!req.user.ext) req.user.ext = {};
    req.user.ext.eids = createEidsArray(deepAccess(bidRequests[0], 'userId')) || [];

    if (bidderRequest.gdprConsent) {
      const gdprApplies = bidderRequest.gdprConsent.gdprApplies === true;
      req.regs.ext.gdpr = gdprApplies ? 1 : 0;
      if (gdprApplies) {
        req.user.ext.consent = bidderRequest.gdprConsent.consentString;
      }
    }

    if (bidderRequest.uspConsent) {
      req.regs.ext.us_privacy = bidderRequest.uspConsent;
    }

    const imps = bidRequests.map(bidReq => {
      const impression = { ext: {} };

      // mergeDeep(impression, bidReq.ortb2Imp); // leaving this out for now as we may want to leave stuff out on purpose
      const tid = deepAccess(bidReq, 'ortb2Imp.ext.tid');
      if (tid) impression.ext.tid = tid;
      const gpid = deepAccess(bidReq, 'ortb2Imp.ext.gpid', deepAccess(bidReq, 'ortb2Imp.ext.data.pbadslot'));
      if (gpid) impression.ext.gpid = gpid;

      const videoRequest = deepAccess(bidReq, 'mediaTypes.video');

      if (videoRequest) {
        // default playerSize, only change this if we know width and height are properly defined in the request
        let [w, h] = [640, 360];
        if (videoRequest.playerSize && videoRequest.playerSize[0] && videoRequest.playerSize[1]) {
          [w, h] = videoRequest.playerSize;
        }

        impression.video = {
          pos: nullish(videoRequest.pos, 0),
          topframe: inIframe() ? 0 : 1,
          skip: nullish(videoRequest.skip, 0),
          linearity: nullish(videoRequest.linearity, 1),
          minduration: nullish(videoRequest.minduration, 5),
          maxduration: nullish(videoRequest.maxduration, 60),
          playbackmethod: videoRequest.playbackmethod || [2],
          api: getVideoApi(videoRequest),
          mimes: videoRequest.mimes || ['video/mp4'],
          protocols: getVideoProtocols(videoRequest),
          w,
          h,
          startdelay: nullish(videoRequest.startdelay, 0),
          skipmin: nullish(videoRequest.skipmin, 0),
          skipafter: nullish(videoRequest.skipafter, 0),
          placement: videoRequest.context === 'instream' ? 1 : +deepAccess(videoRequest, 'placement', 4),
        };

        if (videoRequest.delivery) impression.video.delivery = videoRequest.delivery;
        if (videoRequest.companiontype) impression.video.companiontype = videoRequest.companiontype;
        if (videoRequest.companionad) impression.video.companionad = videoRequest.companionad;
      } else {
        impression.banner = {
          pos: deepAccess(bidReq, 'mediaTypes.banner.pos', 0),
          topframe: inIframe() ? 0 : 1,
          format: bidReq.sizes.map(size => ({ w: +size[0], h: +size[1] })),
        };
      }

      return {
        id: bidReq.bidId,
        tagid: String(bidReq.params.pkey),
        secure: secure ? 1 : 0,
        bidfloor: getBidRequestFloor(bidReq),
        ...impression,
      };
    }).filter(imp => !!imp);

    return imps.map(impression => {
      return {
        method: 'POST',
        url: STR_ENDPOINT,
        data: {
          ...req,
          imp: [impression],
        },
      };
    });
  },

  interpretResponse: ({ body }, req) => {
    if (!body || !body.seatbid || body.seatbid.length === 0 || !body.seatbid[0].bid || body.seatbid[0].bid.length === 0) {
      return [];
    }

    return body.seatbid[0].bid.map(bid => {
      const response = {
        requestId: bid.impid,
        width: +bid.w,
        height: +bid.h,
        cpm: +bid.price,
        creativeId: bid.crid,
        dealId: bid.dealid || null,
        mediaType: req.data.imp[0].video ? VIDEO : BANNER,
        currency: body.cur || 'USD',
        netRevenue: true,
        ttl: 360,
        ad: bid.adm,
        nurl: bid.nurl,
        meta: {
          advertiserDomains: bid.adomain || [],
        },
      };

      if (response.mediaType === VIDEO) {
        response.ttl = 3600;
        response.vastXml = bid.adm;
      }

      return response;
    });
  },

  getUserSyncs: (syncOptions, serverResponses) => {
    const shouldCookieSync = syncOptions.pixelEnabled && deepAccess(serverResponses, '0.body.cookieSyncUrls') !== undefined;

    return shouldCookieSync
      ? serverResponses[0].body.cookieSyncUrls.map(url => ({ type: 'image', url: url }))
      : [];
  },

  // Empty implementation for prebid core to be able to find it
  onTimeout: (data) => {
  },

  // Empty implementation for prebid core to be able to find it
  onBidWon: (bid) => {
  },

  // Empty implementation for prebid core to be able to find it
  onSetTargeting: (bid) => {
  },
};

function getVideoApi({ api }) {
  let defaultValue = [2];
  if (api && Array.isArray(api) && api.length > 0) {
    return api;
  } else {
    return defaultValue;
  }
}

function getVideoProtocols({ protocols }) {
  let defaultValue = [2, 3, 5, 6, 7, 8];
  if (protocols && Array.isArray(protocols) && protocols.length > 0) {
    return protocols;
  } else {
    return defaultValue;
  }
}

function getBidRequestFloor(bid) {
  let floor = null;
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: bid.mediaTypes && bid.mediaTypes.video ? 'video' : 'banner',
      size: bid.sizes.map(size => ({ w: size[0], h: size[1] })),
    });
    if (typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return floor !== null ? floor : bid.params.floor;
}

function getProtocol() {
  return window.location.protocol;
}

// stub for ?? operator
function nullish(input, def) {
  return input === null || input === undefined ? def : input;
}

registerBidder(sharethroughAdapterSpec);
