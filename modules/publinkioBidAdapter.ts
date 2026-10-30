import { type BidderSpec, type ExtendedResponse, registerBidder } from '../src/adapters/bidderFactory.js';
import { ajax } from '../src/ajax.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { AUDIO, BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, isPlainObject, logWarn, runBackgroundTask } from '../src/utils.js';
import type { BidRequest } from '../src/adapterManager.js';

const BIDDER_CODE = 'publinkio';
const ENDPOINT = 'https://ortb.publink.io/api/ortb/prebid';
const DEFAULT_CURRENCY = 'USD';
const MEDIA_TYPES = { 1: BANNER, 2: VIDEO, 3: AUDIO } as const;

export const dep = { ajax, runBackgroundTask };

export type PublinkioBidParams = {
  /** Overrides ortb2Imp.tagid with the tag ID issued by Publink. */
  placementId?: string;
  /** Fallback floor CPM; standard ORTB/floors module values take precedence. */
  bidFloor?: number;
  /** The endpoint prices bids and fallback floors in USD. */
  currency?: 'USD';
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: PublinkioBidParams;
  }
}

function validPlacement(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function placement(bid: BidRequest<typeof BIDDER_CODE>): unknown {
  return bid?.params?.placementId ?? bid?.ortb2Imp?.tagid;
}

function validMimes(mimes: unknown): boolean {
  return Array.isArray(mimes) && mimes.length > 0 &&
    mimes.every(mime => typeof mime === 'string' && mime.trim().length > 0);
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: { netRevenue: true, ttl: 300, currency: DEFAULT_CURRENCY },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = placement(bidRequest) as string;
    // Do not send a format the adapter does not support on mixed units.
    delete imp.native;
    // Core can remove invalid mimes while retaining the other media fields.
    if (!validMimes(imp.video?.mimes)) delete imp.video;
    if (!validMimes(imp.audio?.mimes)) delete imp.audio;
    if (imp.bidfloor == null && bidRequest.params?.bidFloor != null) {
      imp.bidfloor = bidRequest.params.bidFloor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    // The gateway reads ORTB 2.6 core fields. Keep existing publisher values,
    // including the older ext copies, and mirror consent where necessary.
    const usp = deepAccess(request, 'regs.ext.us_privacy') ?? bidderRequest.uspConsent;
    if (usp && deepAccess(request, 'regs.us_privacy') == null) {
      deepSetValue(request, 'regs.us_privacy', usp);
    }
    const gpp = bidderRequest.gppConsent;
    if (gpp?.gppString && deepAccess(request, 'regs.gpp') == null) {
      deepSetValue(request, 'regs.gpp', gpp.gppString);
      deepSetValue(request, 'regs.gpp_sid', gpp.applicableSections || []);
    }
    const schain = deepAccess(request, 'source.ext.schain') ||
      deepAccess(context, 'bidRequests.0.schain');
    if (schain && deepAccess(request, 'source.schain') == null) {
      deepSetValue(request, 'source.schain', schain);
    }
    // Only the bidder-request flag computed by core grants trust. Publisher
    // FPD cannot independently grant it through an ORTB extension.
    const publisherPrebid = deepAccess(request, 'ext.prebid');
    const prebid: Record<string, unknown> = isPlainObject(publisherPrebid)
      ? { ...(publisherPrebid as Record<string, unknown>) } : {};
    delete prebid.as;
    if (bidderRequest.allowPriorityBids === true) {
      prebid.as = { ap: true, apb: [bidderRequest.bidderCode] };
    }
    if (bidderRequest.allowPriorityBids === true || isPlainObject(publisherPrebid)) {
      deepSetValue(request, 'ext.prebid', prebid);
    }
    request.cur = request.cur || [DEFAULT_CURRENCY];
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    const mediaType = MEDIA_TYPES[bid.mtype];
    // A malformed or mismatched bid must not invalidate its siblings.
    if (!mediaType || !context.imp[mediaType] ||
        !Number.isFinite(bid.price) || bid.price <= 0 ||
        typeof bid.adm !== 'string' || !bid.adm.trim()) return;
    // Core does not yet map audio mtype=3. A fresh context also keeps sibling
    // responses independent when an impression contains several formats.
    // The gateway's nurl is a win-notice pixel, not a VAST document URL.
    // Inline VAST carries the render trackers; do not offer that pixel to a player.
    const creativeBid = mediaType === BANNER ? bid : { ...bid, nurl: undefined };
    const response = buildBidResponse(creativeBid, { ...context, mediaType });
    if (mediaType !== BANNER && typeof bid.nurl === 'string' && bid.nurl.trim()) {
      Object.assign(response, {
        publinkioWinNotice: {
          url: bid.nurl.replace(/\$\{AUCTION_PRICE\}/g, String(bid.price)),
          sent: false,
        }
      });
    }
    response.meta = { ...response.meta, advertiserDomains: bid.adomain || [] };
    return response;
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, AUDIO],

  isBidRequestValid(bid) {
    const params = bid?.params;
    return validPlacement(placement(bid)) &&
      (params?.bidFloor == null || (Number.isFinite(params.bidFloor) && params.bidFloor >= 0)) &&
      (params?.currency == null || params.currency === DEFAULT_CURRENCY) &&
      !!(bid.mediaTypes?.banner || validMimes(bid.mediaTypes?.video?.mimes) || validMimes(bid.mediaTypes?.audio?.mimes));
  },

  buildRequests(validBidRequests, bidderRequest) {
    // The gateway resolves one tag per request; never mix publishers/placements.
    return validBidRequests.map(bid => ({
      method: 'POST' as const,
      url: ENDPOINT,
      // Keep the original object: ortbConverter associates its context by identity.
      data: converter.toORTB({ bidRequests: [bid], bidderRequest }),
      options: { withCredentials: false },
    })).filter(request => request.data.imp.some(imp => imp.banner || imp.video || imp.audio));
  },

  onBidWon(bid) {
    const notice = (bid as typeof bid & { publinkioWinNotice?: { url: string; sent: boolean } }).publinkioWinNotice;
    if (!notice || notice.sent) return;
    // Keep state per response: core's shallow bid copies share this notice.
    notice.sent = true;
    dep.runBackgroundTask(() => {
      try {
        dep.ajax(notice.url, undefined, undefined, { method: 'GET', keepalive: true, withCredentials: false });
      } catch (error) {
        logWarn('publinkio: win notice failed', error);
      }
    });
  },

  interpretResponse(serverResponse, request) {
    const body = serverResponse?.body;
    if (!Array.isArray(body?.seatbid)) return [];
    // Discard malformed seats without dropping valid seats in the same response.
    const response = {
      ...body,
      seatbid: body.seatbid.filter(seat => seat && Array.isArray(seat.bid))
        .map(seat => ({ ...seat, bid: seat.bid.filter(bid => bid && typeof bid === 'object') })),
    };
    return (converter.fromORTB({ response, request: request.data }) as ExtendedResponse).bids;
  },
};

// No storage or user syncs. Non-banner wins use a keepalive notice; banner notices use core rendering.
registerBidder(spec);
