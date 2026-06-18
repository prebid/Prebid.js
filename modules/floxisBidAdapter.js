import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { triggerPixel, politeTriggerPixel, mergeDeep, replaceAuctionPrice } from '../src/utils.js';

const BIDDER_CODE = 'floxis';
const GVLID = 1609;
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const DEFAULT_REGION = 'us-e';
const DEFAULT_PARTNER = BIDDER_CODE;
const SYNC_PATH = '/sync';
// Server-echo user-sync: the /pbjs response carries seat + region in this header (on bid and no-bid
// alike), so getUserSyncs derives sync targets from serverResponses statelessly — no module state that
// could leak across concurrent auctions. Absent header (older backend) => no sync, a safe no-op.
const SYNC_HEADER = 'x-floxis-sync';

// partner/region are interpolated into the request host, so they must be valid DNS labels —
// otherwise a value with URL delimiters (e.g. 'evil.com/x?') would change the request origin.
const HOST_LABEL_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
function isValidHostLabel(label) {
  return typeof label === 'string' && HOST_LABEL_REGEX.test(label);
}

// Bidding host: the supply partner's regional subdomain (floxis itself has no partner prefix).
function getBidHost(region, partner) {
  if (!isValidHostLabel(region) || !isValidHostLabel(partner)) return null;
  return partner === BIDDER_CODE
    ? `${region}.floxis.tech`
    : `${partner}-${region}.floxis.tech`;
}

function getEndpointUrl(seat, region, partner) {
  const host = getBidHost(region, partner);
  return host ? `https://${host}/pbjs?seat=${encodeURIComponent(seat)}` : null;
}

// Cookie-sync host is Floxis-operated and region-scoped (px-<region>.floxis.tech), independent of
// the partner subdomain used for bidding. The trackers /sync endpoint resolves seat -> supply partner.
function getSyncHost(region) {
  return isValidHostLabel(region) ? `https://px-${region}.floxis.tech` : null;
}

// Telemetry event host is pinned to px-us-e regardless of bid region. Only us-e is provisioned;
// a beacon to an unprovisioned host would lose the very signal meant to catch misconfiguration.
// SHIPPING-INTENT: switch to region-derived host (getSyncHost(region)) when px-eu and px-apac are provisioned.
const TELEMETRY_HOST = 'https://px-us-e.floxis.tech';
const TELEMETRY_PATH = '/event';

// Assemble an event-beacon URL. consentSuffix is a pre-built '&k=v&...' string (may be empty).
// extras is a plain object of optional dimension key→value pairs; falsy values are omitted.
function buildEventUrl(eventType, { seat, region }, extras, consentSuffix) {
  const base = `${TELEMETRY_HOST}${TELEMETRY_PATH}?event=${encodeURIComponent(eventType)}&seat=${encodeURIComponent(seat)}&region=${encodeURIComponent(region)}`;
  const extraParams = Object.entries(extras)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return base + (extraParams ? '&' + extraParams : '') + consentSuffix;
}

// IAB consent query params for the trackers /sync endpoint.
function buildConsentQuery(gdprConsent, uspConsent, gppConsent) {
  const query = [];
  if (gdprConsent) {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      query.push('gdpr=' + Number(gdprConsent.gdprApplies));
    }
    if (gdprConsent.consentString) {
      query.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString));
    }
  }
  if (uspConsent) {
    query.push('us_privacy=' + encodeURIComponent(uspConsent));
  }
  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    query.push('gpp=' + encodeURIComponent(gppConsent.gppString));
    query.push('gpp_sid=' + encodeURIComponent(gppConsent.applicableSections.join(',')));
  }
  return query;
}

function normalizeBidParams(params = {}) {
  return {
    seat: params.seat,
    region: params.region || DEFAULT_REGION,
    partner: params.partner || DEFAULT_PARTNER
  };
}

