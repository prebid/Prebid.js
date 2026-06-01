import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { triggerPixel, mergeDeep } from '../src/utils.js';

const BIDDER_CODE = 'floxis';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const DEFAULT_REGION = 'us-e';
const DEFAULT_PARTNER = BIDDER_CODE;
const SYNC_PATH = '/sync';

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

// IAB consent query params for the trackers /sync endpoint.
function buildConsentQuery(gdprConsent, uspConsent, gppConsent) {
  const query = [];
  if (gdprConsent) {
    query.push('gdpr=' + (gdprConsent.gdprApplies & 1));
    query.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
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

// Seat/region pairs from the latest buildRequests, consumed by getUserSyncs (which is not given params).
let syncTargets = [];

const CONVERTER = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.secure = bidRequest.ortb2Imp?.secure ?? 1;

    let floorInfo;
    if (typeof bidRequest.getFloor === 'function') {
      try {
        floorInfo = bidRequest.getFloor({
          currency: DEFAULT_CURRENCY,
          mediaType: '*',
          size: '*'
        });
      } catch (e) { }
    }
    const floor = floorInfo?.floor;
    const floorCur = floorInfo?.currency || DEFAULT_CURRENCY;
    if (typeof floor === 'number' && !isNaN(floor)) {
      imp.bidfloor = floor;
      imp.bidfloorcur = floorCur;
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
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
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    const seat = bid?.params?.seat;
    return typeof seat === 'string' && seat.length > 0;
  },

  buildRequests(validBidRequests = [], bidderRequest = {}) {
    syncTargets = [];
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
    syncTargets = groups
      .map((groupedBidRequests) => {
        const { seat, region } = groupedBidRequests[0].params;
        return { seat, region };
      })
      .filter((target) => isValidHostLabel(target.region));

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
    // Empty serverResponses => this adapter did not bid in this auction, so buildRequests was not
    // called and syncTargets would be stale from a prior auction. Consume the targets either way.
    const targets = syncTargets;
    syncTargets = [];
    if (!serverResponses || !serverResponses.length || !targets.length) return [];
    const pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    const query = buildConsentQuery(gdprConsent, uspConsent, gppConsent);
    const consentSuffix = query.length ? '&' + query.join('&') : '';
    const seen = {};
    const syncs = [];
    targets.forEach(({ seat, region }) => {
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

  onBidWon(bid) {
    if (bid.burl) {
      triggerPixel(bid.burl);
    }
    if (bid.nurl) {
      triggerPixel(bid.nurl);
    }
  }
};

registerBidder(spec);
