import { type AdapterRequest, type ExtendedResponse, type ServerResponse, type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, logInfo } from '../src/utils.js';
import { CLIENT_SECTIONS, hasSection } from '../src/fpd/oneClient.js';
import type { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import type { ORTBRequest } from '../src/types/ortb/request.d.ts';
import type { Currency } from '../src/types/common.d.ts';
import type { MediaType } from '../src/mediaTypes.js';

/**
 * PubFuture bidder adapter (oRTB 2.x).
 *
 * Note: the endpoint is intentionally NOT publisher-configurable — Prebid
 * module rules forbid endpoint override via params.
 */

const BIDDER_CODE = 'pubfuture';
const ENDPOINT = 'https://ortb2.pubstar-ad.com/v1/bid'; // production exchange URL
const DEFAULT_CURRENCY: Currency = 'USD';
const DEFAULT_TTL = 300;
// PubFuture's server-recognized test ad unit — always returns a canned
// isTestAd creative regardless of the publisher's real inventory.
const TEST_AD_UNIT_ID = '1247/99228313862_68e5e38e1a65f400287e6845';

/**
 * PubFuture bidder-specific parameters, supplied on each ad unit's `bids[].params`. These are the
 * adapter's public interface; everything else (sizes, video config, consent, first-party data) is
 * read from standard ad-unit / ORTB2 fields by the ORTB converter rather than from params.
 */
export interface PubfutureBidParamsBase {
  /** PubFuture publisher account id; mapped to `site.publisher.id`. */
  publisherId?: string;
  /**
   * CPM floor, USD; mapped to `imp.bidfloor`/`imp.bidfloorcur` (used only when the priceFloors
   * module hasn't already set a dynamic floor).
   */
  bidfloor?: number;
}

/** Real ad unit: `adUnitId` is required, `test` is absent or explicitly `false`. */
export interface PubfutureLiveBidParams extends PubfutureBidParamsBase {
  /** PubFuture ad unit / placement id; mapped to `imp.tagid`. */
  adUnitId: string;
  test?: false;
}

/**
 * Test/demo ad: `test: true` swaps in the well-known test ad unit and flags the
 * oRTB request as non-billable (`test: 1`).
 *
 * `adUnitId` stays optional rather than `never` so a publisher can flip an
 * existing live placement into test mode without deleting the id — the adapter
 * accepts that and simply ignores the value.
 */
export interface PubfutureTestBidParams extends PubfutureBidParamsBase {
  test: true;
  /** Ignored while `test` is true; the well-known test ad unit is sent instead. */
  adUnitId?: string;
}

export type PubfutureBidParams = PubfutureLiveBidParams | PubfutureTestBidParams;

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: PubfutureBidParams;
  }
}

type PubfutureBidRequest = BidRequest<typeof BIDDER_CODE>;

/**
 * The adapter's own additions to the converter context, passed through
 * `toORTB({ context })`. The converter types `context` with an index signature
 * of `unknown`, so these are read back through this type rather than inline.
 */
type PubfutureContext = {
  publisherId?: string;
  isTest?: boolean;
  currency?: Currency;
  mediaType?: MediaType;
};

/**
 * The floors module's per-bid method. It is attached at runtime by
 * `modules/priceFloors.js` and so is absent from the core `BidRequest` type;
 * declaring the shape here keeps the call site typed without pretending every
 * bid request has it.
 */
type FloorsModuleBid = {
  getFloor?: (params: {
    currency: Currency;
    mediaType: MediaType | '*';
    size: [number, number] | '*';
  }) => { floor?: number | string; currency?: Currency } | undefined;
};

/**
 * True when `params.bidfloor` is a floor that can legally go on the wire.
 *
 * `typeof x === 'number'` is not enough: NaN and Infinity are numbers that
 * `JSON.stringify` turns into `null`, and a negative floor is not meaningful.
 */
function isValidFloor(bidfloor: unknown): bidfloor is number {
  return typeof bidfloor === 'number' && isFinite(bidfloor) && bidfloor >= 0;
}

/**
 * True when the priceFloors module supplies a dynamic floor for this bid.
 *
 * `imp.bidfloor` being set is not sufficient to tell: the converter's fpd
 * processor also copies `ortb2Imp.bidfloor` into it, and those two sources
 * rank differently against `params.bidfloor` — a floors-module result outranks
 * the param, while generic ortb2 request data is exactly what the param exists
 * to override. Mirrors the validity check in priceFloors' own `tryGetFloor`.
 */
