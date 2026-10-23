import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ORTB_MTYPES } from '../libraries/ortbConverter/processors/mediaType.js';
import { config } from '../src/config.js';
import { politeTriggerPixel, replaceAuctionPrice } from '../src/utils.js';

const BIDDER_CODE = 'silvermob';
const GVLID = 1058;
const DEFAULT_HOST = 'us';
const AD_URL = 'https://{HOST}.silvermob.com/marketplace/api/dsp/prebidjs/{ZONEID}';
const SYNC_URL = 'https://{HOST}.silvermob.com/marketplace/api/dsp/prebidjs/sync';
const TTL = 300;
const HOST_RE = /^[a-z0-9-]{1,32}$/i;
const ZONE_RE = /^\d+$/;

// host -> zoneid seen in the latest auction. The sync endpoint resolves the publisher by zone,
// and getUserSyncs does not receive bid params.
const syncZones = new Map();

function getHost(params) {
  return params.host || DEFAULT_HOST;
}

function withHost(template, host) {
  return template.replace('{HOST}', host);
}

function toQueryString(params) {
  return Object.keys(params).map((key) => `${key}=${encodeURIComponent(params[key])}`).join('&');
}

/**
 * The endpoint does not always set ORTB 2.6 `mtype`. Derive the media type from the imp
 * (unambiguous for single-format ad units) and, for multi-format, from the markup.
 */
function mediaTypeFromImp(imp, bid) {
  const types = [BANNER, VIDEO, NATIVE].filter((type) => imp && imp[type]);
  if (types.length === 1) return types[0];
  const adm = (bid.adm || '').trim();
  if (types.includes(VIDEO) && /^(<\?xml|<VAST)/i.test(adm)) return VIDEO;
  if (types.includes(NATIVE) && adm.startsWith('{')) return NATIVE;
  if (types.includes(BANNER)) return BANNER;
  return types[0];
}

/**
 * Native markup usually comes wrapped as `{"native": {...}}` (OpenRTB Native 1.x); the converter expects
 * the inner response object.
 */
function unwrapNativeAdm(adm) {
  let parsed = adm;
  if (typeof adm === 'string') {
    try {
      parsed = JSON.parse(adm);
    } catch (e) {
      return adm;
    }
  }
  if (parsed && typeof parsed === 'object' && parsed.native && !parsed.assets) return parsed.native;
  return parsed;
}

function sendNotice(url, bid) {
  if (typeof url !== 'string' || !url) return;
  politeTriggerPixel(replaceAuctionPrice(url, bid.originalCpm || bid.cpm));
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TTL
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp.bidfloor) imp.bidfloor = bidRequest.params.bidfloor || 0;
    imp.ext = Object.assign({}, imp.ext, {
      [BIDDER_CODE]: {
        zoneid: bidRequest.params.zoneid,
        host: getHost(bidRequest.params),
      }
    });
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bid = context.bidRequests[0];
    request.test = config.getConfig('debug') ? 1 : 0;
    if (!request.cur) request.cur = [bid.params.currency || 'USD'];
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // The imp context is shared between responses, so fill in the bid's mtype rather than context.mediaType.
    if (!context.mediaType && !ORTB_MTYPES.hasOwnProperty(bid.mtype)) {
      const mediaType = mediaTypeFromImp(context.imp, bid);
      const mtype = Object.keys(ORTB_MTYPES).find((key) => ORTB_MTYPES[key] === mediaType);
      if (mtype) bid.mtype = Number(mtype);
    }
    if ((context.mediaType || ORTB_MTYPES[bid.mtype]) === NATIVE) {
      bid.adm = unwrapNativeAdm(bid.adm);
    }
    const bidResponse = buildBidResponse(bid, context);
    // The endpoint may deliver its win notice in `nurl`. For banners the converter already embeds it as a
    // tracking pixel in `ad`; for inline video / native markup keep it for onBidWon instead of treating it
    // as a VAST location.
    if (bid.nurl && bid.adm && bidResponse.mediaType !== BANNER) {
      bidResponse.nurl = bid.nurl;
      if (bidResponse.vastUrl === bid.nurl) delete bidResponse.vastUrl;
    }
    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    const params = (bid && bid.params) || {};
    return Boolean(bid && bid.bidId) &&
      ZONE_RE.test(String(params.zoneid == null ? '' : params.zoneid)) &&
      (params.host == null || HOST_RE.test(String(params.host)));
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    if (!validBidRequests || validBidRequests.length === 0) return [];

    // One request per endpoint: the zone is part of the URL, so ad units on different zones
    // (or data centers) cannot share a request.
    const groups = new Map();
    validBidRequests.forEach((bidRequest) => {
      const host = getHost(bidRequest.params);
      const zoneid = String(bidRequest.params.zoneid);
      const key = `${host}|${zoneid}`;
      if (!groups.has(key)) groups.set(key, { host, zoneid, bidRequests: [] });
      groups.get(key).bidRequests.push(bidRequest);
      syncZones.set(host, zoneid);
    });

    return Array.from(groups.values()).map(({ host, zoneid, bidRequests }) => ({
      method: 'POST',
      url: withHost(AD_URL, host).replace('{ZONEID}', zoneid),
      data: converter.toORTB({ bidRequests, bidderRequest })
    }));
  },

  interpretResponse: (response, request) => {
    if (response && response.body) {
      return converter.fromORTB({ response: response.body, request: request.data }).bids;
    }
    return [];
  },

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
    const type = syncOptions.iframeEnabled ? 'iframe' : (syncOptions.pixelEnabled ? 'image' : null);
    if (!type || syncZones.size === 0) return [];

    const params = {};
    if (gdprConsent) {
      params.gdpr = gdprConsent.gdprApplies ? 1 : 0;
      params.gdpr_consent = gdprConsent.consentString || '';
    }
    if (uspConsent) params.us_privacy = uspConsent;
    if (gppConsent && gppConsent.gppString) {
      params.gpp = gppConsent.gppString;
      params.gpp_sid = (gppConsent.applicableSections || []).join(',');
    }

    return Array.from(syncZones.entries()).map(([host, zoneid]) => ({
      type,
      url: `${withHost(SYNC_URL, host)}?${toQueryString(Object.assign({ zoneid, host }, params))}`
    }));
  },

  onBidWon: (bid) => {
    sendNotice(bid.nurl, bid);
  },

  // Billing is deferred by core when the publisher sets `adUnit.deferBilling`, so `burl` must not fire on win.
  onBidBillable: (bid) => {
    sendNotice(bid.burl, bid);
  }
};

registerBidder(spec);
