import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, setOnAny } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import type { AdapterRequest, AdapterResponse, BidderSpec, ExtendedResponse, ServerResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';

type Peak226Region = 'us' | 'eu' | 'jp';

/**
 * Bidder parameters for the peak226 adapter.
 */
export interface Peak226BidderParams {
  /**
   * Publisher account ID.
   */
  publisherId: string;
  /**
   * Placement ID for this ad unit.
   */
  placementId: string;
  /**
   * Data center to route the request to. Defaults to `'us'`.
   */
  region?: Peak226Region;
}

declare module '../src/adUnits' {
  interface BidderParams {
    peak226: Peak226BidderParams;
  }
}

const BIDDER_CODE = 'peak226';
// TODO: unverified against vendor-list.consensu.org — confirm this ID is
// actually registered to peak226 before release.
const GVLID = 1202;
const DEFAULT_REGION: Peak226Region = 'us';
// TODO: placeholder domains — replace with the real per-datacenter endpoints.
const ENDPOINTS: Record<Peak226Region, string> = {
  us: 'https://us.peak226.com/openrtb2',
  eu: 'https://eu.peak226.com/openrtb2',
  jp: 'https://jp.peak226.com/openrtb2',
};

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: 300,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = bidRequest.params.placementId;
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const publisherId = setOnAny(context.bidRequests, 'params.publisherId');
    if (publisherId) {
      // site vs app is already decided by ortbConverter from ortb2; mirror
      // that choice so publisher.id lands on the right object.
      if (request.app) {
        deepSetValue(request, 'app.publisher.id', String(publisherId));
      } else {
        deepSetValue(request, 'site.publisher.id', String(publisherId));
      }
    }
    return request;
  },
  // No `bidResponse` override: peak226 is assumed to return standard ORTB 2.6
  // responses (`seatbid[].bid[].mtype` set) and plain VAST for video, with no
  // bidder-hosted outstream renderer required. Revisit once the real
  // response shape is confirmed.
});

const isBidRequestValid = (bid: BidRequest<typeof BIDDER_CODE>): boolean => {
  const { publisherId, placementId } = bid.params || {};
  if (!publisherId || !placementId) {
    return false;
  }
  const video = deepAccess(bid, 'mediaTypes.video');
  if (video) {
    if (!Array.isArray(video.mimes) || video.mimes.length === 0) {
      return false;
    }
    if (!video.playerSize && !bid.sizes) {
      return false;
    }
  }
  return true;
};

const buildRequests = (
  validBidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>,
): AdapterRequest => {
  const region = (setOnAny(validBidRequests, 'params.region') || DEFAULT_REGION) as Peak226Region;
  const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });

  return {
    method: 'POST',
    url: ENDPOINTS[region] || ENDPOINTS[DEFAULT_REGION],
    data,
  };
};

const interpretResponse = (serverResponse: ServerResponse, request: AdapterRequest): AdapterResponse => {
  if (!serverResponse || !serverResponse.body || !serverResponse.body.seatbid) {
    return [];
  }
  const response = converter.fromORTB({ request: request.data, response: serverResponse.body }) as ExtendedResponse;
  return response.bids || [];
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  // `getUserSyncs` intentionally omitted for v1, pending confirmation of
  // sync support (pixel/iframe) and the actual sync URL(s).
};

registerBidder(spec);
