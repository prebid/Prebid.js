import { deepAccess, deepClone, deepSetValue, isStr, triggerPixel } from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

/** @typedef {import('./holidBidAdapter.d.ts').HolidBidderParams} HolidBidderParams */

const ENDPOINT = 'https://helloworld.holid.io/openrtb2/auction';
const COOKIE_SYNC_ENDPOINT = 'https://null.holid.io/sync.html';
const DEFAULT_TTL = 300;

function resolveTmax(bid, bidderRequest) {
  const values = [bid.params.tmax, bidderRequest.timeout].map(Number)
    .filter(value => Number.isFinite(value) && value >= 1);
  return values.length ? Math.floor(Math.min(...values)) : undefined;
}

function setStoredRequest(target, bid) {
  deepSetValue(target, 'ext.prebid.storedrequest.id', String(bid.params.adUnitID));
}

function validFloor(floor) {
  return typeof floor === 'number' && Number.isFinite(floor) && floor >= 0;
}

const converter = ortbConverter({
  context: { netRevenue: true, ttl: DEFAULT_TTL, mediaType: BANNER, currency: 'USD' },
  imp(buildImp, bid, context) {
    const imp = buildImp(bid, context);
    setStoredRequest(imp, bid);
    // Price Floors' converter processors populate bidfloor/bidfloorcur when enabled.
    // Preserve an explicit ortb2Imp floor; legacy params are only a fallback.
    if (!validFloor(imp.bidfloor) && validFloor(bid.params.floor)) {
      imp.bidfloor = bid.params.floor;
      imp.bidfloorcur = bid.params.floorCurrency || 'USD';
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const bid = context.bidRequests[0];
    setStoredRequest(request, bid);
    request.id = bidderRequest.bidderRequestId;
    // Keep one request per stored-request configuration; do not combine site/alias settings.
    const tmax = resolveTmax(bid, bidderRequest);
    if (tmax !== undefined) request.tmax = tmax;
    else delete request.tmax;

    const gdpr = bidderRequest.gdprConsent;
    if (typeof gdpr?.gdprApplies === 'boolean') {
      deepSetValue(request, 'regs.ext.gdpr', gdpr.gdprApplies ? 1 : 0);
      // Do not leave contradictory legacy and ORTB 2.6 signals.
      deepSetValue(request, 'regs.gdpr', gdpr.gdprApplies ? 1 : 0);
    }
    if (isStr(gdpr?.consentString)) deepSetValue(request, 'user.ext.consent', gdpr.consentString);
    const gpp = bidderRequest.gppConsent;
    if (isStr(gpp?.gppString)) deepSetValue(request, 'regs.gpp', gpp.gppString);
    if (Array.isArray(gpp?.applicableSections)) deepSetValue(request, 'regs.gpp_sid', deepClone(gpp.applicableSections));
    if (isStr(bidderRequest.usPrivacy)) deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.usPrivacy);
    if (bid.userIdAsEids) deepSetValue(request, 'user.ext.eids', deepClone(bid.userIdAsEids));
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (!Number.isFinite(bid.price) || bid.price <= 0 ||
        !(bid.w > 0 && bid.h > 0) || (!bid.adm && !bid.nurl) ||
        (bid.exp !== undefined && (!Number.isFinite(bid.exp) || bid.exp <= 0))) return;
    const response = buildBidResponse(bid, context);
    response.meta = { ...deepClone(deepAccess(bid, 'ext.prebid.meta', {})), ...response.meta };
    const domains = Array.isArray(bid.adomain) ? bid.adomain
      .filter(isStr).map(domain => domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, ''))
      .filter(Boolean) : [];
    if (domains.length) response.meta.advertiserDomains = domains;
    // Carry the URL on the bid itself: losing bids cannot overwrite it and there is no page-global map.
    const win = deepAccess(bid, 'ext.prebid.events.win');
    if (isStr(win) && win) response.holidWinUrl = win;
    return response;
  }
});

