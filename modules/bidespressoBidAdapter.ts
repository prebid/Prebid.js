import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getUserSyncParams } from '../libraries/userSyncUtils/userSyncUtils.js';
import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, formatQS, logWarn } from '../src/utils.js';

export interface BidEspressoBidParams {
  /**
   * Bid Espresso publisher ID, assigned during onboarding. Routes the auction
   * to the publisher's configuration on the Bid Espresso gateway (`?pub=`).
   */
  publisherId: string;
  /**
   * Inventory segment ID, always assigned by Bid Espresso during onboarding —
   * single-placement integrations receive their default segment ID (`?inv=`).
   */
  inventoryId: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: BidEspressoBidParams;
  }
}

const BIDDER_CODE = 'bidespresso';
const ENDPOINT_URL = 'https://auction.bidespresso.com/openrtb2/auction';
const SYNC_URL = 'https://auction.bidespresso.com/usync';
const DEFAULT_TTL = 300;
// Video creatives sit in caches (Prebid Cache / the ad server) far longer than
// banners; a per-bid `exp` from the gateway still takes precedence.
const VIDEO_TTL = 900;
const DEFAULT_CURRENCY = 'USD';

export const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true, // the gateway's margin is already applied; bids are net to the publisher
    ttl: DEFAULT_TTL,
    // The gateway's upstream partners answer in an oRTB 2.4-era dialect with no
    // response `cur`, so the currency is pinned here.
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // A mixed ad unit sends BOTH media objects on one imp — the gateway
    // auctions each media class separately server-side and stamps `mtype` on
    // every bid. Only a malformed video half is dropped (the banner side can
    // still bid), and the drop is never silent.
    if (imp.banner && imp.video) {
      const video = (bidRequest.mediaTypes as Record<string, unknown> | undefined)?.video as Record<string, unknown> | undefined;
      // ortb2Imp can inject imp.video with no mediaTypes declaration to
      // validate against — treat that like a malformed half and keep banner.
      if (!video || !isValidVideoDeclaration(video, bidRequest.bidId)) {
        logWarn(`bidespresso: ad unit "${bidRequest.adUnitCode}" has a malformed video declaration; sending banner only`);
        delete imp.video;
      }
    }
    // The gateway's zone map and per-imp analytics key on tagid.
    imp.tagid ||= bidRequest.adUnitCode;
    // The segment id rides on every imp so imps stay self-describing when
    // requests are split per segment, logged, or debugged individually.
    deepSetValue(imp, 'ext.inventoryId', bidRequest.params.inventoryId);
    // Provenance fields some DSPs read; `||=` so publisher ortb2Imp wins.
    imp.displaymanager ||= 'Prebid.js';
    imp.displaymanagerver ||= '$prebid.version$';
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    // The gateway reads consent at its OpenRTB 2.5 locations (regs.ext.*).
    // Prebid core deliberately consolidates gpp/gpp_sid at their 2.6 root
    // locations (src/fpd/normalize.js), so they are relocated here. Never
    // dual-populate: a request carrying both locations gets one of them
    // silently dropped downstream. (eids need no such move — core already
    // consolidates them at user.ext.eids before adapters run.)
    const regs = request.regs as Record<string, unknown> | undefined;
    if (regs) {
      if (regs.gpp != null && (regs.ext as Record<string, unknown>)?.gpp == null) {
        deepSetValue(request, 'regs.ext.gpp', regs.gpp);
        if (regs.gpp_sid != null) {
          deepSetValue(request, 'regs.ext.gpp_sid', regs.gpp_sid);
        }
      }
      delete regs.gpp;
      delete regs.gpp_sid;
      if (Object.keys(regs).length === 0) {
        delete request.regs;
      }
    }
    // The Bid Espresso match id travels ONLY as the credentialed cookie. A
    // buyeruid inside the page payload is by definition not ours and is never
    // forwarded — the same "ours or nothing" rule the gateway enforces
    // server-side.
    const user = request.user as Record<string, unknown> | undefined;
    if (user) {
      delete user.buyeruid;
      if (Object.keys(user).length === 0) {
        delete request.user;
      }
    }
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // The gateway stamps oRTB `mtype` on every bid (1 banner, 2 video) and
    // the converter core honors it natively, so it is deliberately not
    // re-derived here. The context fallback covers legacy/no-mtype responses
    // only: unambiguous for single-media imps; a dual-media imp defaults to
    // banner (the gateway's historical banner-preferred behavior).
    const isVideo = bid.mtype != null
      ? bid.mtype === 2
      : Boolean(context.imp?.video && !context.imp?.banner);
    if (bid.mtype == null) {
      context.mediaType = isVideo ? VIDEO : BANNER;
    }
    if (isVideo) {
      context.ttl = VIDEO_TTL;
    }
    return buildBidResponse(bid, context);
  },
  overrides: {
    imp: {
      bidfloor(applyDefaultBidFloor, imp, bidRequest, context) {
        // The gateway prices floors in USD. Ask the floors module for USD and
        // attach the result only when it actually is USD — a floor in any
        // other currency would be silently misread downstream. (This override
        // only runs when the publisher has compiled the priceFloors module.)
        const floor = {};
        applyDefaultBidFloor(floor, bidRequest, { ...context, currency: DEFAULT_CURRENCY });
        if ((floor as Record<string, unknown>).bidfloorcur === DEFAULT_CURRENCY) {
          Object.assign(imp, floor);
        }
      },
      extBidfloor(setGranularBidfloors, imp, bidRequest, context) {
        // Same USD rule for the granular floors the module writes under
        // banner/video `ext` and `banner.format[].ext`: run the default
        // processor, then withhold any floor it wrote that did not resolve
        // in USD.
        setGranularBidfloors(imp, bidRequest, { ...context, currency: DEFAULT_CURRENCY });
        const scrub = (obj: unknown) => {
          const ext = (obj as { ext?: Record<string, unknown> } | undefined)?.ext;
          if (ext && 'bidfloor' in ext && ext.bidfloorcur !== DEFAULT_CURRENCY) {
            delete ext.bidfloor;
            delete ext.bidfloorcur;
          }
        };
        scrub(imp.banner);
        scrub(imp.video);
        ((imp.banner as { format?: unknown[] } | undefined)?.format ?? []).forEach(scrub);
      },
    },
  },
});

