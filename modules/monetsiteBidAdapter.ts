import { type BidderSpec, type ExtendedResponse, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE, type MediaType } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { deepSetValue, isArray, logWarn } from '../src/utils.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { resolveResponseMediaType } from '../libraries/ortb2Utils/mediaType.js';

const BIDDER_CODE = 'monetsite';
const ADAPTER_VERSION = '1.0.0';
const DEFAULT_HOST = 'rtb.monetize.site';
const ENDPOINT_PATH = '/ssp?z=';
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const DEFAULT_TTL = 500;
const MAX_TTL = 5000;
const DEFAULT_CURRENCY = 'USD';

export interface MonetsiteBidderParams {
  /**
   * Zone id provided by Monetize.site. Sent in the endpoint URL (`?z=`) and as `imp.tagid`.
   */
  zoneID: string | number;
  /**
   * Impression floor, used when the Price Floors module provides none. Defaults to 0.
   */
  bidfloor?: number;
  /**
   * ISO 4217 currency of `bidfloor`. Defaults to `USD`.
   */
  cur?: string;
  /**
   * Hostname to send the bid request to instead of the default `rtb.monetize.site`, e.g. `rtb.example.com`.
   * Always called over https; takes precedence over the `endpoint` config.
   */
  mirror?: string;
}

export interface MonetsiteConfig {
  /**
   * Endpoint override, e.g. `https://rtb.example.com/ssp?z=`; the zone id is appended.
   * A per-bid `params.mirror` takes precedence.
   */
  endpoint?: string;
  /**
   * Bid TTL in seconds, `0 < ttl <= 5000`. Defaults to 500.
   */
  ttl?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: MonetsiteBidderParams;
  }
}

declare module '../src/config' {
  interface Config {
    [BIDDER_CODE]?: MonetsiteConfig;
  }
}

type SyncType = 'image' | 'iframe';

const SYNC_TYPES: Record<string, SyncType> = {
  image: 'image',
  img: 'image',
  iframe: 'iframe',
};

const getBidderConfig = (): MonetsiteConfig => config.getConfig(BIDDER_CODE) || {};

/**
 * Returns the zone id as a non-empty string, or undefined when it is missing or malformed.
 */
function normalizeZoneId(zoneID: unknown): string | undefined {
  if (typeof zoneID === 'number' && zoneID > 0) {
    return String(zoneID);
  }
  if (typeof zoneID === 'string' && zoneID.trim() !== '') {
    return zoneID.trim();
  }
}

/**
 * Returns the floor as a non-negative number, or undefined when it is missing or malformed.
 */
function normalizeBidfloor(bidfloor: unknown): number | undefined {
  const value = typeof bidfloor === 'string' && bidfloor.trim() !== '' ? Number(bidfloor) : bidfloor;
  if (typeof value === 'number' && isFinite(value) && value >= 0) {
    return value;
  }
}

/**
 * Returns an upper-cased ISO 4217 code, or undefined when it is missing or malformed.
 */
function normalizeCurrency(cur: unknown): string | undefined {
  if (typeof cur === 'string' && /^[a-z]{3}$/i.test(cur.trim())) {
    return cur.trim().toUpperCase();
  }
}

/**
 * Returns a lower-cased hostname, or undefined when it is missing or not a bare hostname.
 */
function normalizeMirror(mirror: unknown): string | undefined {
  if (typeof mirror === 'string' && HOSTNAME_RE.test(mirror.trim())) {
    return mirror.trim().toLowerCase();
  }
}

/**
 * A per-bid `params.mirror` wins over the `endpoint` config, which wins over the default host.
 */
function getEndpoint(params: MonetsiteBidderParams): string {
  const mirror = normalizeMirror(params.mirror);
  if (mirror) {
    return `https://${mirror}${ENDPOINT_PATH}`;
  }
  return getBidderConfig().endpoint || `https://${DEFAULT_HOST}${ENDPOINT_PATH}`;
}

function getTtl(): number {
  const { ttl } = getBidderConfig();
  return typeof ttl === 'number' && ttl > 0 && ttl <= MAX_TTL ? ttl : DEFAULT_TTL;
}

/**
 * Scopes floor lookups to the ad unit's media type when it declares exactly one.
 */
