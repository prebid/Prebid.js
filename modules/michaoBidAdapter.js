import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import {
  deepSetValue,
  isStr,
  logError,
  replaceAuctionPrice,
  triggerPixel,
} from '../src/utils.js';

const ENV = {
  BIDDER_CODE: 'michao',
  SUPPORTED_MEDIA_TYPES: [BANNER, VIDEO],
  ENDPOINT: 'https://rtb.michao-ssp.com/openrtb/prebid',
  NET_REVENUE: true,
  DEFAULT_CURRENCY: 'USD',
  RENDERER_URL:
    'https://cdn.jsdelivr.net/npm/in-renderer-js@latest/dist/in-renderer.umd.min.js',
};

export const spec = {
  code: ENV.BIDDER_CODE,
  supportedMediaTypes: ENV.SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function (bid) {
    if (!hasParamsObject(bid)) {
      return false;
    }

    if (!validateMichaoParams(bid.params)) {
      domainLogger.bidRequestValidationError();
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const bidRequests = [];

    validBidRequests.forEach((validBidRequest) => {
      if (
        hasVideoMediaType(validBidRequest) &&
        hasBannerMediaType(validBidRequest)
      ) {
        bidRequests.push(
          buildRequest(validBidRequest, bidderRequest, 'banner')
        );
        bidRequests.push(buildRequest(validBidRequest, bidderRequest, 'video'));
      } else if (hasVideoMediaType(validBidRequest)) {
        bidRequests.push(buildRequest(validBidRequest, bidderRequest, 'video'));
      } else if (hasBannerMediaType(validBidRequest)) {
        bidRequests.push(
          buildRequest(validBidRequest, bidderRequest, 'banner')
        );
      }
    });

    return bidRequests;
  },

  interpretResponse: function (serverResponse, request) {
    return interpretResponse(serverResponse, request);
  },

  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {
    if (syncOptions.iframeEnabled) {
      return [syncUser(gdprConsent)];
    }
  },

  onBidBillable: function (bid) {
    if (bid.burl && isStr(bid.burl)) {
      billBid(bid);
    }
  },
};

export const domainLogger = {
  bidRequestValidationError() {
    logError('Michao: wrong format of site or placement.');
  },
};

export function buildRequest(bidRequest, bidderRequest, mediaType) {
  const openRTBBidRequest = converter.toORTB({
    bidRequests: [bidRequest],
    bidderRequest,
    context: {
      mediaType: mediaType,
    },
  });

  return {
    method: 'POST',
    url: ENV.ENDPOINT,
    data: openRTBBidRequest,
    options: { contentType: 'application/json', withCredentials: true },
  };
}

export function interpretResponse(response, request) {
  const bids = converter.fromORTB({
    response: response.body,
    request: request.data,
  }).bids;

  return bids;
}

export function syncUser(gdprConsent) {
  let gdprParams = '';

  if (typeof gdprConsent === 'object') {
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${
        gdprConsent.consentString
      }`;
    } else {
      gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
    }
  }

  return {
    type: 'iframe',
    url: 'https://sync.michao-ssp.com/cookie-syncs?' + gdprParams,
  };
}

export function addRenderer(bid) {
  bid.renderer.push(() => {
    const inRenderer = new window.InRenderer();
    inRenderer.render(bid.adUnitCode, bid);
  });
}

export function hasParamsObject(bid) {
  return typeof bid.params === 'object';
}

export function validateMichaoParams(params) {
  const michaoParams = ['site', 'placement'];
  return michaoParams.every((michaoParam) =>
    Number.isFinite(params[michaoParam])
  );
}

export function billBid(bid) {
  bid.burl = replaceAuctionPrice(bid.burl, bid.originalCpm || bid.cpm);
  triggerPixel(bid.burl);
}

const converter = ortbConverter({
  request(buildRequest, imps, bidderRequest, context) {
    const bidRequest = context.bidRequests[0];
    const openRTBBidRequest = buildRequest(imps, bidderRequest, context);
    openRTBBidRequest.cur = [ENV.DEFAULT_CURRENCY];
    openRTBBidRequest.test = config.getConfig('debug') ? 1 : 0;
    deepSetValue(
      openRTBBidRequest,
      'site.id',
      bidRequest.params.site.toString()
    );
    if (bidRequest?.schain) {
      deepSetValue(openRTBBidRequest, 'source.schain', bidRequest.schain);
    }

    return openRTBBidRequest;
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // imp.id = bidRequest.adUnitCode;
    deepSetValue(imp, 'ext.placement', bidRequest.params.placement.toString());

    return imp;
  },

  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest } = context;
    let bidResponse = buildBidResponse(bid, context);
    if (bidRequest.mediaTypes.video?.context === 'outstream') {
      const renderer = Renderer.install({
        id: bid.bidId,
        url: ENV.RENDERER_URL,
        adUnitCode: bid.adUnitCode,
      });
      renderer.setRender(addRenderer);
      bidResponse.renderer = renderer;
    }

    return bidResponse;
  },

  context: {
    netRevenue: ENV.NET_REVENUE,
    currency: ENV.DEFAULT_CURRENCY,
    ttl: 360,
  },
});

function hasBannerMediaType(bid) {
  return hasMediaType(bid, 'banner');
}

function hasVideoMediaType(bid) {
  return hasMediaType(bid, 'video');
}

function hasMediaType(bid, mediaType) {
  return bid.mediaTypes.hasOwnProperty(mediaType);
}

registerBidder(spec);
