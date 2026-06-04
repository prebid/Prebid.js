import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepAccess, deepSetValue, logError } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
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
    // Stash impid → mediaType so interpretResponse can stamp bid.mtype
    // before ortbConverter classifies the response. Built from the
    // original Prebid bidRequests (always populated) rather than the
    // OpenRTB imp (imp.native isn't materialised unless the host build
    // includes Prebid's native module).
    const impMtype = {};
    for (const bid of bidRequests) {
      const mt = bid.mediaTypes || {};
      impMtype[bid.bidId] = mt.native ? MTYPE_NATIVE : MTYPE_BANNER;
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
    // Realry's endpoint emits plain openrtb2.Bid without mtype — without
    // this fix-up ortbConverter.fromORTB drops every bid because it
    // can't classify the media type.
    const impMtype = request.impMtype || {};
    for (const seat of response.body.seatbid) {
      for (const bid of (seat.bid || [])) {
        if (bid.mtype == null) {
          bid.mtype = impMtype[bid.impid] || MTYPE_BANNER;
        }
      }
    }
    return converter.fromORTB({ response: response.body, request: request.data }).bids;
  },
};

registerBidder(spec);
