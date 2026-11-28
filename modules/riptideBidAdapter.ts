import { registerBidder, type AdapterRequest, type BidderSpec, type ExtendedResponse, type ServerResponse } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO, type MediaType } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import type { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import type { ORTBImp, ORTBRequest } from '../src/prebid.public.js';

/**
 * Riptide bid adapter: OpenRTB 2.6 to `POST https://<host>/ortb` for banner, video and native.
 * Every white-label partner on Riptide is an alias with its own row in ALIASES; a request goes to
 * the host of the bidder code that made it, and a code without a row makes no request.
 */

export const BIDDER_CODE = 'riptide';
const CURRENCY = 'USD';

type RiptideBidParams = {
  /** The publisher's public id in Riptide (`site.publisher.id` / `app.publisher.id`). */
  publisherId: string;
  /** The placement's public id (`imp.tagid`). */
  placementId: string;
  /** Floor, USD CPM; the price floors module's floor takes precedence. */
  bidfloor?: number;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: RiptideBidParams;
  }
}

type AliasRow = { host: string; syncHost: string; gvlid?: number };

/**
 * Bidder code -> serving host, sync host and IAB TCF Global Vendor List id. A partner alias is
 * one more row. `gvlid` stays undefined until the code has a registered GVL id.
 */
export const ALIASES: Record<string, AliasRow> = {
  riptide: { host: 'serve.riptideads.com', syncHost: 'sync.riptideads.com', gvlid: undefined },
};

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (typeof v === 'object' && Object.keys(v).length === 0);

// imp.video.plcmt for the ad unit's video context when the ad unit sets none.
const PLCMT_BY_CONTEXT = { outstream: 4, instream: 1 } as const;

function floorOf(bidRequest: BidRequest<typeof BIDDER_CODE>): number | undefined {
  if (typeof bidRequest.getFloor === 'function') {
    const floor = bidRequest.getFloor({ currency: CURRENCY, mediaType: '*', size: '*' });
    if (floor && floor.currency === CURRENCY && Number.isFinite(floor.floor)) return floor.floor;
  }
  return bidRequest.params.bidfloor;
}

// The one media type an imp asks for; a bid without `mtype` on a multi-format imp stays untyped
// and the converter drops it.
function impMediaType(imp: ORTBImp | undefined): MediaType | undefined {
  const present = ([BANNER, VIDEO, NATIVE] as const).filter((m) => imp?.[m]);
  return present.length === 1 ? present[0] : undefined;
}

// Moves a signal from its OpenRTB 2.5 `ext` location to the 2.6 field, or takes it from the
// consent object Prebid hands the adapter.
function lift(obj: Record<string, any>, key: string, fallback?: unknown) {
  const value = obj[key] ?? obj.ext?.[key] ?? fallback;
  if (obj.ext) {
    delete obj.ext[key];
    if (isEmpty(obj.ext)) delete obj.ext;
  }
  if (!isEmpty(value)) obj[key] = value;
}

function toOpenRTB26(request: Record<string, any>, bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>) {
  const { gdprConsent, uspConsent, gppConsent } = bidderRequest;
  const regs = request.regs || {};
  const gdprApplies = typeof gdprConsent?.gdprApplies === 'boolean' ? (gdprConsent.gdprApplies ? 1 : 0) : undefined;
  lift(regs, 'gdpr', gdprApplies);
  lift(regs, 'us_privacy', uspConsent);
  lift(regs, 'gpp', gppConsent?.gppString);
  lift(regs, 'gpp_sid', gppConsent?.applicableSections);
  const user = request.user || {};
  lift(user, 'consent', gdprConsent?.consentString);
  const source = request.source || {};
  lift(source, 'schain');
  for (const [key, obj] of [['regs', regs], ['user', user], ['source', source]] as const) {
    if (isEmpty(obj)) delete request[key];
    else request[key] = obj;
  }
}

