import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { generateUUID, deepAccess, isArray, isFn } from '../src/utils.js';

/**
 * TNE Catalyst Bid Adapter
 *
 * Single-bidder adapter for the TNE Catalyst exchange. Publishers configure
 * one bidder with { publisherId, slot }; TNE handles all SSP relationships
 * and demand decisions server-side. No SSP IDs are required or exposed.
 *
 * @see https://thenexusengine.io
 * Maintainer: ops@thenexusengine.io
 */

const BIDDER_CODE = 'tne_catalyst';
const ENDPOINT_URL = 'https://ads.thenexusengine.com/openrtb2/auction';
const SYNC_URL = 'https://ads.thenexusengine.com/cookie_sync';
const GVLID = 1494;

interface TneCatalystBidParams {
  publisherId: string;
  slot: string;
  bidfloor?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: TneCatalystBidParams;
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  isBidRequestValid(bid) {
    const params = bid && (bid as any).params;
    return !!(
      params &&
      typeof params.publisherId === 'string' && params.publisherId !== '' &&
      typeof params.slot === 'string' && params.slot !== ''
    );
  },

  buildRequests(validBidRequests, bidderRequest) {
    if (!validBidRequests || validBidRequests.length === 0) {
      return [];
    }

    const publisherId = (validBidRequests[0] as any).params.publisherId;

    const imps = validBidRequests.map((bid: any) => {
      const imp: any = {
        id: bid.bidId,
        ext: { tne_catalyst: { slot: bid.params.slot } }
      };

      const mediaTypes = bid.mediaTypes || {};

      if (mediaTypes[BANNER]) {
        const banner = mediaTypes[BANNER];
        const sizes = banner.sizes || [];
        imp.banner = {
          format: sizes.map((s: [number, number]) => ({ w: s[0], h: s[1] })),
          w: sizes.length > 0 ? sizes[0][0] : undefined,
          h: sizes.length > 0 ? sizes[0][1] : undefined,
        };
      }

      if (mediaTypes[VIDEO]) {
        const video = mediaTypes[VIDEO];
        const playerSize = video.playerSize;
        const videoSize = playerSize ? (isArray(playerSize[0]) ? playerSize[0] : playerSize) : null;
        imp.video = {
          mimes: video.mimes || ['video/mp4'],
          protocols: video.protocols || [2, 3, 5, 6],
          w: videoSize ? videoSize[0] : undefined,
          h: videoSize ? videoSize[1] : undefined,
          minduration: video.minduration,
          maxduration: video.maxduration,
          startdelay: video.startdelay,
          placement: video.placement,
          linearity: video.linearity,
        };
        Object.keys(imp.video).forEach(k => imp.video[k] === undefined && delete imp.video[k]);
      }

      if (mediaTypes[NATIVE]) {
        imp.native = { request: JSON.stringify(mediaTypes[NATIVE]) };
      }

      let floorApplied = false;
      if (isFn(bid.getFloor)) {
        const mediaType = imp.video ? VIDEO : imp.native ? NATIVE : BANNER;
        const floorInfo = bid.getFloor({ currency: 'USD', mediaType, size: '*' });
        if (floorInfo && floorInfo.currency === 'USD' && floorInfo.floor > 0) {
          imp.bidfloor = floorInfo.floor;
          imp.bidfloorcur = 'USD';
          floorApplied = true;
        }
      }
      if (!floorApplied && bid.params.bidfloor) {
        imp.bidfloor = bid.params.bidfloor;
        imp.bidfloorcur = 'USD';
      }

      return imp;
    });

    const site: any = { publisher: { id: publisherId } };
    const ri = deepAccess(bidderRequest, 'refererInfo');
    if (ri) {
      if (ri.page) site.page = ri.page;
      if (ri.domain) site.domain = ri.domain;
      if (ri.ref) site.ref = ri.ref;
    }

    const ortb2Site = deepAccess(bidderRequest, 'ortb2.site');
    if (ortb2Site) {
      Object.assign(site, ortb2Site);
      site.publisher = { id: publisherId };
    }

    const ortbRequest: any = {
      id: generateUUID(),
      imp: imps,
      site,
    };

    if ((bidderRequest as any).timeout) {
      ortbRequest.tmax = (bidderRequest as any).timeout;
    }

    const regsExt: any = {};
    const gdpr = deepAccess(bidderRequest, 'gdprConsent');
    if (gdpr) {
      regsExt.gdpr = gdpr.gdprApplies ? 1 : 0;
    }
    const usp = deepAccess(bidderRequest, 'uspConsent');
    if (usp) {
      regsExt.us_privacy = usp;
    }
    const gpp = deepAccess(bidderRequest, 'gppConsent');
    if (gpp && gpp.gppString) {
      ortbRequest.regs = ortbRequest.regs || {};
      ortbRequest.regs.gpp = gpp.gppString;
      ortbRequest.regs.gpp_sid = gpp.applicableSections || [];
    }
    if (Object.keys(regsExt).length > 0) {
      ortbRequest.regs = ortbRequest.regs || {};
      ortbRequest.regs.ext = regsExt;
    }

    const userExt: any = {};
    if (gdpr && gdpr.consentString) {
      userExt.consent = gdpr.consentString;
    }
    const eids = deepAccess(validBidRequests[0], 'userIdAsEids');
    if (isArray(eids) && eids.length > 0) {
      ortbRequest.user = ortbRequest.user || {};
      ortbRequest.user.eids = eids;
    }
    if (Object.keys(userExt).length > 0) {
      ortbRequest.user = ortbRequest.user || {};
      ortbRequest.user.ext = userExt;
    }

    const schain = deepAccess(validBidRequests[0], 'schain');
    if (schain) {
      ortbRequest.source = { schain };
    }

    return [{
      method: 'POST',
      url: ENDPOINT_URL,
      data: ortbRequest,
      // text/plain avoids the CORS preflight that application/json would
      // trigger, keeping auction latency down.
      options: { contentType: 'text/plain', withCredentials: true }
    }];
  },