function hasFloorsModuleFloor(bidRequest: PubfutureBidRequest, context: PubfutureContext): boolean {
  const getFloor = (bidRequest as PubfutureBidRequest & FloorsModuleBid).getFloor;
  if (typeof getFloor !== 'function') {
    return false;
  }
  try {
    const floor = getFloor.call(bidRequest, {
      currency: context?.currency || DEFAULT_CURRENCY,
      mediaType: context?.mediaType || '*',
      size: '*',
    });
    return floor?.currency != null && !!floor.floor && !isNaN(parseFloat(String(floor.floor)));
  } catch (e) {
    // A publisher-supplied getFloor that throws must not break the auction.
    return false;
  }
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // Strict `=== true`, matching isBidRequestValid() and buildRequests(): a
    // truthy non-boolean (e.g. the string 'false') would otherwise swap in the
    // test placement here while buildRequests() still grouped the bid as live,
    // sending a canned test creative as billable traffic — and dropping the
    // publisher's real adUnitId in the process.
    imp.tagid = bidRequest.params.test === true ? TEST_AD_UNIT_ID : bidRequest.params.adUnitId;
    // Floor precedence: priceFloors module > params.bidfloor > ortb2Imp.
    // The module's dynamic floor must not be clobbered by a stale static
    // param, but an ortb2Imp.bidfloor inherited through the converter's fpd
    // processor must yield to the param — overriding generic request data is
    // precisely what bidder params are for.
    // The value must also be a usable floor: NaN and Infinity serialize to
    // `null` and a negative floor is meaningless, so a typo in the publisher's
    // config would otherwise put an invalid bidfloor on the wire — and since
    // imps are grouped, that can cost the whole request rather than one imp.
    // An unusable param is ignored, leaving whatever the request already had.
    if (isValidFloor(bidRequest.params.bidfloor) && !hasFloorsModuleFloor(bidRequest, context as PubfutureContext)) {
      imp.bidfloor = bidRequest.params.bidfloor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const { publisherId, isTest } = context as PubfutureContext;
    if (publisherId) {
      // Write into whichever client section the converter kept: `dooh`, `app`
      // and `site` are mutually exclusive, and the converter's onlyOneClient
      // processor has already dropped the others by this point. Always
      // targeting `site` would resurrect it on app/dooh inventory, producing a
      // request with two client sections that the exchange may reject or
      // misclassify. Falls back to `site` for a plain web request where the
      // publisher supplied no ortb2 client section at all.
      const section = CLIENT_SECTIONS.find((s) => hasSection(request, s)) || 'site';
      deepSetValue(request, `${section}.publisher.id`, publisherId);
    }
    if (isTest) {
      // Standard oRTB signal: this auction is non-billable/test traffic.
      request.test = 1;
    }
    deepSetValue(request, 'ext.pubfuture.adapterVersion', '1.0.0');
    return request;
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bid) {
    if (bid?.params?.test === true) {
      return true; // adUnitId is ignored/optional in test mode
    }
    return typeof bid?.params?.adUnitId === 'string' && bid.params.adUnitId.length > 0;
  },

  buildRequests(validBidRequests: PubfutureBidRequest[], bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>): AdapterRequest[] {
    // `test` and `publisher.id` are both request-wide oRTB fields, so bids that
    // disagree on either cannot share a request: one `params.test` bid would
    // mark every co-bid live imp as non-billable, and only the first bid's
    // `params.publisherId` would be applied, silently sending the rest under
    // the wrong account. Group by both, then emit one request per group — a
    // typical auction is homogeneous and still produces a single request.
    const groups = new Map<string, { bidRequests: PubfutureBidRequest[]; isTest: boolean; publisherId?: string }>();
    validBidRequests.forEach((bidRequest) => {
      const isTest = bidRequest.params.test === true;
      const publisherId = bidRequest.params.publisherId;
      const key = `${isTest}|${publisherId ?? ''}`;
      if (!groups.has(key)) {
        groups.set(key, { bidRequests: [], isTest, publisherId });
      }
      groups.get(key).bidRequests.push(bidRequest);
    });

    return Array.from(groups.values()).map(({ bidRequests, isTest, publisherId }) => {
      const data = converter.toORTB({
        bidRequests,
        bidderRequest,
        context: { publisherId, isTest } satisfies PubfutureContext,
      });
      logInfo(`[pubfuture] auction -> ${ENDPOINT}`, data);
      return {
        method: 'POST' as const,
        url: ENDPOINT,
        data,
        // No explicit contentType: Prebid defaults to `text/plain`, which is a
        // CORS-safelisted request content type, so the browser skips the
        // OPTIONS preflight and saves a round trip on every auction. The
        // gateway parses the JSON body regardless of the header.
        options: { withCredentials: false },
      };
    });
  },

  interpretResponse(serverResponse: ServerResponse, request: AdapterRequest) {
    if (!serverResponse?.body?.seatbid) {
      return [];
    }
    return (converter.fromORTB({
      response: serverResponse.body,
      request: request.data as ORTBRequest,
    }) as ExtendedResponse).bids;
  },

  getUserSyncs() {
    // No cookie sync yet; add iframe/pixel syncs here when the server supports them.
    return [];
  },
};

registerBidder(spec);
