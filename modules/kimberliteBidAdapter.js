import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { deepSetValue } from '../src/utils.js';

const VERSION = '1.0.0';

const BIDDER_CODE = 'kimberlite';
const METHOD = 'POST';
const ENDPOINT_URL = 'https://kimberlite.io/rtb/bid/pbjs';

const VERSION_INFO = {
  ver: '$prebid.version$',
  adapterVer: `${VERSION}`
};

const converter = ortbConverter({
  context: {
    mediaType: BANNER,
    netRevenue: true,
    ttl: 300
  },

  request(buildRequest, imps, bidderRequest, context) {
    const bidRequest = buildRequest(imps, bidderRequest, context);
    deepSetValue(bidRequest, 'site.publisher.domain', bidderRequest.refererInfo.domain);
    deepSetValue(bidRequest, 'site.page', bidderRequest.refererInfo.page);
    deepSetValue(bidRequest, 'ext.prebid.ver', VERSION_INFO.ver);
    deepSetValue(bidRequest, 'ext.prebid.adapterVer', VERSION_INFO.adapterVer);
    bidRequest.at = 1;
    return bidRequest;
  },

  imp (buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = bidRequest.params.placementId;
    return imp;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bidRequest = {}) => {
    const { params, mediaTypes } = bidRequest;
    let isValid = Boolean(params && params.placementId);
    if (mediaTypes && mediaTypes[BANNER]) {
      isValid = isValid && Boolean(mediaTypes[BANNER].sizes);
    } else {
      isValid = false;
    }

    return isValid;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    return {
      method: METHOD,
      url: ENDPOINT_URL,
      data: converter.toORTB({ bidderRequest, bidRequests })
    }
  },

  interpretResponse(serverResponse, bidRequest) {
    const bids = converter.fromORTB({response: serverResponse.body, request: bidRequest.data}).bids;
    return bids;
  }
};

registerBidder(spec);
