import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import type { MediaType } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { noCredsAjax } from '../src/ajax.js';
import { deepAccess, deepSetValue, isArray, isStr } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import type { AdapterRequest, AdapterResponse, BidderSpec, ExtendedResponse, ServerResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import type { Bid } from '../src/bidfactory.js';

/**
 * Public bidding parameters for the nbads(NexBids) adapter.
 */
export interface NbadsBidderParams {
  /**
   * NexBids publisher ID; overrides ortb2.site/app/dooh.publisher.id.
   * Optional when a standard field is present. The gateway validates the ID and registered domain.
   */
  publisherId?: string;
  /**
   * NexBids placement ID; overrides ortb2Imp.tagid. Optional when the standard field is present.
   */
  adUnitCode?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    nbads: NbadsBidderParams;
  }
}

/**
 * Adapter configuration set with `pbjs.setConfig({ nbads: { env: 'test' } })`.
 */
export interface NbadsConfig {
  /**
   * Gateway environment. `prod` (default) is the production endpoint; `test` is the
   * NexBids staging gateway for integration testing.
   */
  env?: 'prod' | 'test';
}

declare module '../src/config' {
  interface Config {
    nbads?: NbadsConfig;
  }
}

const BIDDER_CODE = 'nbads';
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
  const cfg: NbadsConfig = config.getConfig('nbads') || {};
  // Prebid requires fixed endpoint domains and HTTPS, including integration tests.
  return cfg.env === 'test' ? GATEWAY_HOSTS.test : GATEWAY_HOSTS.prod;
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

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL
  },
  imp(buildImp, bidRequest, context) {
    // Remove other media formats before conversion and floor calculation without mutating the original request.
    const ortb2Imp = { ...bidRequest.ortb2Imp };
    [BANNER, VIDEO, NATIVE].forEach((type) => {
      if (type !== context.mediaType) {
        delete ortb2Imp[type];
      }
    });
    const imp = buildImp({ ...bidRequest, ortb2Imp }, context);
    imp.tagid = placementId(bidRequest);
    if (imp.banner && !deepAccess(imp, 'banner.mimes')) {
      deepSetValue(imp, 'banner.mimes', DEFAULT_BANNER_MIMES);
    }
    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    // The response currency defaults to USD, independently of request floors or the ad server currency.
    bidResponse.currency = context.ortbResponse.cur || 'USD';
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
    // The gateway strips and sends upstream notices; the client sends its signed impression URL when billable.
    // ext.nexbids is part of the gateway protocol and does not change with the public bidder code.
    // Video and native creatives also carry this URL; the gateway deduplicates repeated impression requests.
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

function publisherId(bid: BidRequest<typeof BIDDER_CODE>): string {
  return bid.params?.publisherId ?? deepAccess(bid, 'ortb2.site.publisher.id') ??
    deepAccess(bid, 'ortb2.app.publisher.id') ?? deepAccess(bid, 'ortb2.dooh.publisher.id');
}

function placementId(bid: BidRequest<typeof BIDDER_CODE>): string {
  return bid.params?.adUnitCode ?? deepAccess(bid, 'ortb2Imp.tagid');
}

function requestMediaTypes(bid: BidRequest<typeof BIDDER_CODE>): MediaType[] {
  const types: MediaType[] = [];
  if (hasBanner(bid)) types.push(BANNER);
  if (FEATURES.VIDEO && hasVideo(bid)) types.push(VIDEO);
  if (FEATURES.NATIVE && hasNative(bid)) types.push(NATIVE);
  return types;
}

function isBidRequestValid(bid: BidRequest<typeof BIDDER_CODE>): boolean {
  const publisher = publisherId(bid);
  const placement = placementId(bid);
  if (!isStr(publisher) || !publisher) {
    return false;
  }
  if (!isStr(placement) || !placement) {
    return false;
  }
  return requestMediaTypes(bid).length > 0;
}

function buildRequests(
  validBidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>
): AdapterRequest[] {
  const host = gatewayHost();
  type RequestGroup = { publisher: string; mediaType: MediaType; bids: BidRequest<typeof BIDDER_CODE>[] };
  const groups: Record<string, Partial<Record<MediaType, RequestGroup>>> = Object.create(null);
  const orderedGroups: RequestGroup[] = [];
  validBidRequests.forEach((bid) => {
    const publisher = publisherId(bid);
    requestMediaTypes(bid).forEach((mediaType) => {
      const publisherGroups = groups[publisher] || (groups[publisher] = {});
      if (!publisherGroups[mediaType]) {
        const group: RequestGroup = { publisher, mediaType, bids: [] };
        publisherGroups[mediaType] = group;
        orderedGroups.push(group);
      }
      publisherGroups[mediaType].bids.push(bid);
    });
  });
  // Batch placements by publisher and format so each format on a mixed-format ad unit can bid independently.
  return orderedGroups.map(({ publisher, mediaType, bids }) => ({
    method: 'POST' as const,
    url: `${host}${AUCTION_PATH}?publisherId=${encodeURIComponent(publisher)}`,
    data: converter.toORTB({ bidRequests: bids, bidderRequest, context: { mediaType } }),
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
    // Keepalive reduces notice loss during navigation; Prebid core deduplicates billing for the same bid.
    noCredsAjax(bid.burl, undefined, undefined, { method: 'GET', keepalive: true, withCredentials: false });
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
