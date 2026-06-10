import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { generateUUID, deepAccess, isArray, isFn, logWarn } from '../src/utils.js';

/**
 * TNE Catalyst Bid Adapter
 *
 * Single-bidder adapter for the TNE Catalyst exchange. TNE manages all SSP
 * relationships and demand decisions server-side, so no SSP IDs are required
 * or exposed.
 *
 * All params are optional. With no params at all, the adapter derives slot
 * identity from `adUnitCode` and publisher identity from the page domain
 * (resolved server-side via sellers.json). Publishers can still override:
 *
 *   - `publisherId` — override the server-side domain resolution
 *   - `slot`        — override the default `adUnitCode` slot key
 *   - `bidfloor`    — fallback floor when `getFloor()` is absent
 *   - `endpoint`    — route to an alternate auction endpoint (testing)
 *   - `testMode`    — flag the request as test traffic
 *
 * @see https://thenexusengine.io
 * Maintainer: ops@thenexusengine.io
 */

const BIDDER_CODE = 'tne_catalyst';
const ENDPOINT_URL = 'https://ads.thenexusengine.com/openrtb2/auction';
const SYNC_URL = 'https://ads.thenexusengine.com/cookie_sync';
const GVLID = 1494;

interface TneCatalystBidParams {
  publisherId?: string;
  slot?: string;
  bidfloor?: number;
  endpoint?: string;
  testMode?: boolean;
}

