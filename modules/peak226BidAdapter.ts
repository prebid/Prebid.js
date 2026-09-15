import { registerBidder } from '../src/adapters/bidderFactory.js';
import type { BidderSpec, ExtendedResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest } from '../src/adapterManager.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, groupBy, isNumber, isStr, replaceAuctionPrice } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

type Peak226Region = 'us' | 'eu' | 'jp';

/**
 * Bidder parameters for the peak226 adapter.
 */
export interface Peak226BidderParams {
  /**
   * Publisher account ID.
   */
  publisherId: string;
  /**
   * Placement ID for this ad unit.
   */
  placementId: string;
  /**
   * Data center to route the request to. Defaults to `'us'`.
   */
  region?: Peak226Region;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: Peak226BidderParams;
  }
}

const BIDDER_CODE = 'peak226';
const GVLID = 1202;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
const DEFAULT_REGION: Peak226Region = 'us';
const ENDPOINTS: Record<Peak226Region, string> = {
  us: 'https://us.a.viddea.com/edge_direct',
  eu: 'https://eu.a.viddea.com/edge_direct',
  jp: 'https://jp.a.viddea.com/edge_direct',
};

type Peak226BidRequest = BidRequest<typeof BIDDER_CODE>;

function isNonEmptyId(value: unknown): boolean {
  return (typeof value === 'string' && value.length > 0) || isNumber(value);
}

// peak226 embeds ${AUCTION_PRICE} in pixel/tracker URLs anywhere inside a native response
// (observed so far in adm_native.eventtrackers[].url), and core has no macro-resolution path
// for native trackers, so walk the whole object rather than a fixed list of fields.
function resolveAuctionPriceDeep<T>(value: T, price: number): T {
  if (typeof value === 'string') {
    return replaceAuctionPrice(value, price) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveAuctionPriceDeep(entry, price)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, resolveAuctionPriceDeep(entry, price)]),
    ) as T;
  }
  return value;
}

function getRegion(bid: Peak226BidRequest): Peak226Region {
  const region = bid.params?.region;
  return region && ENDPOINTS[region] ? region : DEFAULT_REGION;
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = String(bidRequest.params.placementId);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    // every bid in a request shares the same publisherId (see buildRequests)
    const publisherId = context.bidRequests[0]?.params?.publisherId;
    if (isNonEmptyId(publisherId)) {
      deepSetValue(request, `${request.app ? 'app' : 'site'}.publisher.id`, String(publisherId));
    }
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // Native responses arrive in a non-standard `adm_native` field (an already-parsed ORTB
    // native object) instead of the OpenRTB-standard `adm` (a JSON string); map it over so
    // the default native processor (which only reads bid.adm) can pick it up.
    const admNative = (bid as unknown as { adm_native?: unknown }).adm_native;
    if (!bid.adm && admNative) {
      // core's native processor accepts adm as either a JSON string or an already-parsed
      // object at runtime, even though the ORTB type only declares the string form.
      bid.adm = resolveAuctionPriceDeep(admNative, bid.price) as unknown as string;
    }
    // peak226 returns ${AUCTION_PRICE} in markup and notice URLs; core only expands it in
    // banner markup at render time, so resolve it here for VAST, nurl and burl as well.
    if (isStr(bid.adm)) bid.adm = replaceAuctionPrice(bid.adm, bid.price);
    if (isStr(bid.nurl)) bid.nurl = replaceAuctionPrice(bid.nurl, bid.price);
    if (isStr(bid.burl)) bid.burl = replaceAuctionPrice(bid.burl, bid.price);
    return buildBidResponse(bid, context);
  },
});

const isBidRequestValid: BidderSpec<typeof BIDDER_CODE>['isBidRequestValid'] = (bid) => {
  const { publisherId, placementId } = bid.params ?? ({} as Partial<Peak226BidderParams>);
  return isNonEmptyId(publisherId) && isNonEmptyId(placementId);
};

const buildRequests: BidderSpec<typeof BIDDER_CODE>['buildRequests'] = (validBidRequests, bidderRequest) => {
  // region selects the endpoint and publisherId is request-level (site/app.publisher.id),
  // so bids that differ on either must go out as separate requests.
  const groups: Record<string, Array<{ bid: Peak226BidRequest }>> = groupBy(
    validBidRequests.map((bid) => ({ bid, key: `${getRegion(bid)}|${bid.params.publisherId}` })),
    'key',
  );
  return Object.values(groups).map((group) => {
    const bidRequests = group.map(({ bid }) => bid);
    return {
      method: 'POST' as const,
      url: ENDPOINTS[getRegion(bidRequests[0])],
      data: converter.toORTB({ bidRequests, bidderRequest }),
    };
  });
};

const interpretResponse: BidderSpec<typeof BIDDER_CODE>['interpretResponse'] = (serverResponse, request) => {
  if (!serverResponse?.body?.seatbid) {
    return [];
  }
  const response = converter.fromORTB({ request: request.data, response: serverResponse.body }) as ExtendedResponse;
  return response.bids ?? [];
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
};

registerBidder(spec);