function getMediaTypeContext(bidRequest: { mediaTypes?: object }): { mediaType?: MediaType } {
  const types = Object.keys(bidRequest.mediaTypes || {}) as MediaType[];
  return types.length === 1 ? { mediaType: types[0] } : {};
}

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { zoneID, bidfloor, cur } = bidRequest.params;
    imp.tagid = normalizeZoneId(zoneID);
    // a floor from the Price Floors module wins; otherwise use the ad unit params, defaulting to 0
    if (imp.bidfloor == null) {
      imp.bidfloor = normalizeBidfloor(bidfloor) ?? 0;
      imp.bidfloorcur = normalizeCurrency(cur) || DEFAULT_CURRENCY;
    }
    deepSetValue(imp, 'ext.adUnitCode', bidRequest.adUnitCode);
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.cur = [imps.find((imp) => imp.bidfloorcur)?.bidfloorcur || DEFAULT_CURRENCY];
    deepSetValue(request, 'source.ext.hb', 1);
    deepSetValue(request, 'source.ext.adapterver', ADAPTER_VERSION);
    deepSetValue(request, 'source.ext.prebidjsver', '$prebid.version$');
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    // the imp context is shared by every bid on the same impid, so keep the inferred type per bid
    const bidContext = bid.mtype == null
      ? { ...context, mediaType: resolveResponseMediaType(bid, context.imp) }
      : context;
    const bidResponse = buildBidResponse(bid, bidContext);
    bidResponse.ttl = getTtl();
    return bidResponse;
  },
});

function appendConsentParams(url: string, gdprConsent, uspConsent, gppConsent): string {
  const params: string[] = [];
  if (gdprConsent) {
    params.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
    params.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`);
  }
  if (uspConsent) {
    params.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
  }
  if (gppConsent?.gppString && gppConsent.applicableSections?.length) {
    params.push(`gpp=${encodeURIComponent(gppConsent.gppString)}`);
    params.push(`gpp_sid=${encodeURIComponent(gppConsent.applicableSections.join(','))}`);
  }
  if (!params.length) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}${params.join('&')}`;
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    const params: Partial<MonetsiteBidderParams> = bid?.params || {};
    if (normalizeZoneId(params.zoneID) === undefined) {
      logWarn(`${BIDDER_CODE}: params.zoneID is required and must be a non-empty string or a positive number`);
      return false;
    }
    if (params.bidfloor != null && normalizeBidfloor(params.bidfloor) === undefined) {
      logWarn(`${BIDDER_CODE}: params.bidfloor must be a non-negative number`);
      return false;
    }
    if (params.cur != null && normalizeCurrency(params.cur) === undefined) {
      logWarn(`${BIDDER_CODE}: params.cur must be a 3-letter ISO 4217 currency code`);
      return false;
    }
    if (params.mirror != null && normalizeMirror(params.mirror) === undefined) {
      logWarn(`${BIDDER_CODE}: params.mirror must be a hostname, e.g. 'rtb.example.com'`);
      return false;
    }
    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const options = {
      // the endpoint rejects any other content type (nbr 2, "wrong content-type")
      contentType: 'application/json',
      withCredentials: hasPurpose1Consent(bidderRequest.gdprConsent),
    };

    // the zone id is part of the endpoint URL, so every bid gets its own request
    return validBidRequests.map((bidRequest) => ({
      method: 'POST' as const,
      url: `${getEndpoint(bidRequest.params)}${encodeURIComponent(normalizeZoneId(bidRequest.params.zoneID))}`,
      data: converter.toORTB({
        bidRequests: [bidRequest],
        bidderRequest,
        context: getMediaTypeContext(bidRequest),
      }),
      options,
    }));
  },

  interpretResponse(serverResponse, request) {
    if (!isArray(serverResponse?.body?.seatbid)) {
      return [];
    }
    return (converter.fromORTB({ response: serverResponse.body, request: request.data }) as ExtendedResponse).bids;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent, coppa) {
    // no identifier syncs on child-directed traffic
    if (coppa) {
      return [];
    }
    const syncs: { type: SyncType; url: string }[] = [];
    // one request per bid means the same pixels can come back in several responses
    const seen = new Set<string>();
    (serverResponses || []).forEach((response) => {
      const pixels = response?.body?.ext?.pixels;
      if (!isArray(pixels)) {
        return;
      }
      pixels.forEach(([kind, url]) => {
        const type = SYNC_TYPES[String(kind).toLowerCase()];
        const enabled = type === 'image' ? syncOptions.pixelEnabled : type === 'iframe' && syncOptions.iframeEnabled;
        const key = `${type}|${url}`;
        if (enabled && typeof url === 'string' && url.startsWith('https://') && !seen.has(key)) {
          seen.add(key);
          syncs.push({ type, url: appendConsentParams(url, gdprConsent, uspConsent, gppConsent) });
        }
      });
    });
    return syncs;
  },
};

registerBidder(spec);
