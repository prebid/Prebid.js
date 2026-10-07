import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, groupBy, isNumber, isStr, replaceAuctionPrice } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { CLIENT_SECTIONS, hasSection } from '../src/fpd/oneClient.js';

/**
 * Bidder parameters for the peak226 adapter.
 *
 * @typedef {Object} Peak226BidderParams
 * @property {string} [publisherId] Publisher account ID. Optional override for
 *   `{dooh|app|site}.publisher.id`, which can also be supplied through `ortb2` first party data.
 * @property {string} [placementId] Placement ID for this ad unit. Optional override for
 *   `imp.tagid`, which can also be supplied through `ortb2Imp`. `ortb2Imp.ext.gpid` is also
 *   accepted as a placement identifier for validity purposes when neither this param nor
 *   `ortb2Imp.tagid` is set.
 * @property {'us'|'eu'|'jp'} [region] Data center to route the request to. Defaults to `'us'`.
 */

const BIDDER_CODE = 'peak226';
const GVLID = 1202;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
const DEFAULT_REGION = 'us';
const ENDPOINTS = {
  us: 'https://us.a.viddea.com/edge_direct',
  eu: 'https://eu.a.viddea.com/edge_direct',
  jp: 'https://jp.a.viddea.com/edge_direct',
};

function isNonEmptyId(value) {
  return (typeof value === 'string' && value.length > 0) || isNumber(value);
}

// peak226 embeds ${AUCTION_PRICE} in pixel/tracker URLs anywhere inside a native response
// (observed so far in adm_native.eventtrackers[].url), and core has no macro-resolution path
// for native trackers, so walk the whole object rather than a fixed list of fields.
function resolveAuctionPriceDeep(value, price) {
  if (typeof value === 'string') {
    return replaceAuctionPrice(value, price);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveAuctionPriceDeep(entry, price));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolveAuctionPriceDeep(entry, price)]),
    );
  }
  return value;
}

// publisherId is an override for the standard ORTB `{dooh|app|site}.publisher.id`; when it is
// not given, the id the publisher put in ortb2 is used instead.
function getPublisherId(bid) {
  const fromParams = bid.params?.publisherId;
  if (isNonEmptyId(fromParams)) {
    return fromParams;
  }
  return CLIENT_SECTIONS.map((section) => deepAccess(bid.ortb2, `${section}.publisher.id`)).find(isNonEmptyId);
}

function getRegion(bid) {
  const region = bid.params?.region;
  return region && ENDPOINTS[region] ? region : DEFAULT_REGION;
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // placementId only overrides imp.tagid; ortb2Imp.tagid (merged in by the FPD processor)
    // stands on its own when the param is absent. ortb2Imp.ext.gpid also reaches imp.ext.gpid
    // via that same merge with no adapter-side handling needed here.
    const placementId = bidRequest.params?.placementId;
    if (isNonEmptyId(placementId)) {
      imp.tagid = String(placementId);
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    // every bid in a request shares the same publisherId (see buildRequests). Only an explicit
    // param needs writing - an id that came from ortb2 is already on the request.
    const publisherId = context.bidRequests[0]?.params?.publisherId;
    if (isNonEmptyId(publisherId)) {
      // onlyOneClient has already reduced these to a single section, so write to that one
      const section = CLIENT_SECTIONS.find((candidate) => hasSection(request, candidate)) ?? 'site';
      deepSetValue(request, `${section}.publisher.id`, String(publisherId));
    }
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // Native responses arrive in a non-standard `adm_native` field (an already-parsed ORTB
    // native object) instead of the OpenRTB-standard `adm` (a JSON string); map it over so
    // the default native processor (which only reads bid.adm) can pick it up.
    const admNative = bid.adm_native;
    if (!bid.adm && admNative) {
      // core's native processor accepts adm as either a JSON string or an already-parsed
      // object at runtime, even though the ORTB type only declares the string form.
      bid.adm = resolveAuctionPriceDeep(admNative, bid.price);
    }
    // peak226 returns ${AUCTION_PRICE} in markup and notice URLs; core only expands it in
    // banner markup at render time, so resolve it here for VAST, nurl and burl as well.
    if (isStr(bid.adm)) bid.adm = replaceAuctionPrice(bid.adm, bid.price);
    if (isStr(bid.nurl)) bid.nurl = replaceAuctionPrice(bid.nurl, bid.price);
    if (isStr(bid.burl)) bid.burl = replaceAuctionPrice(bid.burl, bid.price);
    return buildBidResponse(bid, context);
  },
});

// imp.ext.gpid (typically set by the gptPreAuction module) is a more broadly supported
// placement identifier than imp.tagid, so it also counts as a valid placement id here even
// though it never needs adapter-side handling to reach the request (see the imp() processor).
function getPlacementId(bid) {
  return bid.params?.placementId ?? bid.ortb2Imp?.tagid ?? deepAccess(bid.ortb2Imp, 'ext.gpid');
}

const isBidRequestValid = (bid) => {
  return isNonEmptyId(getPublisherId(bid)) && isNonEmptyId(getPlacementId(bid));
};

const buildRequests = (validBidRequests, bidderRequest) => {
  // region selects the endpoint and the publisher id is request-level
  // ({dooh|app|site}.publisher.id), so bids that differ on either must go out as separate
  // requests.
  const groups = groupBy(
    validBidRequests.map((bid) => ({ bid, key: `${getRegion(bid)}|${getPublisherId(bid)}` })),
    'key',
  );
  return Object.values(groups).map((group) => {
    const bidRequests = group.map(({ bid }) => bid);
    return {
      method: 'POST',
      url: ENDPOINTS[getRegion(bidRequests[0])],
      data: converter.toORTB({ bidRequests, bidderRequest }),
    };
  });
};

const interpretResponse = (serverResponse, request) => {
  if (!serverResponse?.body?.seatbid) {
    return [];
  }
  const response = converter.fromORTB({ request: request.data, response: serverResponse.body });
  return response.bids ?? [];
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
};

registerBidder(spec);
