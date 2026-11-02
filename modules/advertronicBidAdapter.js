import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { deepAccess, deepSetValue, logWarn } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('./advertronicBidAdapter.d.ts').AdvertronicBidderParams} AdvertronicBidderParams
 * @typedef {BidRequest & { params: AdvertronicBidderParams }} AdvertronicBidRequest
 */

const BIDDER_CODE = 'advertronic';
const ENDPOINT_URL = 'https://ssp.advertronic.io/prebid/v1/auction';
const SYNC_URL = 'https://ssp.advertronic.io/prebid/v1/sync';
const RENDERER_URL = 'https://ssp.advertronic.io/tag/prebid-renderer-v1.js';
const DEFAULT_TTL = 300;

const converter = ortbConverter({
  context: {
    // Prices returned by the endpoint are net to the publisher.
    netRevenue: true,
    ttl: DEFAULT_TTL,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = String(bidRequest.params.placementId);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    deepSetValue(request, 'site.publisher.id', String(context.publisherId));
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    if (FEATURES.VIDEO) {
      // bid.api (OpenRTB 2.6) marks executable (VPAID) creatives; the renderer
      // enables its VPAID runtime only when this flag is present.
      if (bid.api === 1 || bid.api === 2) {
        bidResponse.advtVpaid = true;
      }
      if (bidResponse.mediaType === VIDEO) {
        const { bidRequest } = context;
        // Attach our renderer for outstream unless the publisher supplied one.
        if (
          bidRequest &&
          deepAccess(bidRequest, 'mediaTypes.video.context') === 'outstream' &&
          !bidRequest.renderer &&
          !deepAccess(bidRequest, 'mediaTypes.video.renderer')
        ) {
          bidResponse.renderer = createRenderer(bidResponse, bidRequest.adUnitCode);
        }
      }
    }
    return bidResponse;
  },
});

function createRenderer(bidResponse, adUnitCode) {
  const renderer = Renderer.install({
    id: bidResponse.requestId,
    url: RENDERER_URL,
    adUnitCode,
    loaded: false,
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (e) {
    logWarn('advertronic: renderer.setRender failed', e);
  }
  return renderer;
}

function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.advertronicPrebidRenderer.render(bid);
  });
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * @param {AdvertronicBidRequest} bid
   * @returns {boolean}
   */
  isBidRequestValid(bid) {
    return !!(
      bid &&
      bid.params &&
      bid.params.placementId &&
      typeof bid.params.placementId === 'string' &&
      bid.params.publisherId &&
      /^\d+$/.test(String(bid.params.publisherId))
    );
  },

  buildRequests(validBidRequests, bidderRequest) {
    if (!validBidRequests.length) {
      return [];
    }
    const data = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
      context: { publisherId: validBidRequests[0].params.publisherId },
    });
    return [
      {
        method: 'POST',
        url: ENDPOINT_URL,
        data,
        // withCredentials carries the first-party user id cookie used for
        // user matching; without it all requests are anonymous. Content type
        // is left at the ajax default (text/plain) so the cross-origin POST
        // stays a simple request and needs no CORS preflight.
        options: { withCredentials: true },
      },
    ];
  },

  interpretResponse(serverResponse, request) {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }
    return converter.fromORTB({ response: serverResponse.body, request: request.data }).bids;
  },

  getUserSyncs(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{ type: 'iframe', url: SYNC_URL }];
    }
    return [];
  },
};

registerBidder(spec);
