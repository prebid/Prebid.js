import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import type { MediaType } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { noCredsAjax } from '../src/ajax.js';
import { deepAccess, deepSetValue, isArray, isStr } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ORTB_MTYPES } from '../libraries/ortbConverter/processors/mediaType.js';
import type { AdapterRequest, AdapterResponse, BidderSpec, ExtendedResponse, ServerResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import type { Bid } from '../src/bidfactory.js';

/**
 * nbads(NexBids) 适配器公开的竞价参数。
 */
export interface NbadsBidderParams {
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
    nbads: NbadsBidderParams;
  }
}

/**
 * 通过 `pbjs.setConfig({ nbads: { env: 'test' } })` 设置适配器配置。
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
    // 网关剥离并代发上游通知，客户端只在可计费时发送签名曝光地址。
    // ext.nexbids 属于网关协议，不随对外 bidder code 更名。
    // 视频和原生素材还携带同一个曝光地址，重复请求由网关去重。
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
  const params = bid.params || ({} as NbadsBidderParams);
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
  const groups: Record<string, BidRequest<typeof BIDDER_CODE>[]> = Object.create(null);
  const publisherIds: string[] = [];
  validBidRequests.forEach((bid) => {
    const key = bid.params.publisherId;
    if (!groups[key]) {
      groups[key] = [];
      publisherIds.push(key);
    }
    groups[key].push(bid);
  });
  return publisherIds.map((publisherId) => ({
    method: 'POST' as const,
    url: `${host}${AUCTION_PATH}?publisherId=${encodeURIComponent(publisherId)}`,
    data: converter.toORTB({ bidRequests: groups[publisherId], bidderRequest }),
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
    // 保活请求降低页面跳转时通知丢失的概率；同一出价由 Prebid 核心去重。
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
