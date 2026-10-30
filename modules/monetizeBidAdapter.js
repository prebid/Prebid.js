import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { deepSetValue, isArray, isNumber, isStr, logWarn } from '../src/utils.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { resolveResponseMediaType } from '../libraries/ortb2Utils/mediaType.js';

/**
 * @typedef {import('./monetizeBidAdapter.d.ts').MonetizeBidderParams} MonetizeBidderParams
 */

const BIDDER_CODE = 'monetize';
const ADAPTER_VERSION = '1.0.0';
const DEFAULT_HOST = 'rtb.monetize.site';
const ENDPOINT_PATH = '/ssp?z=';
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const DEFAULT_TTL = 500;
const MAX_TTL = 5000;
const DEFAULT_CURRENCY = 'USD';

const getBidderConfig = (key) => config.getConfig(`${BIDDER_CODE}.${key}`);

/**
 * Returns the zone id as a non-empty string, or undefined when it is missing or malformed.
 */
function normalizeZoneId(zoneID) {
  if (isNumber(zoneID) && zoneID > 0) {
    return String(zoneID);
  }
  if (isStr(zoneID) && zoneID.trim() !== '') {
    return zoneID.trim();
  }
}

/**
 * Returns the floor as a non-negative number, or undefined when it is missing or malformed.
 */
function normalizeBidfloor(bidfloor) {
  const value = isStr(bidfloor) && bidfloor.trim() !== '' ? Number(bidfloor) : bidfloor;
  if (isNumber(value) && isFinite(value) && value >= 0) {
    return value;
  }
}

/**
 * Returns an upper-cased ISO 4217 code, or undefined when it is missing or malformed.
 */
function normalizeCurrency(cur) {
  if (isStr(cur) && /^[a-z]{3}$/i.test(cur.trim())) {
    return cur.trim().toUpperCase();
  }
}

/**
 * Returns a lower-cased hostname, or undefined when it is missing or not a bare hostname.
 */
function normalizeMirror(mirror) {
  if (isStr(mirror) && HOSTNAME_RE.test(mirror.trim())) {
    return mirror.trim().toLowerCase();
  }
}

/**
 * A per-bid `params.mirror` wins over the `endpoint` config, which wins over the default host.
 */
function getEndpoint(params) {
  const mirror = normalizeMirror(params.mirror);
  if (mirror) {
    return `https://${mirror}${ENDPOINT_PATH}`;
  }
  return getBidderConfig('endpoint') || `https://${DEFAULT_HOST}${ENDPOINT_PATH}`;
}

function getTtl() {
  const ttl = getBidderConfig('ttl');
  return isNumber(ttl) && ttl > 0 && ttl <= MAX_TTL ? ttl : DEFAULT_TTL;
}

/**
 * Scopes floor lookups to the ad unit's media type when it declares exactly one.
 */
function getMediaTypeContext(bidRequest) {
  const types = Object.keys(bidRequest.mediaTypes || {});
  return types.length === 1 ? { mediaType: types[0] } : {};
}

const converter = ortbConverter({
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
    if (bid.mtype == null) {
      context.mediaType = resolveResponseMediaType(bid, context.imp);
    }
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.ttl = getTtl();
    return bidResponse;
  },
});

function appendConsentParams(url, gdprConsent, uspConsent, gppConsent) {
  const params = [];
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

const SYNC_TYPES = {
  image: 'image',
  img: 'image',
  iframe: 'iframe',
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    const params = bid?.params || {};
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
      method: 'POST',
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
    return converter.fromORTB({ response: serverResponse.body, request: request.data }).bids;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];
    (serverResponses || []).forEach((response) => {
      const pixels = response?.body?.ext?.pixels;
      if (!isArray(pixels)) {
        return;
      }
      pixels.forEach(([kind, url]) => {
        const type = SYNC_TYPES[String(kind).toLowerCase()];
        const enabled = type === 'image' ? syncOptions.pixelEnabled : type === 'iframe' && syncOptions.iframeEnabled;
        if (enabled && isStr(url) && url.startsWith('https://')) {
          syncs.push({ type, url: appendConsentParams(url, gdprConsent, uspConsent, gppConsent) });
        }
      });
    });
    return syncs;
  },
};

registerBidder(spec);
