// Railu bid adapter for Prebid.js. Formats: banner, video (instream and outstream), native. No cookies, no user syncs.
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { buildOrtbRequests, interpretOrtbResponse, RAILU_ENDPOINT } from '../libraries/railuUtils/bidUtils.js';

/**
 * @typedef {import('./railuBidAdapter.d.ts').RailuBidParams} RailuBidParams
 */

const BIDDER_CODE = 'railu';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  // Every Prebid ad unit with a banner, video or native mediaType is valid; `params` are all optional:
  //   tid      the seller's public tag ID (Connect your supply): the request counts as the seller's on its own domains
  //   source   optional source label
  //   domain   the property (when refererInfo cannot see it)
  //   segments / signals   the seller's declared first-party segments and signal ids for this impression
  //   format   'banner' | 'video' | 'native': the format Railu should answer in first when the ad unit has several
  //            (default: the order the ad unit declares them in)
  //   test     true: Railu answers a fixed sample bid, never billed (integration testing)
  //   endpoint override (staging)
  isBidRequestValid(bid) { const mt = (bid && bid.mediaTypes) || {}; return !!(mt.banner || mt.video || mt.native); },
  // One POST per auction (a second only when some ad units ask for test bids). text/plain keeps it a simple CORS request:
  // no preflight on the auction's critical path; the body is the OpenRTB JSON.
  buildRequests(validBidRequests, bidderRequest) {
    return buildOrtbRequests(validBidRequests, bidderRequest, { endpoint: RAILU_ENDPOINT })
      .map((r) => ({ method: 'POST', url: r.url, data: r.body, options: { contentType: 'text/plain', withCredentials: false } }));
  },
  interpretResponse(serverResponse, request) { return interpretOrtbResponse(serverResponse && serverResponse.body, request); },
  getUserSyncs() { return []; }, // no cookies, no syncs: identity rides the request (ifa / consent) and nothing else
};

registerBidder(spec);
