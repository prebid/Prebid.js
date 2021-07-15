import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes';

const VERSION = '4.0.0';
const BIDDER_CODE = 'sharethrough';
const SUPPLY_ID = 'WYu2BXv1';

// Todo: Update URL to new open RTB endpoint
const STR_ENDPOINT = `http://localhost:3030/universal/v1?supplyId=${SUPPLY_ID}`;

// this allows stubbing of utility function that is used internally by the sharethrough adapter
export const sharethroughInternal = {
  getProtocol,
};

export const sharethroughAdapterSpec = {
  code: BIDDER_CODE,
  supportedFormat: [BANNER, VIDEO],
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: bid => !!bid.params.pkey && bid.bidder === BIDDER_CODE,

  buildRequests: (bidRequests, bidderRequest) => {
    const timeout = config.getConfig('bidderTimeout');

    const nonHttp = sharethroughInternal.getProtocol().indexOf('http') < 0;
    const secure = nonHttp || (sharethroughInternal.getProtocol().indexOf('https') > -1);

    const req = {
      id: utils.generateUUID(),
      at: 1,
      cur: ['USD'],
      tmax: timeout,
      site: {
        domain: window.location.hostname,
        page: window.location.href,
        ref: bidderRequest.refererInfo ? bidderRequest.refererInfo.referer || null : null,
      },
      user: {
        ext: {
          eids: handleUniversalIds(bidRequests[0], [
            { attr: 'userId.idl_env', source: 'liveramp.com' },
            { attr: 'userId.id5id.uid', source: 'id5-sync.com', ext: utils.deepAccess(bidRequests[0], 'userId.id5id.ext') },
            { attr: 'userId.pubcid', source: 'pubcid.org' },
            { attr: 'userId.tdid', source: 'adserver.org' },
            { attr: 'userId.criteoId', source: 'criteo.com' },
            { attr: 'userId.britepoolid', source: 'britepool.com' },
            { attr: 'userId.lipb.lipbid', source: 'liveintent.com' },
            { attr: 'userId.intentiqid', source: 'intentiq.com' },
            { attr: 'userId.lotamePanoramaId', source: 'crwdcntrl.net' },
            { attr: 'userId.parrableId.eid', source: 'parrable.com' },
            { attr: 'userId.netId', source: 'netid.de' },
            { attr: 'userId.sharedid.id', source: 'sharedid.org' },
          ]),
        },
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
        ext: {
          id: SUPPLY_ID,
          version: '$prebid.version$',
          str: VERSION,
          schain: bidRequests[0].schain,
        },
      },
      bcat: bidRequests[0].params.bcat || [],
      badv: bidRequests[0].params.badv || [],
      test: 0,
    };

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
      const impression = {};

      const gpid = utils.deepAccess(bidReq, 'ortb2Imp.ext.data.pbadslot');
      if (gpid) {
        impression.ext = { gpid: gpid };
      }

      if (bidReq.mediaTypes && bidReq.mediaTypes.video) {
        impression.video = {
          topframe: utils.inIframe() ? 0 : 1,
          skip: bidReq.mediaTypes.video.skip ?? 0,
          linearity: bidReq.mediaTypes.video.linearity ?? 1,
          minduration: bidReq.mediaTypes.video.minduration ?? 5,
          maxduration: bidReq.mediaTypes.video.maxduration ?? 60,
          playbackmethod: bidReq.mediaTypes.video.playbackmethod || [2],
          api: getVideoApi(bidReq.mediaTypes.video),
          mimes: bidReq.mediaTypes.video.mimes || ['video/mp4'],
          protocols: getVideoProtocols(bidReq.mediaTypes.video),
          w: bidReq.mediaTypes.video.playerSize[0][0],
          h: bidReq.mediaTypes.video.playerSize[0][1],
        };
      } else {
        impression.banner = {
          pos: 0,
          topframe: utils.inIframe() ? 0 : 1,
          format: bidReq.sizes.map(size => ({ w: +size[0], h: +size[1] })),
        };
      }

      return {
        id: bidReq.bidId,
        tagid: String(bidReq.params.pkey),
        secure: secure ? 1 : 0,
        bidfloor: getFloor(bidReq),
        ...impression,
      };
    });

    return {
      method: 'POST',
      url: STR_ENDPOINT,
      options: {
        contentType: 'application/json',
        withCredentials: false,
        crossOrigin: true,
      },
      data: {
        ...req,
        imp: imps,
      },
      bidRequests,
      bidderRequest,
    };
  },

  interpretResponse: ({ body }, req) => {
    if (!body || !body.seatbid || body.seatbid.length === 0 || !body.seatbid[0].bid || body.seatbid[0].bid.length === 0) {
      return [];
    }

    return body.seatbid[0].bid.map(bid => {
      const request = matchRequest(bid.id, req);

      const response = {
        requestId: bid.impid,
        width: +bid.w,
        height: +bid.h,
        cpm: +bid.price,
        creativeId: bid.crid,
        dealId: bid.dealid || null,
        mediaType: request.mediaTypes && request.mediaTypes.video ? VIDEO : BANNER,
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

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    const syncParams = uspConsent ? `&us_privacy=${uspConsent}` : '';
    const syncs = [];
    const shouldCookieSync = syncOptions.pixelEnabled &&
      serverResponses.length > 0 &&
      serverResponses[0].body &&
      serverResponses[0].body.cookieSyncUrls;

    if (shouldCookieSync) {
      serverResponses[0].body.cookieSyncUrls.forEach(url => {
        syncs.push({ type: 'image', url: url + syncParams });
      });
    }

    return syncs;
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

function getFloor(bid) {
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


function handleUniversalIds(bidRequest, eids) {
  return eids
    .map((eid) => {
      const id = utils.deepAccess(bidRequest, eid.attr);
      if (!id) return null;

      const uid = { id: id, atype: 1 };
      if (eid.ext) uid.ext = eid.ext;

      return { source: eid.source, uids: [uid] };
    })
    .filter(eid => eid !== null);
}

function getProtocol() {
  return window.location.protocol;
}

function matchRequest(id, request) {
  return request.bidRequests.find(bid => bid.bidId === id);
}

registerBidder(sharethroughAdapterSpec);