// Permits absent values; rejects supplied values of the wrong type. The
// switch keeps each typeof comparison against a string literal so the
// valid-typeof eslint rule stays satisfied without a directive.
function nullOrType(value: unknown, type: 'string' | 'number' | 'boolean'): boolean {
  if (value == null) return true;
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'boolean': return typeof value === 'boolean';
  }
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
    // All params are optional. When supplied, they must be the right type —
    // otherwise reject so a typo doesn't silently fall back to defaults.
    if (!bid) return false;
    const params = (bid as any).params || {};
    return (
      nullOrType(params.publisherId, 'string') &&
      nullOrType(params.slot, 'string') &&
      nullOrType(params.endpoint, 'string') &&
      nullOrType(params.bidfloor, 'number') &&
      nullOrType(params.testMode, 'boolean')
    );
  },

  buildRequests(validBidRequests, bidderRequest) {
    if (!validBidRequests || validBidRequests.length === 0) {
      return [];
    }

    // Request-level params: endpoint must be batch-level since the request is
    // a single HTTP call. publisherId is also batch-level since `site.publisher`
    // is one-per-request; if different imps in the same auction carry different
    // values we honour the first and log so the discrepancy surfaces. Per-imp
    // params (slot, bidfloor, testMode) are resolved inside the loop below.
    const firstParams = (validBidRequests[0] as any).params || {};
    const publisherId: string | undefined = firstParams.publisherId;
    const endpoint: string = firstParams.endpoint || ENDPOINT_URL;
    if (publisherId != null) {
      for (const b of validBidRequests) {
        const pid = (b as any).params?.publisherId;
        if (pid != null && pid !== publisherId) {
          logWarn(`tne_catalyst: mixed publisherId across imps in one auction (using ${publisherId}, ignoring ${pid})`);
          break;
        }
      }
    }

    const imps = validBidRequests.map((bid: any) => {
      const params = bid.params || {};
      // Slot defaults to the Prebid adUnitCode (div ID). The server uses this
      // as a placement key when no slot override is supplied — same pattern as
      // AMX's `adUnitId` fallback.
      const slot: string = params.slot || bid.adUnitCode;
      const slotExt: any = { slot };
      // testMode is per-imp: individual placements can be flagged as test
      // traffic without affecting siblings in the same auction.
      if (params.testMode === true) slotExt.testMode = true;
      const imp: any = {
        id: bid.bidId,
        // OpenRTB tagid mirrors the slot key, giving the server two places to
        // look without forcing publishers to set anything explicit.
        tagid: slot,
        ext: { tne_catalyst: slotExt }
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
      if (!floorApplied && params.bidfloor) {
        imp.bidfloor = params.bidfloor;
        imp.bidfloorcur = 'USD';
      }

      return imp;
    });

    const ortbRequest: any = {
      id: generateUUID(),
      imp: imps,
    };

    if ((bidderRequest as any).timeout) {
      ortbRequest.tmax = (bidderRequest as any).timeout;
    }

    // ortb2 passthrough — the wrapper's modern source of truth for user
    // identity, compliance, device, site/app context. Per Prebid module rules
    // ("Bidder params should always only override that information coming on
    // the request"), we treat ortb2.* as authoritative and only layer our
    // derived overrides (consent strings synthesized from gdprConsent, etc.)
    // when the wrapper hasn't already populated the same key.
    const ortb2 = deepAccess(bidderRequest, 'ortb2') || {};
    if (ortb2.user) ortbRequest.user = { ...ortb2.user };
    if (ortb2.regs) ortbRequest.regs = { ...ortb2.regs };
    if (ortb2.device) ortbRequest.device = { ...ortb2.device };

    // site OR app, never both — OpenRTB 2.6 §3.2.1 requires these to be
    // mutually exclusive. App context (CTV/in-app) takes precedence when
    // present in ortb2; otherwise build a site object from refererInfo,
    // ortb2.site, and the optional publisher override.
    if (ortb2.app) {
      ortbRequest.app = { ...ortb2.app };
      if (publisherId) {
        ortbRequest.app.publisher = { ...(ortbRequest.app.publisher || {}), id: publisherId };
      }
    } else {
      const site: any = publisherId ? { publisher: { id: publisherId } } : {};
      const ri = deepAccess(bidderRequest, 'refererInfo');
      if (ri) {
        if (ri.page) site.page = ri.page;
        if (ri.domain) site.domain = ri.domain;
        if (ri.ref) site.ref = ri.ref;
      }
      const ortb2Site = ortb2.site;
      if (ortb2Site) {
        Object.assign(site, ortb2Site);
        if (publisherId) site.publisher = { id: publisherId };
      }
      if (Object.keys(site).length > 0) {
        ortbRequest.site = site;
      }
    }

    const gdpr = deepAccess(bidderRequest, 'gdprConsent');
    const usp = deepAccess(bidderRequest, 'uspConsent');
    const gpp = deepAccess(bidderRequest, 'gppConsent');

    // regs.* — only set fields the wrapper didn't already supply via ortb2.
    if (gdpr || usp || (gpp && gpp.gppString)) {
      ortbRequest.regs = ortbRequest.regs || {};
      if (gpp && gpp.gppString) {
        if (ortbRequest.regs.gpp == null) ortbRequest.regs.gpp = gpp.gppString;
        if (ortbRequest.regs.gpp_sid == null) ortbRequest.regs.gpp_sid = gpp.applicableSections || [];
      }
      if (gdpr || usp) {
        const regsExt = { ...(ortbRequest.regs.ext || {}) };
        if (gdpr && regsExt.gdpr == null) regsExt.gdpr = gdpr.gdprApplies ? 1 : 0;
        if (usp && regsExt.us_privacy == null) regsExt.us_privacy = usp;
        ortbRequest.regs.ext = regsExt;
      }
    }

    // user.eids — merge the legacy bid.userIdAsEids list with whatever the
    // wrapper already put on ortb2.user.eids. De-duplicate by source so a
    // legacy provider doesn't show up twice.
    const legacyEids = deepAccess(validBidRequests[0], 'userIdAsEids');
    if (isArray(legacyEids) && legacyEids.length > 0) {
      ortbRequest.user = ortbRequest.user || {};
      const existing: any[] = isArray(ortbRequest.user.eids) ? ortbRequest.user.eids : [];
      const seen = new Set(existing.map((e: any) => e && e.source).filter(Boolean));
      const merged = existing.concat(legacyEids.filter((e: any) => e && e.source && !seen.has(e.source)));
      ortbRequest.user.eids = merged;
    }

    // user.ext.consent — synthesize from gdprConsent only when ortb2 didn't
    // already carry one.
    if (gdpr && gdpr.consentString) {
      ortbRequest.user = ortbRequest.user || {};
      ortbRequest.user.ext = { ...(ortbRequest.user.ext || {}) };
      if (ortbRequest.user.ext.consent == null) {
        ortbRequest.user.ext.consent = gdpr.consentString;
      }
    }

    // schain — prefer the ortb2-normalized location (Prebid 9.x writes here
    // via the schain core module + schain RTD providers); fall back to the
    // legacy bid.schain shape for older wrapper builds. The outbound goes on
    // source.schain (OpenRTB 2.6 top-level), which modern adapters consume
    // without ext-fishing.
    const schain =
      deepAccess(bidderRequest, 'ortb2.source.ext.schain') ||
      deepAccess(bidderRequest, 'ortb2.source.schain') ||
      deepAccess(validBidRequests[0], 'schain');
    if (schain) {
      ortbRequest.source = { ...(ortbRequest.source || {}), schain };
    }

    return [{
      method: 'POST',
      url: endpoint,
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
