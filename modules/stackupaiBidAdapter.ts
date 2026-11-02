import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { noCredsAjax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { buildUrl, logWarn, parseUrl } from '../src/utils.js';

export interface StackupaiBidParams {
  /**
   * Supply tag ID assigned to this ad placement.
   */
  tag: string;
}

export interface StackupaiConfig {
  /**
   * Overrides the auction endpoint.
   */
  endpoint?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: StackupaiBidParams;
  }
}

declare module '../src/config' {
  interface Config {
    [BIDDER_CODE]?: StackupaiConfig;
  }
}

const BIDDER_CODE = 'stackupai';
const ALLOWED_DOMAIN = 'stackup-ai.com';
const DEFAULT_ENDPOINT = `https://adserver.${ALLOWED_DOMAIN}/openrtb2/auction`;
const DEFAULT_TTL = 300;
const TAG_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
// Upper bound on bids in one timeout report.
const MAX_TIMEOUT_BIDS = 20;
const MAX_BID_ID_LENGTH = 64;

// pbsExtensions places the bidder params at imp.ext.prebid.bidder.stackupai.
const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
  },
  processors: pbsExtensions,
});

const resolveEndpoint = (): string => {
  const endpoint = config.getConfig(BIDDER_CODE)?.endpoint;
  if (endpoint == null) {
    return DEFAULT_ENDPOINT;
  }
  if (typeof endpoint !== 'string' || !isAllowedEndpoint(endpoint)) {
    logWarn(`${BIDDER_CODE}: ignoring endpoint override "${endpoint}", it must be an https URL on ${ALLOWED_DOMAIN}`);
    return DEFAULT_ENDPOINT;
  }
  return endpoint;
};

// Overrides may only point at StackUp's own hosts, over HTTPS.
const isAllowedEndpoint = (endpoint: string): boolean => {
  const { protocol, hostname } = parseUrl(endpoint, { noDecodeWholeURL: true });
  return protocol === 'https' &&
    (hostname === ALLOWED_DOMAIN || hostname.endsWith(`.${ALLOWED_DOMAIN}`));
};

// Timeout reports go to `events.` + the endpoint's host,
// so timeout reports follow the endpoint and its per-environment override.
const resolveTimeoutUrl = (): string => {
  const { protocol, host } = parseUrl(resolveEndpoint(), { noDecodeWholeURL: true });
  return buildUrl({ protocol, host: `events.${host}`, pathname: '/e/timeout' });
};

const isBidRequestValid: BidderSpec<typeof BIDDER_CODE>['isBidRequestValid'] = (request) => {
  const tag = request.params?.tag;
  if (typeof tag !== 'string' || !TAG_PATTERN.test(tag)) {
    logWarn(`${BIDDER_CODE}: params.tag must match ${TAG_PATTERN}, got`, tag);
    return false;
  }
  return true;
};

// One request per auction: every valid ad unit becomes an imp of a single
// OpenRTB request.
const buildRequests: BidderSpec<typeof BIDDER_CODE>['buildRequests'] = (validBidRequests, bidderRequest) => {
  const data = converter.toORTB({
    bidRequests: validBidRequests,
    bidderRequest,
  });

  return {
    url: resolveEndpoint(),
    method: 'POST',
    data,
  };
};

const interpretResponse: BidderSpec<typeof BIDDER_CODE>['interpretResponse'] = (serverResponse, request) => {
  if (!serverResponse?.body) {
    return [];
  }
  // OpenRTB defaults a missing response cur to USD; without it Prebid rejects the bids.
  return converter.fromORTB({
    response: { ...serverResponse.body, cur: serverResponse.body.cur || 'USD' },
    request: request.data,
  });
};

// Before calling onTimeout, Prebid replaces a timed-out bid's params with every
// stackupai params object in its ad unit (adapterManager.callTimedOutBidders), so
// the bid's own tag is only known when they all name the same one.
const timedOutTag = (params: unknown): string | undefined => {
  const all: any[] = Array.isArray(params) ? params : [params];
  const tags = new Set(all.map((p) => p?.tag));
  const [tag] = tags;
  return tags.size === 1 && typeof tag === 'string' && TAG_PATTERN.test(tag) ? tag : undefined;
};

// Only the browser knows our response missed the auction, so it reports the
// timed-out bids to StackUp: one keepalive POST per auction, never read and
// sent without credentials (navigator.sendBeacon would attach cookies).
const onTimeout: BidderSpec<typeof BIDDER_CODE>['onTimeout'] = (timedOutBids) => {
  const timeout = Math.round(Number(timedOutBids?.[0]?.timeout));
  if (!(timeout > 0)) {
    return;
  }
  const bids = timedOutBids
    .filter(({ bidId }) => typeof bidId === 'string' && bidId.length > 0 && bidId.length <= MAX_BID_ID_LENGTH)
    .slice(0, MAX_TIMEOUT_BIDS)
    .map(({ bidId, params }) => {
      const tag = timedOutTag(params);
      return tag ? { id: bidId, tag } : { id: bidId };
    });
  if (bids.length === 0) {
    return;
  }

  const url = resolveTimeoutUrl();
  const body = JSON.stringify({ v: 1, tmo: timeout, bids });
  noCredsAjax(url, undefined, body, { method: 'POST', contentType: 'text/plain', keepalive: true });
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onTimeout,
};

registerBidder(spec);
