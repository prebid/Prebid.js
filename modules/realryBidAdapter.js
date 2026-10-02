import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepAccess, deepSetValue, logError } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('./realryBidAdapter.d.ts').RealryBidderParams} RealryBidderParams
 * @typedef {BidRequest & { params: RealryBidderParams }} RealryBidRequest
 *
 * Realry is a commerce DSP focused on luxury-fashion product listings. The
 * adapter forwards Prebid.js bid requests as OpenRTB 2.6 to
 * https://bid.realry.com/bid/openrtb. Native imps are returned as Native 1.2
 * admObject JSON; banner imps are returned as HTML markup wrapping a product
 * image inside a click anchor.
 */

const BIDDER_CODE = 'realry';
const ENDPOINT = 'https://bid.realry.com/bid/openrtb';
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

const converter = ortbConverter({
  context: { netRevenue: true, ttl: DEFAULT_TTL, currency: DEFAULT_CURRENCY },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // tagid: explicit placementId param overrides ad unit code so realry-side
    // reporting can dice traffic per publisher slot regardless of how the
    // publisher names their adUnitCode internally.
    imp.tagid = bidRequest.params.placementId || bidRequest.adUnitCode;
    // GPID passthrough — helps publisher-side dedup + realry's matcher.
    const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
    if (gpid) deepSetValue(imp, 'ext.gpid', gpid);
    // sellerId pinning: when the publisher has been onboarded against a
    // specific realry advertiser (rare, partnerships-team-assigned), forward
    // it inline so the matcher can pre-filter.
    if (bidRequest.params.sellerId) {
      deepSetValue(imp, 'ext.realry.sellerId', String(bidRequest.params.sellerId));
    }
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    deepSetValue(req, 'ext.prebid.channel', { name: 'pbjs', version: '$prebid.version$' });
    return req;
  },

});

// MTYPE_BANNER / MTYPE_NATIVE — openrtb2 BidMtype values. Realry's endpoint
// emits plain openrtb2.Bid without mtype, so the adapter infers it from
// the matching imp BEFORE handing the response to ortbConverter.
const MTYPE_BANNER = 1;
const MTYPE_NATIVE = 4;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

  isBidRequestValid(bid) {
    if (!bid || !bid.params || !bid.params.placementId) {
      logError('realry: params.placementId is required on every bid');
      return false;
    }
    return true;
  },

  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests, bidderRequest });
    // Stash impid → expected mtype so interpretResponse can stamp
    // bid.mtype before ortbConverter classifies the response. Realry's
    // endpoint emits plain openrtb2.Bid without mtype, so without this
    // fix-up fromORTB drops every bid.
    //
    // Single-format imps: lock the answer (banner-only → BANNER,
    // native-only → NATIVE). Multi-format imps: leave null and defer
    // to adm-shape sniffing in interpretResponse — the server picks
    // banner or native per bid and pre-deciding here would route
    // banner HTML to the native processor (and vice versa).
    const impMtype = {};
    for (const bid of bidRequests) {
      const mt = bid.mediaTypes || {};
      const hasNative = !!mt.native;
      const hasBanner = !!mt.banner;
      if (hasNative && !hasBanner) impMtype[bid.bidId] = MTYPE_NATIVE;
      else if (hasBanner && !hasNative) impMtype[bid.bidId] = MTYPE_BANNER;
      else impMtype[bid.bidId] = null; // multi-format → sniff from adm
    }
    return [{
      method: 'POST',
      url: ENDPOINT,
      data,
      options: { withCredentials: true },
      impMtype,
    }];
  },

  interpretResponse(response, request) {
    if (!response || !response.body || !response.body.seatbid) return [];
    const impMtype = request.impMtype || {};
    for (const seat of response.body.seatbid) {
      for (const bid of (seat.bid || [])) {
        if (bid.mtype == null) {
          const locked = impMtype[bid.impid];
          bid.mtype = (locked != null) ? locked : sniffMtypeFromAdm(bid.adm);
        }
      }
    }
    return converter.fromORTB({ response: response.body, request: request.data }).bids;
  },
};

// sniffMtypeFromAdm picks banner vs native for multi-format imps by
// inspecting the adm shape: Realry's bidder emits a Native 1.2 admObject
// as JSON ('{...}') for native fills and HTML ('<a ...>') for banner
// fills. Anything else (empty / unrecognised) falls back to banner —
// banner's renderer is more forgiving than native's, so misrouting a
// truly-native bid is preferable to misrouting a banner one.
function sniffMtypeFromAdm(adm) {
  if (typeof adm !== 'string') return MTYPE_BANNER;
  const t = adm.trimStart();
  if (t.charAt(0) === '{') return MTYPE_NATIVE;
  return MTYPE_BANNER;
}

registerBidder(spec);
