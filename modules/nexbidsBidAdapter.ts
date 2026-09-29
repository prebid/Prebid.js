import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import type { MediaType } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { deepAccess, deepSetValue, isArray, isStr, triggerPixel } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ORTB_MTYPES } from '../libraries/ortbConverter/processors/mediaType.js';
import type { AdapterRequest, AdapterResponse, BidderSpec, ExtendedResponse, ServerResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import type { Bid } from '../src/bidfactory.js';

/**
 * Bid parameters for the NexBids adapter.
 */
export interface NexbidsBidderParams {
  /**
   * Publisher ID assigned by NexBids (`Pub-…`).
   * Sent as the `publisherId` query parameter; the NexBids gateway resolves it against its
   * registry and fills `site.publisher.id` itself, so the value is an identifier, not a secret.
   */
  publisherId: string;
  /**
   * Ad unit code registered in the NexBids console. Sent as `imp.tagid`.
   */
  adUnitCode: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    nexbids: NexbidsBidderParams;
  }
}

/**
 * Adapter configuration, set with `pbjs.setConfig({ nexbids: { env: 'test' } })`.
 */
export interface NexbidsConfig {
  /**
   * Gateway environment. `prod` (default) is the production endpoint; `test` is the
   * NexBids staging gateway for integration testing.
   */
  env?: 'prod' | 'test';
  /**
   * Gateway origin override (scheme + host, e.g. `http://localhost:8082`) for local
   * integration testing against a gateway or mock you run yourself. Takes precedence over `env`.
   */
  endpoint?: string;
}

declare module '../src/config' {
  interface Config {
    nexbids?: NexbidsConfig;
  }
}

const BIDDER_CODE = 'nexbids';
const AUCTION_PATH = '/openrtb2/auction';
/**
 * One hostname per environment. Production is a single GeoDNS name that resolves to the
 * nearest gateway region; regional routing lives behind it, not in this table.
 */
const GATEWAY_HOSTS: Record<string, string> = {
  prod: 'https://us.nexbids.com',
  test: 'https://test.ssp.nexbids.com'
};
const DEFAULT_TTL = 300;
/**
 * The NexBids exchange requires `banner.mimes`; declaring the common set here avoids relying
 * on the server-side default.
 */
const DEFAULT_BANNER_MIMES = ['text/html', 'text/javascript', 'image/jpeg', 'image/png', 'image/gif'];

function gatewayHost(): string {
  const cfg: NexbidsConfig = config.getConfig('nexbids') || {};
  if (isStr(cfg.endpoint) && /^https?:\/\//.test(cfg.endpoint)) {
    return cfg.endpoint.replace(/\/+$/, '');
  }
  return GATEWAY_HOSTS[cfg.env] || GATEWAY_HOSTS.prod;
}

function originOf(url: string): string {
  const m = /^https?:\/\/[^/]+/.exec(url || '');
  return m ? m[0] : '';
}

/**
 * Resolves a gateway-relative path (`/openrtb2/track/...`) against the gateway origin. Absolute and
 * protocol-relative URLs (a DSP's own trackers) are left alone.
 */
function absoluteUrl(url: string, origin: string): string {
  return url.charAt(0) === '/' && url.charAt(1) !== '/' ? origin + url : url;
}

/**
 * Media type of a response bid that carries no `mtype`. The gateway sets `mtype` from the format it
 * forwarded; without it (older gateways), fall back to the only format declared on the imp, then to
 * the creative itself (VAST markup for video, a native JSON document for native).
 */