export const spec = {
  code: 'holid',
  gvlid: 1177,
  supportedMediaTypes: [BANNER],
  isBidRequestValid(bid) {
    const id = bid?.params?.adUnitID;
    return (isStr(id) && id.trim().length > 0) || (Number.isSafeInteger(id) && id > 0);
  },
  buildRequests(validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      // Converter expects request-level ortb2; older integrations attach it to each bid.
      // Clone before conversion, including nested objects, so publisher data stays immutable.
      const request = { ...bidderRequest, ortb2: deepClone(bid.ortb2 ?? bidderRequest.ortb2 ?? {}) };
      const normalizedBid = {
        ...bid,
        ortb2Imp: deepClone(bid.ortb2Imp || {}),
        mediaTypes: { banner: { ...bid.mediaTypes?.banner, sizes: bid.mediaTypes?.banner?.sizes || bid.sizes } }
      };
      const ortbRequest = converter.toORTB({ bidRequests: [normalizedBid], bidderRequest: request });
      return { method: 'POST', url: ENDPOINT, data: JSON.stringify(ortbRequest), bidId: bid.bidId, ortbRequest };
    });
  },
  interpretResponse(serverResponse, request) {
    if (!Array.isArray(serverResponse?.body?.seatbid) || !request?.ortbRequest) return [];
    // Ignore malformed seats/bids without losing other valid bids.
    const body = {
      ...serverResponse.body,
      seatbid: serverResponse.body.seatbid
        .filter(seat => Array.isArray(seat?.bid))
        .map(seat => ({ ...seat, bid: seat.bid.filter(bid => bid && typeof bid === 'object') }))
    };
    const bids = converter.fromORTB({ request: request.ortbRequest, response: body }).bids;
    const winners = new Map();
    bids.forEach(bid => {
      if (!winners.has(bid.requestId) || bid.cpm > winners.get(bid.requestId).cpm) winners.set(bid.requestId, bid);
    });
    return [...winners.values()];
  },
  getUserSyncs(options, responses, gdprConsent, usPrivacy, gppConsent) {
    if (!options.iframeEnabled) return [];
    const bidders = new Set();
    (Array.isArray(responses) ? responses : [responses]).forEach(response => {
      Object.keys(deepAccess(response, 'body.ext.responsetimemillis', {}) || {}).forEach(bidder => bidders.add(bidder));
      const seats = response?.body?.seatbid;
      if (Array.isArray(seats)) seats.forEach(seat => { if (isStr(seat?.seat) && seat.seat) bidders.add(seat.seat); });
    });
    if (!bidders.size) return [];
    const params = { bidders: JSON.stringify([...bidders]) };
    // Unknown is not equivalent to GDPR not applying.
    if (typeof gdprConsent?.gdprApplies === 'boolean') params.gdpr = gdprConsent.gdprApplies ? 1 : 0;
    if (isStr(gdprConsent?.consentString)) params.gdpr_consent = gdprConsent.consentString;
    // Support the existing live bridge and the corrected PBS /cookie_sync name.
    if (isStr(usPrivacy)) { params.us_privacy = usPrivacy; params.usp_consent = usPrivacy; }
    if (isStr(gppConsent?.gppString)) params.gpp = gppConsent.gppString;
    if (Array.isArray(gppConsent?.applicableSections)) params.gpp_sid = JSON.stringify(gppConsent.applicableSections);
    params.type = 'iframe';
    return [{
      type: 'iframe',
      url: COOKIE_SYNC_ENDPOINT + '?' + Object.entries(params)
        .map(([key, value]) => key + '=' + encodeURIComponent(value)).join('&')
    }];
  },
  onBidWon(bid) {
    if (isStr(bid.holidWinUrl) && bid.holidWinUrl) {
      const url = bid.holidWinUrl;
      delete bid.holidWinUrl;
      triggerPixel(url);
    }
  }
};

registerBidder(spec);
