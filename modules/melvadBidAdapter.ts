import { deepAccess, deepSetValue, generateUUID, isPlainObject, isStr, logWarn } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { registerBidder, type AdapterRequest, type BidderSpec, type ExtendedResponse, type ServerResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import type { Bid } from '../src/bidfactory.js';
import { BANNER, NATIVE, VIDEO, type MediaType } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import type { ORTBImp, ORTBRequest } from '../src/prebid.public.js';

/**
 * Melvad bid adapter: the browser contract of the Melvad SSP.
 *
 * One OpenRTB 2.5 request per auction, `imp.id` = Prebid `bidId`, the placement of the SSP in
 * `imp.ext.melvad.placementId`. The SSP answers a BidResponse priced after the Melvad commission
 * (netRevenue true): `bid.exp` is the lifetime of the offer, `bid.ext.melvad.mediaType` names the
 * format, `adm` carries the HTML, the Native 1.2 JSON or the VAST XML, `nurl` is our win link and
 * `burl` our billing link, both with the price macros the adapter fills on the Prebid events.
 */

const BIDDER_CODE = 'melvad';
const CONTRACT_VERSION = 1;
const DEFAULT_ENDPOINT = 'https://pub.supplier.melvad.com/prebid';
/** the longest a bid stays usable in Prebid, whatever the SSP allows */
const MAX_TTL_SECONDS = 300;
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE, VIDEO] as const;
// the OpenRTB macros of our links, spelled apart from a template string for the linter
const PRICE_MACRO = '$' + '{AUCTION_PRICE}';
const CURRENCY_MACRO = '$' + '{AUCTION_CURRENCY}';

export interface MelvadBidParams {
  /** the UID of the placement in the Melvad SSP */
  placementId: string;
}

export interface MelvadConfig {
  /** the browser endpoint of the SSP; the production one by default */
  endpoint?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: MelvadBidParams;
  }
}

declare module '../src/config' {
  interface Config {
    [BIDDER_CODE]?: MelvadConfig;
  }
}

/** the ORD marking of an ad (`bid.ext.nroa` of the SSP): the erid, the INN and the name of the advertiser */
export interface MelvadMarking {
  erid?: string;
  inn?: string;
  name?: string;
}

/**
 * What the adapter keeps on the Prebid bid (`bid.melvad`): our win and billing links it calls itself, and for a
 * renderer of the page (a page may render the markup itself, in its own frame) the API frameworks of the creative
 * (OpenRTB `bid.api`: 5 MRAID 2, 6 MRAID 3), its creative attributes (`bid.attr`) and the ORD marking of the ad,
 * so the page can give the creative MRAID and show the marking.
 */
export interface MelvadBidData {
  win?: string;
  billing?: string;
  api?: number[];
  attr?: number[];
  nroa?: MelvadMarking;
}

declare module '../src/bidfactory' {
  // bid.melvad is public: a page that renders the markup itself reads it from getBidResponses() and the bid events
  interface BannerBidProperties {
    melvad?: MelvadBidData;
  }
  interface VideoBidProperties {
    melvad?: MelvadBidData;
  }
  interface NativeBidProperties {
    melvad?: MelvadBidData;
  }
}

type MelvadBid = Bid & { melvad?: MelvadBidData };
type MelvadBidRequest = BidRequest<typeof BIDDER_CODE>;
type MelvadBidderRequest = ClientBidderRequest<typeof BIDDER_CODE>;

export function getPlacementId(bid: { params?: Partial<MelvadBidParams> }): string {
  const value = bid?.params?.placementId;
  return isStr(value) ? value.trim() : '';
}

export function getEndpoint(): string {
  const configured = config.getConfig(BIDDER_CODE)?.endpoint;
  return isStr(configured) && configured.trim() !== '' ? configured.trim() : DEFAULT_ENDPOINT;
}

function isSupportedMediaType(value: unknown): value is MediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(value as string);
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: MAX_TTL_SECONDS,
  },
  imp(buildImp, bidRequest: MelvadBidRequest, context) {
    const imp: ORTBImp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.melvad.placementId', getPlacementId(bidRequest));
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request: ORTBRequest = buildRequest(imps, bidderRequest, context);
    if (!isStr(request.id) || request.id === '') {
      request.id = generateUUID();
    }
    // our price is the price of the client auction: the SSP applies the commission for a first price auction only
    request.at = 1;
    deepSetValue(request, 'ext.melvad.contractVersion', CONTRACT_VERSION);
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // the format comes from the SSP; the ORTB 2.6 mtype of a DSP is the fallback
    const declared = deepAccess(bid, 'ext.melvad.mediaType');
    const mediaType = isSupportedMediaType(declared) ? declared : mediaTypeOf(bid.mtype);
    if (mediaType == null) {
      throw new Error(`bid ${bid.id}: no media type`);
    }
    const requested = context.bidRequest?.mediaTypes;
    if (requested != null && !(mediaType in requested)) {
      throw new Error(`bid ${bid.id}: media type ${mediaType} was not requested`);
    }
    if (!(bid.price > 0)) {
      throw new Error(`bid ${bid.id}: no price`);
    }
    if (!(bid.exp > 0)) {
      throw new Error(`bid ${bid.id}: no exp`);
    }
    if (!isStr(bid.adm) || bid.adm === '') {
      throw new Error(`bid ${bid.id}: no adm`);
    }
    context.mediaType = mediaType;
    // our links are called by the adapter with the price macros filled: the converter must not plant nurl as a
    // pixel of the banner markup or take it for a VAST tag
    const { nurl, burl, ...offer } = bid;
    const bidResponse = buildBidResponse(offer, context) as MelvadBid;
    bidResponse.ttl = Math.min(bid.exp, MAX_TTL_SECONDS);
    if (mediaType === VIDEO) {
      // the VAST travels inline; nurl is our win link, not a VAST tag
      delete (bidResponse as { vastUrl?: string }).vastUrl;
    }
    if (mediaType === NATIVE && !isPlainObject(deepAccess(bidResponse, 'native.ortb'))) {
      throw new Error(`bid ${bid.id}: invalid native markup`);
    }
    const data: MelvadBidData = {
      win: isStr(nurl) && nurl !== '' ? nurl : undefined,
      billing: isStr(burl) && burl !== '' ? burl : undefined,
    };
    // api of OpenRTB 2.5 (a number) or apis of 2.6 (a list)
    const api = intList(deepAccess(bid, 'api') ?? deepAccess(bid, 'apis'));
    if (api.length > 0) {
      data.api = api;
    }
    const attr = intList(bid.attr);
    if (attr.length > 0) {
      data.attr = attr;
    }
    const marking = markingOf(deepAccess(bid, 'ext.nroa'));
    if (marking != null) {
      data.nroa = marking;
    }
    bidResponse.melvad = data;
    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    if (!isStr(ortbResponse?.cur) || ortbResponse.cur === '') {
      logWarn(`${BIDDER_CODE}: the response has no currency, its bids are dropped`);
      return { bids: [] };
    }
    for (const bidResponse of bidResponses) {
      // a page may render the banner markup itself: our price macros in it are filled here with the
      // price of the bid in the currency of the response, before any currency conversion of Prebid
      if (bidResponse.mediaType === BANNER && isStr(bidResponse.ad)) {
        bidResponse.ad = fillMacros(bidResponse.ad, bidResponse.cpm, ortbResponse.cur);
      }
    }
    return buildResponse(bidResponses, ortbResponse, context);
  },
});