// Parse the server-echoed sync header (`seat=<seat>&region=<label>`) into a sync target. Returns null
// for an absent or malformed header so a response without it simply contributes no sync.
function parseSyncHeader(headerValue) {
  if (typeof headerValue !== 'string' || !headerValue) return null;
  const params = new URLSearchParams(headerValue);
  const seat = params.get('seat');
  const region = params.get('region');
  if (!seat || !isValidHostLabel(region)) return null;
  return { seat, region };
}

const CONVERTER = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY,
    nativeRequest: { eventtrackers: [{ event: 1, methods: [1, 2] }] }
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.secure = bidRequest.ortb2Imp?.secure ?? 1;

    // The priceFloors processor already sets imp.bidfloor when the module is active; only fill a
    // floor here when it left none — from getFloor (ignoring 0, which would clobber an FPD floor)
    // or a static params.bidFloor fallback for bundles without the floors module.
    if (!imp.bidfloor) {
      let floor;
      let floorCur = DEFAULT_CURRENCY;
      if (typeof bidRequest.getFloor === 'function') {
        try {
          const floorInfo = bidRequest.getFloor({ currency: DEFAULT_CURRENCY, mediaType: '*', size: '*' });
          if (floorInfo && typeof floorInfo.floor === 'number' && floorInfo.floor > 0) {
            floor = floorInfo.floor;
            floorCur = floorInfo.currency || DEFAULT_CURRENCY;
          }
        } catch (e) { }
      }
      if (floor === undefined && bidRequest.params?.bidFloor > 0) {
        floor = parseFloat(bidRequest.params.bidFloor);
        floorCur = bidRequest.params.bidFloorCur || DEFAULT_CURRENCY;
      }
      if (floor !== undefined) {
        imp.bidfloor = floor;
        imp.bidfloorcur = floorCur;
      }
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    if (!req.cur) {
      req.cur = [DEFAULT_CURRENCY];
    }
    mergeDeep(req, {
      at: 1,
      ext: {
        prebid: {
          adapter: BIDDER_CODE,
          version: '$prebid.version$'
        }
      }
    });
    return req;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    const ext = bid.ext || {};
    bidResponse.meta = bidResponse.meta || {};
    if (ext.dspid != null) bidResponse.meta.networkId = ext.dspid;
    if (ext.advertiser_name) bidResponse.meta.advertiserName = ext.advertiser_name;
    if (ext.agency_name) bidResponse.meta.agencyName = ext.agency_name;
    if (ext.agency_id) bidResponse.meta.agencyId = ext.agency_id;
    if (bidResponse.mediaType) bidResponse.meta.mediaType = bidResponse.mediaType;
    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    const seat = bid?.params?.seat;
    return typeof seat === 'string' && seat.length > 0;
  },

  buildRequests(validBidRequests = [], bidderRequest = {}) {
    if (!validBidRequests.length) return [];
    const filteredBidRequests = validBidRequests.filter((bidRequest) => spec.isBidRequestValid(bidRequest));
    if (!filteredBidRequests.length) return [];

    const bidRequestsByParams = filteredBidRequests.reduce((groups, bidRequest) => {
      const { seat, region, partner } = normalizeBidParams(bidRequest.params);
      const key = `${seat}|${region}|${partner}`;
      groups[key] = groups[key] || [];
      groups[key].push({
        ...bidRequest,
        params: {
          ...bidRequest.params,
          seat,
          region,
          partner
        }
      });
      return groups;
    }, {});

    const groups = Object.values(bidRequestsByParams);

    return groups.map((groupedBidRequests) => {
      const { seat, region, partner } = groupedBidRequests[0].params;
      const url = getEndpointUrl(seat, region, partner);
      if (!url) return null;
      return {
        method: 'POST',
        url,
        data: CONVERTER.toORTB({ bidRequests: groupedBidRequests, bidderRequest }),
        options: {
          withCredentials: true,
          contentType: 'text/plain'
        }
      };
    }).filter(Boolean);
  },

  interpretResponse(response, request) {
    if (!response?.body || !request?.data) return [];
    return CONVERTER.fromORTB({ request: request.data, response: response.body })?.bids || [];
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) return [];
    if (!serverResponses || !serverResponses.length) return [];
    const pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    const query = buildConsentQuery(gdprConsent, uspConsent, gppConsent);
    const consentSuffix = query.length ? '&' + query.join('&') : '';
    const seen = {};
    const syncs = [];
    serverResponses.forEach((serverResponse) => {
      const target = parseSyncHeader(serverResponse?.headers?.get?.(SYNC_HEADER));
      if (!target) return;
      const { seat, region } = target;
      const host = getSyncHost(region);
      const key = `${seat}|${region}`;
      if (!host || seen[key]) return;
      seen[key] = true;
      syncs.push({
        type: pixelType,
        url: `${host}${SYNC_PATH}?seat=${encodeURIComponent(seat)}${consentSuffix}`
      });
    });
    return syncs;
  },

  onBidBillable(bid) {
    // Fire the DSP billing notice on billing (which respects bidViewability's deferral), substituting
    // the cleared price into the ${AUCTION_PRICE} macro. originalCpm is pre-currency-conversion.
    if (bid.burl) {
      triggerPixel(replaceAuctionPrice(bid.burl, bid.originalCpm || bid.cpm));
    }
  },

  onTimeout(timeoutData) {
    // Report client-observed auction timeouts as cookieless operational telemetry.
    // One beacon per distinct (seat, region); no consent exposed in timeout entries.
    try {
      if (!Array.isArray(timeoutData)) return;
      const seen = {};
      timeoutData.forEach((entry) => {
        const { seat, region } = normalizeBidParams(entry.params);
        if (!seat) return;
        const key = `${seat}|${region}`;
        if (seen[key]) return;
        seen[key] = true;
        const extras = {
          ...(entry.timeout != null ? { duration: entry.timeout } : {}),
          ...(entry.auctionId != null ? { auctionId: entry.auctionId } : {})
        };
        // 'omit' keeps this beacon cookieless — the px-us-e sync cookie never rides along.
        politeTriggerPixel(buildEventUrl('timeout', { seat, region }, extras, ''), 'omit');
      });
    } catch (e) { }
  },

  onBidderError({ error, bidderRequest }) {
    // Report client-observed bidder transport errors as cookieless operational telemetry.
    // One beacon per distinct (seat, region); status/timedout are constant across the call.
    try {
      const bids = bidderRequest?.bids;
      if (!Array.isArray(bids)) return;
      const status = error?.status != null ? error.status : undefined;
      const timedout = error?.timedOut ? 1 : 0;
      const auctionId = bidderRequest?.auctionId;
      // domain (not page): refererInfo.page carries the location query string, which can hold
      // identifiers — the domain is enough to know which publisher errored and keeps the beacon identifier-free.
      const puburl = bidderRequest?.refererInfo?.domain;
      const consentQuery = buildConsentQuery(
        bidderRequest?.gdprConsent,
        bidderRequest?.uspConsent,
        bidderRequest?.gppConsent
      );
      const consentSuffix = consentQuery.length ? '&' + consentQuery.join('&') : '';
      const seen = {};
      bids.forEach((bid) => {
        const { seat, region } = normalizeBidParams(bid.params);
        if (!seat) return;
        const key = `${seat}|${region}`;
        if (seen[key]) return;
        seen[key] = true;
        const extras = {
          ...(status != null ? { status } : {}),
          timedout,
          ...(auctionId != null ? { auctionId } : {}),
          ...(puburl ? { puburl } : {})
        };
        politeTriggerPixel(buildEventUrl('bidder-error', { seat, region }, extras, consentSuffix), 'omit');
      });
    } catch (e) { }
  }
};

registerBidder(spec);
