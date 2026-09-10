import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { type Bid } from '../src/bidfactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, isPlainObject } from '../src/utils.js';

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
/**
 * A bid cached longer than the ad server accepts its impression beacon renders without being
 * counted, so this is deliberately short. It is only the floor: a deployment configured with a
 * wider window says so per bid in `bid.exp`, which overrides this.
 */
const DEFAULT_TTL = 25;

/**
 * Hostname with an optional port — no scheme, path, query, fragment or userinfo, so a page
 * configuration cannot redirect the payload. The shape is the expression Prebid Server validates
 * the same parameter with (`util/urlutil/security.go`, and the `host` property of the epom_as
 * params schema), so a bid this adapter accepts is one that server also accepts. Single-label
 * hosts are deliberately allowed: an internal deployment reachable as `api-us` is a legitimate
 * configuration on both transports.
 */
const HOST_PATTERN = /^[a-zA-Z0-9.-]+(?::(\d{1,5}))?$/;
const MAX_PORT = 65535;

/**
 * The port is range-checked on top of the shape. Out of range, `new URL()` throws rather than
 * returning something unusable, and buildRequests is not called inside a try — one mistyped port
 * in a page's configuration would take the whole request down instead of costing one bid.
 */
function isUsableHost(host: unknown): boolean {
  if (typeof host !== 'string') {
    return false;
  }
  const match = HOST_PATTERN.exec(host);
  if (match == null) {
    return false;
  }
  const port = match[1];
  return port === undefined || (Number(port) >= 1 && Number(port) <= MAX_PORT);
}

export type EpomAsBidParams = {
  /** Serving host of the publisher's Epom deployment, e.g. `ads.example.com`. */
  host: string;
  /** Opaque placement identifier from the Epom invocation-code tab. */
  placementKey: string;
  /** Epom channel — a traffic-slice label used for targeting and reporting. */
  channel?: string;
  /** Epom custom parameters, for custom targeting and creative macros. */
  customParams?: Record<string, string | number | boolean>;
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

/**
 * The values the ad server can key targeting on. A nested object or an array stringifies to
 * something no campaign can ever match, so it is rejected as a misconfiguration in
 * `isBidRequestValid` rather than quietly sent — which is also what the Prebid Server params
 * schema does with the same input.
 */
function isTargetableScalar(value: unknown): boolean {
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

/**
 * Stringify every entry — the ad server compares custom parameters as strings, so sending
 * `2` and `"2"` differently would make an otherwise identical campaign match one and not
 * the other. Nothing is dropped: the caps the ad server applies on ingest are its own, and
 * silently discarding keys here would leave a publisher with no signal that half their
 * targeting never arrived.
 */
function sanitiseCustomParams(
  raw: EpomAsBidParams['customParams']
): Record<string, string> | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const keys = Object.keys(raw);
  if (keys.length === 0) {
    return null;
  }
  const out: Record<string, string> = {};
  keys.forEach((key) => {
    out[key] = String(raw[key]);
  });
  return out;
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
    // No mediaType here on purpose: pinning one makes the converter believe every
    // response whatever the ad server sent. Left off, it reads `mtype` off the bid,
    // which is the field the ad server sets per creative — and a bid that names no
    // media type is discarded rather than rendered as the wrong one.
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
    // A floor of 0 is "no floor" and is left off the wire entirely.
    if (imp.bidfloor == null && typeof params.bidFloor === 'number' && params.bidFloor > 0) {
      imp.bidfloor = params.bidFloor;
      imp.bidfloorcur = params.bidFloorCur || DEFAULT_CURRENCY;
    }

    if (params.channel) {
      deepSetValue(imp, `ext.${BIDDER_CODE}.channel`, String(params.channel));
    }

    // Custom parameters go to imp.ext.data, the standard first-party-data home, so
    // that RTD modules and gptPreAuction contribute to the same object rather than
    // to a private one the ad server would have to read twice. Anything already on
    // the impression wins — first-party data is the more authoritative source.
    const custom = sanitiseCustomParams(params.customParams);
    if (custom) {
      imp.ext = imp.ext || {};
      imp.ext.data = { ...custom, ...(imp.ext.data as object) };
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
  // Device-storage disclosure for the Epom identity cookie. The adapter itself
  // uses no storage manager and writes nothing — the cookie is set by the ad
  // server on its own domain and only reaches the auction because the POST is
  // credentialed (see buildRequests).
  disclosureURL: 'https://epom.com/deviceStorage.json',
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Only the bidder's own parameters are checked, and each check is the client-side
   * twin of the Prebid Server params schema — a bid rejected here is an imp that
   * server would reject too. Core already logs the rejection, so nothing is logged.
   */
  isBidRequestValid(bid) {
    const params = bid?.params;
    if (!isUsableHost(params?.host)) {
      return false;
    }
    if (typeof params.placementKey !== 'string' || params.placementKey.length === 0) {
      return false;
    }
    if (params.customParams !== undefined &&
      (!isPlainObject(params.customParams) || !Object.values(params.customParams).every(isTargetableScalar))) {
      return false;
    }
    if (params.bidFloor !== undefined &&
      (typeof params.bidFloor !== 'number' || !isFinite(params.bidFloor) || params.bidFloor < 0)) {
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

    const byHost = new Map<string, (typeof validBidRequests)[number][]>();
    validBidRequests.forEach((bid) => {
      const group = byHost.get(bid.params.host);
      if (group) {
        group.push(bid);
      } else {
        byHost.set(bid.params.host, [bid]);
      }
    });

    return Array.from(byHost, ([host, group]) => ({
      method: 'POST' as const,
      url: `https://${host}${BID_PATH}`,
      data: converter.toORTB({ bidRequests: group, bidderRequest }),
      // Both options are already core's defaults for an adapter POST
      // (src/adapters/bidderFactory), and are pinned here so a change to those
      // defaults cannot break either one silently. `text/plain` keeps this a
      // simple cross-origin request, so the browser skips the CORS preflight —
      // one round-trip inside the auction timeout instead of two; the body is
      // still JSON. Credentials are sent because the ad server answers with the
      // request's own Origin, which is what lets an existing Epom identity
      // reach the auction.
      options: { contentType: 'text/plain', withCredentials: true },
    }));
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

  // The ad server matches on its own first-party cookie and offers no
  // cross-domain sync endpoint, so there is deliberately nothing to register.
  getUserSyncs: () => [],
};

registerBidder(spec);