function inferMediaType(bid, imp): MediaType {
  const declared = ([BANNER, VIDEO, NATIVE] as MediaType[]).filter((type) => imp && imp[type]);
  if (declared.length === 1) {
    return declared[0];
  }
  const adm = isStr(bid.adm) ? bid.adm.trim() : '';
  if (/^(<\?xml[^>]*>\s*)?<VAST[\s>]/i.test(adm)) {
    return VIDEO;
  }
  if (adm.charAt(0) === '{' && /"assets"\s*:/.test(adm)) {
    return NATIVE;
  }
  return BANNER;
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = String(bidRequest.params.adUnitCode);
    if (imp.banner && !deepAccess(imp, 'banner.mimes')) {
      deepSetValue(imp, 'banner.mimes', DEFAULT_BANNER_MIMES);
    }
    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (!ORTB_MTYPES.hasOwnProperty(bid.mtype)) {
      context.mediaType = inferMediaType(bid, context.imp);
    }
    const bidResponse = buildBidResponse(bid, context);
    // `bid.price` is already the settled price (the exchange applies first/second price
    // before responding). `ext.clearprice`, when present, is an explicit clearing price and wins.
    const clearPrice = Number(deepAccess(bid, 'ext.clearprice'));
    if (clearPrice > 0) {
      bidResponse.cpm = clearPrice;
    }
    bidResponse.meta = bidResponse.meta || {};
    if (!bidResponse.meta.advertiserDomains) {
      bidResponse.meta.advertiserDomains = [];
    }
    // The gateway strips nurl/burl/lurl and relays them server-side. What it hands down instead
    // is a signed billing pixel (relative path) in `ext.nexbids.pixel`; it is exposed as `burl`
    // so that it fires once when Prebid marks the bid billable (i.e. when the ad renders).
    // For video and native the gateway also writes the same pixel into the creative (VAST
    // <Impression> / native eventtrackers), because an instream player served through an ad server
    // may never trigger `bidWon`; the gateway de-duplicates the two.
    const pixel = deepAccess(bid, 'ext.nexbids.pixel');
    if (isStr(pixel) && pixel) {
      bidResponse.burl = pixel;
    }
    // Native is the one format where Prebid itself fires click trackers, so the click beacon can
    // ride along in `link.clicktrackers` (resolved to an absolute URL in interpretResponse).
    const click = deepAccess(bid, 'ext.nexbids.click');
    const link = bidResponse.mediaType === NATIVE ? bidResponse.native?.ortb?.link : undefined;
    if (link && isStr(click) && click) {
      link.clicktrackers = (isArray(link.clicktrackers) ? link.clicktrackers : []).concat(click);
    }
    return bidResponse;
  }
});

function hasBanner(bid: BidRequest<typeof BIDDER_CODE>): boolean {
  const sizes = deepAccess(bid, 'mediaTypes.banner.sizes');
  return isArray(sizes) && sizes.length > 0;
}

function hasVideo(bid: BidRequest<typeof BIDDER_CODE>): boolean {
  const playerSize = deepAccess(bid, 'mediaTypes.video.playerSize');
  return isArray(playerSize) && playerSize.length > 0;
}

function hasNative(bid: BidRequest<typeof BIDDER_CODE>): boolean {
  const assets = deepAccess(bid, 'nativeOrtbRequest.assets');
  return isArray(assets) && assets.length > 0;
}

function isBidRequestValid(bid: BidRequest<typeof BIDDER_CODE>): boolean {
  const params = bid.params || ({} as NexbidsBidderParams);
  if (!isStr(params.publisherId) || !params.publisherId) {
    return false;
  }
  if (!isStr(params.adUnitCode) || !params.adUnitCode) {
    return false;
  }
  // At least one format the gateway can size. For multi-format ad units the gateway picks the
  // format by what the registered ad unit allows, banner first.
  return hasBanner(bid) || hasVideo(bid) || hasNative(bid);
}

function buildRequests(
  validBidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>
): AdapterRequest[] {
  const host = gatewayHost();
  // One request per publisher: the gateway authenticates each request by its `publisherId`.
  // Insertion order is kept so the first ad unit's publisher goes first.
  const groups = new Map<string, BidRequest<typeof BIDDER_CODE>[]>();
  validBidRequests.forEach((bid) => {
    const key = bid.params.publisherId;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(bid);
  });
  return Array.from(groups.entries()).map(([publisherId, bidRequests]) => ({
    method: 'POST' as const,
    url: `${host}${AUCTION_PATH}?publisherId=${encodeURIComponent(publisherId)}`,
    data: converter.toORTB({ bidRequests, bidderRequest }),
    // Keep this a CORS "simple request": text/plain body (Prebid's default), no credentials and
    // the publisher id on the query string instead of a custom header, so there is no preflight.
    options: { withCredentials: false }
  }));
}

function interpretResponse(serverResponse: ServerResponse, request: AdapterRequest): AdapterResponse {
  const body = serverResponse?.body;
  // "No fill" is a 204 with an empty body.
  if (!body || typeof body !== 'object' || !Array.isArray(body.seatbid) || body.seatbid.length === 0) {
    return [];
  }
  const origin = originOf(request.url);
  const { bids = [] } = converter.fromORTB({ request: request.data, response: body }) as ExtendedResponse;
  bids.forEach((bid) => {
    if (isStr(bid.burl) && bid.burl) {
      bid.burl = absoluteUrl(bid.burl, origin);
    }
    const link = 'native' in bid ? bid.native?.ortb?.link : undefined;
    if (link && isArray(link.clicktrackers)) {
      link.clicktrackers = link.clicktrackers.map((url) => isStr(url) ? absoluteUrl(url, origin) : url);
    }
  });
  return bids;
}

function onBidBillable(bid: Bid): void {
  if (isStr(bid.burl) && bid.burl) {
    triggerPixel(bid.burl);
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidBillable
};

registerBidder(spec);