/** the positive integers of an OpenRTB list field given as a list or as a single number (api of OpenRTB 2.5) */
function intList(value: unknown): number[] {
  const values: unknown[] = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.filter((item): item is number => Number.isInteger(item) && (item as number) > 0);
}

/** the ORD marking of a bid: the erid of bid.ext.nroa and the INN and the name of its client */
function markingOf(nroa: unknown): MelvadMarking | undefined {
  if (!isPlainObject(nroa)) {
    return undefined;
  }
  const record = nroa as Record<string, unknown>;
  const client = isPlainObject(record.client) ? record.client as Record<string, unknown> : {};
  const text = (value: unknown): string | undefined => typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
  const marking: MelvadMarking = {};
  const erid = text(record.erid);
  const inn = text(client.inn);
  const name = text(client.name);
  if (erid != null) {
    marking.erid = erid;
  }
  if (inn != null) {
    marking.inn = inn;
  }
  if (name != null) {
    marking.name = name;
  }
  return Object.keys(marking).length > 0 ? marking : undefined;
}

function mediaTypeOf(mtype: unknown): MediaType | undefined {
  switch (mtype) {
    case 1: return BANNER;
    case 2: return VIDEO;
    case 4: return NATIVE;
    default: return undefined;
  }
}

/** fills our price macros of a link with the price of the client auction in its currency */
export function fillPriceMacros(link: string, bid: Bid): string {
  const cpm = typeof bid.originalCpm === 'number' ? bid.originalCpm : bid.cpm;
  const currency = isStr(bid.originalCurrency) && bid.originalCurrency !== '' ? bid.originalCurrency : bid.currency;
  return fillMacros(link, cpm, currency);
}

function fillMacros(text: string, cpm: unknown, currency: unknown): string {
  return text
    .split(PRICE_MACRO).join(encodeURIComponent(String(cpm)))
    .split(CURRENCY_MACRO).join(encodeURIComponent(typeof currency === 'string' ? currency : ''));
}

function callLink(bid: Bid, kind: 'win' | 'billing'): void {
  const link = (bid as MelvadBid).melvad?.[kind];
  if (isStr(link) && link !== '') {
    // a low priority GET that must survive a navigation right after the event: fetch with keepalive, no cookies
    ajax(fillPriceMacros(link, bid), undefined, undefined, { method: 'GET', keepalive: true, withCredentials: false });
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid(bid: MelvadBidRequest): boolean {
    const placementId = getPlacementId(bid);
    if (placementId === '' || placementId.length > 64) {
      logWarn(`${BIDDER_CODE}: params.placementId is required`);
      return false;
    }
    return true;
  },

  buildRequests(bidRequests: MelvadBidRequest[], bidderRequest: MelvadBidderRequest): AdapterRequest {
    const data: ORTBRequest = converter.toORTB({ bidRequests, bidderRequest });
    return {
      method: 'POST',
      url: getEndpoint(),
      data,
      options: {
        // a simple request: no preflight, no cookies
        contentType: 'text/plain',
        withCredentials: false,
      },
    };
  },

  interpretResponse(response: ServerResponse, request: AdapterRequest) {
    const body = response?.body;
    if (!isPlainObject(body) || !Array.isArray(body.seatbid)) {
      return [];
    }
    if (!isStr(body.cur) || body.cur === '') {
      logWarn(`${BIDDER_CODE}: the response has no currency, its bids are dropped`);
      return [];
    }
    const result = converter.fromORTB({ response: body, request: request.data }) as ExtendedResponse;
    return result.bids ?? [];
  },

  onBidWon(bid: Bid): void {
    callLink(bid, 'win');
  },

  onBidBillable(bid: Bid): void {
    callLink(bid, 'billing');
  },

  getUserSyncs(): [] {
    // the user is the OUI the page passes in ortb2.user.buyeruid; no sync of its own in the contract v1
    return [];
  },
};

registerBidder(spec);