function hasResolvableSize(video: Record<string, unknown>): boolean {
  const ps = video.playerSize;
  if (Array.isArray(ps)) {
    const flat = Array.isArray(ps[0]) ? ps[0] : ps;
    if (flat.length === 2 && flat.every((n) => Number.isFinite(n))) {
      return true;
    }
  }
  return Number.isFinite(video.w) && Number.isFinite(video.h);
}

function isValidVideoDeclaration(video: Record<string, unknown>, bidId: string): boolean {
  if (!Array.isArray(video.mimes) || video.mimes.length === 0) {
    logWarn(`bidespresso: invalid mediaTypes.video on bid "${bidId}" — mimes must be a non-empty array`);
    return false;
  }
  if (!hasResolvableSize(video)) {
    logWarn(`bidespresso: invalid mediaTypes.video on bid "${bidId}" — needs playerSize ([[w,h]] or [w,h]) or numeric w/h`);
    return false;
  }
  return true;
}

const isBidRequestValid: BidderSpec<typeof BIDDER_CODE>['isBidRequestValid'] = (bid) => {
  const params = bid?.params;
  if (typeof params?.publisherId !== 'string' || params.publisherId.length === 0) {
    return false;
  }
  if (typeof params.inventoryId !== 'string' || params.inventoryId.length === 0) {
    return false;
  }
  const mediaTypes = bid?.mediaTypes as Record<string, unknown> | undefined;
  const video = mediaTypes?.video as Record<string, unknown> | undefined;
  // A video-only ad unit must be answerable: hard-require what the gateway's
  // video path cannot synthesize. Mixed units stay valid — their banner side
  // can still bid.
  if (video && !mediaTypes?.banner && !isValidVideoDeclaration(video, bid.bidId)) {
    return false;
  }
  return true;
};

const buildRequests: BidderSpec<typeof BIDDER_CODE>['buildRequests'] = (validBidRequests, bidderRequest) => {
  // One POST per (publisherId, inventoryId) pair: a page may carry ad units
  // from different inventory segments, and every imp must ride under its own
  // routing ids — never the first bid's.
  const groups: Record<string, typeof validBidRequests> = {};
  for (const bid of validBidRequests) {
    // Encoded parts so an id containing the delimiter can never merge groups.
    const key = `${encodeURIComponent(bid.params.publisherId)}|${encodeURIComponent(bid.params.inventoryId)}`;
    (groups[key] ??= []).push(bid);
  }
  return Object.values(groups).map((groupBids) => {
    const data = converter.toORTB({ bidRequests: groupBids, bidderRequest });
    const { publisherId, inventoryId } = groupBids[0].params;
    const url = `${ENDPOINT_URL}?pub=${encodeURIComponent(publisherId)}&inv=${encodeURIComponent(inventoryId)}`;
    return {
      method: 'POST' as const,
      url,
      data,
      options: {
        // Both options match today's core defaults for adapter POSTs
        // (src/adapters/bidderFactory applies withCredentials:true +
        // text/plain). They are pinned deliberately: the user-match cookie
        // only attaches on a credentialed request, and matching would fail
        // silently if a future core default change or a stray override ever
        // flipped it. text/plain additionally keeps the POST preflight-free.
        withCredentials: true,
        contentType: 'text/plain',
      },
    };
  });
};

const interpretResponse: BidderSpec<typeof BIDDER_CODE>['interpretResponse'] = (serverResponse, request) => {
  const body = serverResponse.body as { id?: string } | string | null | undefined;
  const requestId = (request.data as { id?: string })?.id;
  const bodyId = typeof body === 'object' && body != null ? body.id : undefined;
  // Cross-talk guard: a response that answers some other request must not be
  // parsed as ours (fromORTB matches on impids, which can collide across
  // auctions).
  if (bodyId != null && requestId != null && bodyId !== requestId) {
    logWarn(`bidespresso: dropping response "${bodyId}" that does not answer request "${requestId}"`);
    return { bids: [] };
  }
  return converter.fromORTB({ response: serverResponse.body, request: request.data });
};

const getUserSyncs: BidderSpec<typeof BIDDER_CODE>['getUserSyncs'] = (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  // The sync endpoint redirects into a multi-partner sync page whose logic must
  // execute as a document — loaded as an image it dies silently. Iframe or nothing.
  if (!syncOptions.iframeEnabled) {
    return [];
  }
  const params = getUserSyncParams(gdprConsent, uspConsent, gppConsent);
  const qs = formatQS(params);
  return [{ type: 'iframe', url: qs ? `${SYNC_URL}?${qs}` : SYNC_URL }];
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  // Device-storage disclosure for the server-set match cookie (the adapter
  // itself uses no storage APIs; the cookie attaches via the credentialed
  // request and is set during the iframe sync).
  disclosureURL: 'https://auction.bidespresso.com/device-storage-disclosure.json',
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
