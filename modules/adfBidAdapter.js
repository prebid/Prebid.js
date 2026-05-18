'use strict';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, setOnAny } from '../src/utils.js';
import { Renderer } from '../src/Renderer.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'adf';
const GVLID = 50;
const BIDDER_ALIAS = [
  { code: 'adformOpenRTB', gvlid: GVLID },
  { code: 'adform', gvlid: GVLID }
];

const OUTSTREAM_RENDERER_URL = 'https://s2.adform.net/banners/scripts/video/outstream/render.js';

const converter = ortbConverter({
  context: {
    ttl: 360,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { mid, inv, mname } = bidRequest.params;

    if (mid) {
      imp.tagid = mid;
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

export const spec = {
  code: BIDDER_CODE,
  aliases: BIDDER_ALIAS,
  gvlid: GVLID,
  supportedMediaTypes: [NATIVE, BANNER, VIDEO],
  isBidRequestValid: (bid) => {
    const params = bid.params || {};
    const { mid, inv, mname } = params;
    return !!(mid || (inv && mname));
  },
  buildRequests: (validBidRequests, bidderRequest) => {
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
  },
  interpretResponse: (serverResponse, request) => {
    if (!serverResponse.body) {
      return;
    }
    const response = converter.fromORTB({ request: request.data, response: serverResponse.body });
    return response.bids;
  }
};

registerBidder(spec);

function outstreamRenderer(bid) {
  bid.renderer.push(() => {
    window.Adform.renderOutstream(bid);
  });
}