  interpretResponse(serverResponse, request) {
    const body = deepAccess(serverResponse, 'body');
    if (!body || !isArray(body.seatbid) || body.seatbid.length === 0) {
      return [];
    }

    const bids: any[] = [];

    body.seatbid.forEach((seatBid: any) => {
      (seatBid.bid || []).forEach((bid: any) => {
        if (!bid.price || bid.price <= 0) return;

        const prebidBid: any = {
          requestId: bid.impid,
          cpm: bid.price,
          currency: body.cur || 'USD',
          width: bid.w || 0,
          height: bid.h || 0,
          ad: bid.adm || '',
          creativeId: bid.crid || bid.id,
          dealId: bid.dealid || '',
          netRevenue: true,
          ttl: 300,
          meta: {
            advertiserDomains: isArray(bid.adomain) ? bid.adomain : [],
          },
        };

        if (bid.adm && bid.adm.startsWith('{')) {
          prebidBid.mediaType = NATIVE;
          try {
            prebidBid.native = JSON.parse(bid.adm);
          } catch (_) {
            prebidBid.ad = bid.adm;
            prebidBid.mediaType = BANNER;
          }
        } else if (bid.adm && (bid.adm.trim().startsWith('<VAST') || bid.adm.trim().startsWith('<?xml'))) {
          prebidBid.mediaType = VIDEO;
          prebidBid.vastXml = bid.adm;
          prebidBid.ad = bid.adm;
        } else if (bid.adUrl) {
          prebidBid.mediaType = VIDEO;
          prebidBid.vastUrl = bid.adUrl;
        } else {
          prebidBid.mediaType = BANNER;
        }

        bids.push(prebidBid);
      });
    });

    return bids;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return [];
    }

    const params: string[] = [];
    if (gdprConsent) {
      params.push(`gdpr=${(gdprConsent as any).gdprApplies ? 1 : 0}`);
      if ((gdprConsent as any).consentString) {
        params.push(`gdpr_consent=${encodeURIComponent((gdprConsent as any).consentString)}`);
      }
    }
    if (uspConsent) {
      params.push(`us_privacy=${encodeURIComponent(uspConsent as any)}`);
    }

    const syncUrl = SYNC_URL + (params.length > 0 ? '?' + params.join('&') : '');

    if (syncOptions.iframeEnabled) {
      return [{ type: 'iframe', url: syncUrl }];
    }
    return [{ type: 'image', url: syncUrl }];
  },
};

registerBidder(spec);
