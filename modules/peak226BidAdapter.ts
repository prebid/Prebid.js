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
