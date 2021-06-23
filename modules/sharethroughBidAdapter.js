import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';

const VERSION = '4.0.0';
const BIDDER_CODE = 'sharethrough';
const SUPPLY_ID = 'WYu2BXv1';

// Todo: Update URL to new open RTB endpoint
const STR_ENDPOINT = 'https://btlr.sharethrough.com/WYu2BXv1/v1';

// this allows stubbing of utility function that is used internally by the sharethrough adapter
export const sharethroughInternal = {
  getProtocol
};

export const sharethroughAdapterSpec = {
  code: BIDDER_CODE,

  isBidRequestValid: bid => !!bid.params.pkey && bid.bidder === BIDDER_CODE,

  buildRequests: (bidRequests, bidderRequest) => {
    const timeout = config.getConfig('bidderTimeout');

    const nonHttp = sharethroughInternal.getProtocol().indexOf('http') < 0;
    const secure = nonHttp || (sharethroughInternal.getProtocol().indexOf('https') > -1);

    const req = {
      id: utils.generateUUID(),
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
            { attr: 'userId.id5id.uid', source: 'id5-sync.com' },
            { attr: 'userId.pubcid', source: 'pubcid.org' },
            { attr: 'userId.tdid', source: 'adserver.org' },
            { attr: 'userId.criteoId', source: 'criteo.com' },
            { attr: 'userId.britepoolid', source: 'britepool.com' },
            { attr: 'userId.lipb.lipbid', source: 'liveintent.com' },
            { attr: 'userId.intentiqid', source: 'intentiq.com' },
            { attr: 'userId.lotamePanoramaId', source: 'lotame.com' },
            { attr: 'userId.parrableId', source: 'parrable.com' },
            { attr: 'userId.netId', source: 'netid.de' },
            { attr: 'userId.sharedid', source: 'sharedid.org' },
          ])
        }
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
          schain: bidRequests[0].schain
        }
      },
      bcat: bidRequests[0].params.bcat || [],
      badv: bidRequests[0].params.badv || [],
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
          skip: bidReq.mediaTypes.video.skip || 0,
          linearity: bidReq.mediaTypes.video.linearity || 1,
          minduration: bidReq.mediaTypes.video.minduration || 5,
          maxduration: bidReq.mediaTypes.video.maxduration || 60,
          playbackmethod: bidReq.mediaTypes.video.playbackmethod || [2],
          api: getVideoApi(bidReq.mediaTypes.video),
          mimes: bidReq.mediaTypes.video.mimes || ['video/mp4'],
          protocols: getVideoProtocols(bidReq.mediaTypes.video),
          h: bidReq.mediaTypes.video.playerSize[0][1],
          w: bidReq.mediaTypes.video.playerSize[0][0]
        }
      } else {
        impression.banner = {
          topframe: utils.inIframe() ? 0 : 1,
          format: bidReq.sizes.map(size => ({ w: +size[0], h: +size[1] }))
        };
      }

      return {
        id: bidReq.bidId,
        tagid: String(bidReq.params.pkey),
        secure: secure ? 1 : 0,
        bidfloor: getFloor(bidReq),
        ...impression
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
        imp: imps
      },
      bidderRequest
    };
  },

  interpretResponse: ({ body }, req) => {
    if (!body || !body.seatbid || body.seatbid.length === 0 || !body.seatbid[0].bid || body.seatbid[0].bid.length === 0) {
      return [];
    }

    return body.seatbid[0].bid.map(bid => ({
      requestId: bid.impid,
      width: +bid.w,
      height: +bid.h,
      cpm: +bid.price,
      creativeId: bid.crid,
      dealId: bid.dealid || null,
      currency: 'USD',
      netRevenue: true,
      ttl: 360,
      ad: bid.adm,
      meta: {
        advertiserDomains: bid.adomain || []
      },
    }));
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
  onTimeout: (data) => {},

  // Empty implementation for prebid core to be able to find it
  onBidWon: (bid) => {},

  // Empty implementation for prebid core to be able to find it
  onSetTargeting: (bid) => {}
};

function getVideoApi({ api }) {
  let defaultValue = [2];
  if (api && Array.isArray(api) && api.length > 0) {
    return api
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
      mediaType: bid.mediaTypes.video ? 'video' : 'banner',
      size: bid.sizes.map(size => ({ w: size[0], h: size[1] }))
    });
    if (typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return floor !== null ? floor : bid.params.floor;
}


function handleUniversalIds(bidRequest, uids) {
  return uids.map((uid) => ({
    source: uid.source,
    uids: [{ id: utils.deepAccess(bidRequest, uid.attr), atype: 1 }]
  }))
}

function getProtocol() {
  return document.location.protocol;
}

registerBidder(sharethroughAdapterSpec);
