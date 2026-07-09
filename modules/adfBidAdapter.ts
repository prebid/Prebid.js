import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, setOnAny } from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import type { AdapterRequest, AdapterResponse, BidderSpec, ExtendedResponse, ServerResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import type { Bid } from '../src/bidfactory.js';

/**
 * Common optional parameters shared by all Adf bid request configurations.
 */
interface AdfCommonParams {
  /**
   * Ad exchange domain. Defaults to `'adx.adform.net'`.
   */
  adxDomain?: string;
  /**
   * Price type for bid responses: `'net'` or `'gross'`. Defaults to `'net'`.
   */
  pt?: 'net' | 'gross';
  /**
   * @deprecated Use `pt` instead.
   */
  priceType?: 'net' | 'gross';
}

/**
 * Configuration using a master tag ID.
 */
interface AdfMidParams extends AdfCommonParams {
  /**
   * Master tag ID on the Adform platform.
   */
  mid: string | number;
  inv?: never;
  mname?: never;
}

/**
 * Configuration using an inventory source and master tag name.
 */
interface AdfInvParams extends AdfCommonParams {
  mid?: never;
  /**
   * Inventory source ID on the Adform platform.
   */
  inv: number;
  /**
   * Master tag name on the Adform platform.
   */
  mname: string;
}

/**
 * Bidder parameters for the Adf (Adform) adapter.
 *
 * Either `mid` or both `inv` and `mname` must be provided.
 */
export type AdfBidderParams = AdfMidParams | AdfInvParams;

declare module '../src/adUnits' {
  interface BidderParams {
    adf: AdfBidderParams;
    adform: AdfBidderParams;
    adformOpenRTB: AdfBidderParams;
  }
}

declare global {
  interface Window {
    Adform: {
      renderOutstream(bid: Bid): void;
    };
  }
}

const BIDDER_CODE = 'adf';
const GVLID = 50;
const BIDDER_ALIAS = [
  { code: 'adformOpenRTB' as const, gvlid: GVLID },
  { code: 'adform' as const, gvlid: GVLID }
];

const OUTSTREAM_RENDERER_URL = 'https://s2.adform.net/banners/scripts/video/outstream/render.js';

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    ttl: 360,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { mid, inv, mname } = bidRequest.params;

    if (mid) {
      imp.tagid = String(mid);
    } else {
      deepSetValue(imp, 'ext.bidder', { inv, mname });
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    deepSetValue(request, 'source.fd', 1);
    deepSetValue(request, 'ext.pt', context.pt);

    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = deepAccess(bid, 'ext.prebid.type');
    const bidResponse = buildBidResponse(bid, context);

    bidResponse.meta = bidResponse.meta || {};
    bidResponse.meta.mediaType = context.mediaType;

    // Outstream renderer
    if (bidResponse.mediaType === VIDEO &&
        !context.bidRequest.renderer &&
        deepAccess(context.bidRequest, 'mediaTypes.video.context') === 'outstream') {
      bidResponse.renderer = Renderer.install({
        id: context.bidRequest.bidId,
        url: OUTSTREAM_RENDERER_URL,
        adUnitCode: context.bidRequest.adUnitCode
      });
      bidResponse.renderer.setRender(outstreamRenderer);
    }

    return bidResponse;
  }
});

const isBidRequestValid = (bid: BidRequest<typeof BIDDER_CODE>): boolean => {
  const { mid, inv, mname } = bid.params || {};
  return !!(mid || (inv && mname));
};

const buildRequests = (
  validBidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>,
): AdapterRequest => {
  const adxDomain = setOnAny(validBidRequests, 'params.adxDomain') || 'adx.adform.net';
  const pt = setOnAny(validBidRequests, 'params.pt') || setOnAny(validBidRequests, 'params.priceType') || 'net';

  const data = converter.toORTB({
    bidRequests: validBidRequests,
    bidderRequest,
    context: { netRevenue: pt === 'net', pt }
  });

  return {
    method: 'POST',
    url: 'https://' + adxDomain + '/adx/openrtb',
    data
  };
};

const interpretResponse = (serverResponse: ServerResponse, request: AdapterRequest): AdapterResponse => {
  if (!serverResponse.body) {
    return [];
  }
  const response = converter.fromORTB({ request: request.data, response: serverResponse.body }) as ExtendedResponse;
  return response.bids || [];
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  aliases: BIDDER_ALIAS,
  gvlid: GVLID,
  supportedMediaTypes: [NATIVE, BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
};

registerBidder(spec);

function outstreamRenderer(bid: Bid) {
  bid.renderer!.push(() => {
    window.Adform.renderOutstream(bid);
  });
}
