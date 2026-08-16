import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { type Bid } from '../src/bidfactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { logWarn } from '../src/utils.js';

/**
 * Prebid.js adapter for the Epom Ad Server — the supply side of the Epom
 * platform, where a publisher's own direct campaigns live.
 *
 * Epom is white-label: every network runs its own deployment under its own
 * domain, so the serving host is a per-bid parameter (`params.host`) rather
 * than a module constant. Only the host varies — the path is fixed, so a
 * page config can never redirect the auction payload to an arbitrary URL.
 *
 * Not to be confused with `epom_dsp`, which is the demand side: it buys
 * impressions. This adapter sells a publisher's inventory.
 */

const BIDDER_CODE = 'epom_as';
const GVLID = 849;
const BID_PATH = '/hb/bid';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;

/** Hostnames only — no scheme, no path, no port, no credentials. */
const HOST_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export type EpomAsBidParams = {
  /** Serving host of the publisher's Epom deployment, e.g. `ads.example.com`. */
  host: string;
  /** Opaque placement identifier from the Epom invocation-code tab. */
  placementKey: string;
  /** Optional CPM floor, used only when the Price Floors module supplies none. */
  bidFloor?: number;
  /** Currency of `bidFloor`. Defaults to USD. */
  bidFloorCur?: string;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: EpomAsBidParams;
  }
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
    mediaType: BANNER,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const params = bidRequest.params;

    // The placement travels as `imp.tagid` rather than in an ext object so a
    // single request can carry a different placement per impression. It is
    // per-imp data and therefore cannot live in the URL — see buildRequests.
    imp.tagid = params.placementKey;

    // Honour a manual floor only when the Price Floors module has not already
    // resolved one; the module's value is always the more informed of the two.
    if (imp.bidfloor == null && params.bidFloor != null) {
      imp.bidfloor = Number(params.bidFloor);
      imp.bidfloorcur = params.bidFloorCur || DEFAULT_CURRENCY;
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    if (!request.cur || request.cur.length === 0) {
      request.cur = [DEFAULT_CURRENCY];
    }
    return request;
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    const params = bid?.params;
    if (!params?.host || typeof params.host !== 'string' || !HOST_PATTERN.test(params.host)) {
      logWarn(`${BIDDER_CODE}: params.host must be a bare hostname, e.g. "ads.example.com".`);
      return false;
    }
    if (!params?.placementKey || typeof params.placementKey !== 'string') {
      logWarn(`${BIDDER_CODE}: params.placementKey is required.`);
      return false;
    }
    return true;
  },

  /**
   * One request per host, carrying every impression that belongs to it.
   *
   * Prebid runs a single auction for the whole page, so `validBidRequests`
   * arrives with one entry per ad unit. Batching them into one OpenRTB
   * request with N `imp` objects is what lets the ad server resolve the page
   * as a unit — its roadblock and one-campaign-per-page rules only hold when
   * every slot is decided together. Emitting one request per ad unit would
   * make those rules race each other.
   *
   * Grouping is by host because a page may legitimately mix two Epom
   * deployments. Taking the host from the first bid instead would silently
   * route the remaining impressions to the wrong network.
   */
  buildRequests(validBidRequests, bidderRequest) {
    if (!validBidRequests?.length) {
      return [];
    }

    const byHost = new Map<string, typeof validBidRequests>();
    validBidRequests.forEach((bid) => {
      const host = bid.params.host;
      let group = byHost.get(host);
      if (!group) {
        group = [] as unknown as typeof validBidRequests;
        byHost.set(host, group);
      }
      group.push(bid);
    });

    const requests = [];
    byHost.forEach((group, host) => {
      requests.push({
        method: 'POST',
        url: `https://${host}${BID_PATH}`,
        data: converter.toORTB({ bidRequests: group, bidderRequest }),
        // `text/plain` keeps this a simple cross-origin request, so the
        // browser skips the CORS preflight — one round-trip inside the
        // auction timeout instead of two. The body is still JSON.
        options: { contentType: 'text/plain', withCredentials: false },
      });
    });

    return requests;
  },

  interpretResponse(serverResponse, request) {
    if (!serverResponse?.body) {
      return [];
    }
    return (converter.fromORTB({
      response: serverResponse.body,
      request: request.data,
    }) as { bids: Bid[] }).bids;
  },
};

registerBidder(spec);