const converter = ortbConverter({
  context: { netRevenue: true, ttl: 300, currency: CURRENCY },
  imp(buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = bidRequest.params.placementId;
    const plcmt = PLCMT_BY_CONTEXT[bidRequest.mediaTypes?.video?.context as keyof typeof PLCMT_BY_CONTEXT];
    if (imp.video && imp.video.plcmt == null && plcmt !== undefined) imp.video.plcmt = plcmt;
    const floor = floorOf(bidRequest);
    if (floor !== undefined) {
      imp.bidfloor = floor;
      imp.bidfloorcur = CURRENCY;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.id = bidderRequest.bidderRequestId;
    request.cur = [CURRENCY];
    const inventory = (['app', 'dooh'] as const).find((key) => request[key]) || 'site';
    const publisherId = context.bidRequests[0].params.publisherId;
    request[inventory] = { ...request[inventory], publisher: { ...request[inventory]?.publisher, id: publisherId } };
    toOpenRTB26(request, bidderRequest as ClientBidderRequest<typeof BIDDER_CODE>);
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, bid.mtype != null ? context : { ...context, mediaType: impMediaType(context.imp) });
    // Riptide's nurl is a win notice, never a VAST document.
    if (bidResponse.mediaType === VIDEO && bid.adm) delete bidResponse.vastUrl;
    if (bid.nurl) Object.assign(bidResponse, { nurl: bid.nurl });
    return bidResponse;
  },
});

function syncQuery(gdprConsent, uspConsent, gppConsent) {
  const params: [string, string][] = [];
  if (typeof gdprConsent?.gdprApplies === 'boolean') params.push(['gdpr', gdprConsent.gdprApplies ? '1' : '0']);
  if (isNonEmptyString(gdprConsent?.consentString)) params.push(['gdpr_consent', gdprConsent.consentString]);
  if (isNonEmptyString(uspConsent)) params.push(['us_privacy', uspConsent]);
  if (isNonEmptyString(gppConsent?.gppString)) params.push(['gpp', gppConsent.gppString]);
  if (Array.isArray(gppConsent?.applicableSections) && gppConsent.applicableSections.length) {
    params.push(['gpp_sid', gppConsent.applicableSections.join(',')]);
  }
  return params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: ALIASES[BIDDER_CODE].gvlid,
  // The adapter stores nothing in the browser; the disclosure lists the sync host's cookie.
  disclosureURL: 'local://modules/riptideBidAdapter.json',
  aliases: Object.entries(ALIASES)
    .filter(([code]) => code !== BIDDER_CODE)
    .map(([code, row]) => ({ code, gvlid: row.gvlid })),
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    const p = bid?.params;
    return !!p && isNonEmptyString(p.publisherId) && isNonEmptyString(p.placementId) &&
      (p.bidfloor === undefined || (typeof p.bidfloor === 'number' && p.bidfloor >= 0));
  },

  // One request per publisher. Cookies (the id a user sync set on the code's own domain) go only
  // when device access is permitted: TCF purpose 1 where GDPR applies.
  buildRequests(validBidRequests, bidderRequest) {
    const row = ALIASES[bidderRequest.bidderCode];
    if (!row || !validBidRequests.length) return [];
    const byPublisher = new Map<string, BidRequest<typeof BIDDER_CODE>[]>();
    for (const bid of validBidRequests) {
      byPublisher.set(bid.params.publisherId, [...(byPublisher.get(bid.params.publisherId) || []), bid]);
    }
    return [...byPublisher.values()].map((bidRequests): AdapterRequest => ({
      method: 'POST',
      url: `https://${row.host}/ortb`,
      data: converter.toORTB({ bidRequests, bidderRequest }),
      options: { contentType: 'text/plain', withCredentials: hasPurpose1Consent(bidderRequest.gdprConsent) },
    }));
  },

  // A 204 (no body) and a coded no-bid (`{id, nbr}`, no seatbid) are both an empty bid list.
  interpretResponse(serverResponse: ServerResponse, request: AdapterRequest) {
    if (!serverResponse || isEmpty(serverResponse.body)) return [];
    return (converter.fromORTB({ request: request.data as ORTBRequest, response: serverResponse.body }) as ExtendedResponse).bids;
  },

  // `this.code` is the syncing code: the alias's (with `userSync.aliasSyncEnabled`) or the parent's.
  // An image sync unless only iframes are allowed.
  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const row = ALIASES[this?.code] || ALIASES[BIDDER_CODE];
    const type = syncOptions.pixelEnabled ? 'image' : (syncOptions.iframeEnabled ? 'iframe' : undefined);
    if (!type) return [];
    const query = syncQuery(gdprConsent, uspConsent, gppConsent);
    return [{ type, url: `https://${row.syncHost}/usersync${query ? `?${query}` : ''}` }];
  },
};

registerBidder(spec);
