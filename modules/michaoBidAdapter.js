import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import {
  deepSetValue,
  isBoolean,
  isNumber,
  isStr,
  logError,
  replaceAuctionPrice,
  triggerPixel,
} from '../src/utils.js';

const ENV = {
  BIDDER_CODE: 'michao',
  SUPPORTED_MEDIA_TYPES: [BANNER, VIDEO, NATIVE],
  ENDPOINT: 'https://rtb.michao-ssp.com/openrtb/prebid',
  NET_REVENUE: true,
  DEFAULT_CURRENCY: 'USD',
  OUTSTREAM_RENDERER_URL:
    'https://cdn.jsdelivr.net/npm/in-renderer-js@1/dist/in-video-renderer.umd.min.js',
};

export const spec = {
  code: ENV.BIDDER_CODE,
  supportedMediaTypes: ENV.SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function (bid) {
    const params = bid.params;

    if (!isNumber(params?.site)) {
      domainLogger.invalidSiteError(params?.site);
      return false;
    }

    if (!isStr(params?.placement)) {
      domainLogger.invalidPlacementError(params?.placement);
      return false;
    }

    if (params?.partner) {
      if (!isNumber(params?.partner)) {
        domainLogger.invalidPartnerError(params?.partner);
        return false;
      }
    }

    if (params?.test) {
      if (!isBoolean(params?.test)) {
        domainLogger.invalidTestParamError(params?.test);
        return false;
      }
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const bidRequests = [];

    validBidRequests.forEach((validBidRequest) => {
      let bidRequestEachFormat = [];

      if (validBidRequest.mediaTypes?.banner) {
        bidRequestEachFormat.push({
          ...validBidRequest,
          mediaTypes: {
            banner: validBidRequest.mediaTypes.banner,
          },
        });
      }

      if (validBidRequest.mediaTypes?.native) {
        bidRequestEachFormat.push({
          ...validBidRequest,
          mediaTypes: {
            native: validBidRequest.mediaTypes.native,
          },
        });
      }

      if (validBidRequest.mediaTypes?.video) {
        bidRequestEachFormat.push({
          ...validBidRequest,
          mediaTypes: {
            video: validBidRequest.mediaTypes.video,
          },
        });
      }

      bidRequests.push(buildRequest(bidRequestEachFormat, bidderRequest));
    });

    return bidRequests;
  },

  interpretResponse: function (serverResponse, request) {
    return converter.fromORTB({
      response: serverResponse.body,
      request: request.data,
    }).bids;
  },

  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {
    if (syncOptions.iframeEnabled) {
      return [
        {
          type: 'iframe',
          url:
            'https://sync.michao-ssp.com/cookie-syncs?' +
            generateGdprParams(gdprConsent),
        },
      ];
    }

    return [];
  },

  onBidBillable: function (bid) {
    if (bid.burl && isStr(bid.burl)) {
      const billingUrls = generateBillableUrls(bid);

      billingUrls.forEach((billingUrl) => {
        triggerPixel(billingUrl);
      });
    }
  },
};

export const domainLogger = {
  invalidSiteError(value) {
    logError(
      `Michao Bid Adapter: Invalid site ID. Expected number, got ${typeof value}. Value: ${value}`
    );
  },

  invalidPlacementError(value) {
    logError(
      `Michao Bid Adapter: Invalid placement. Expected string, got ${typeof value}. Value: ${value}`
    );
  },

  invalidPartnerError(value) {
    logError(
      `Michao Bid Adapter: Invalid partner ID. Expected number, got ${typeof value}. Value: ${value}`
    );
  },

  invalidTestParamError(value) {
    logError(
      `Michao Bid Adapter: Invalid test parameter. Expected boolean, got ${typeof value}. Value: ${value}`
    );
  },
};

function buildRequest(bidRequests, bidderRequest) {
  const openRTBBidRequest = converter.toORTB({
    bidRequests: bidRequests,
    bidderRequest,
  });

  return {
    method: 'POST',
    url: ENV.ENDPOINT,
    data: openRTBBidRequest,
    options: { contentType: 'application/json', withCredentials: true },
  };
}

function generateGdprParams(gdprConsent) {
  let gdprParams = '';

  if (typeof gdprConsent === 'object') {
    if (gdprConsent?.gdprApplies) {
      gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${
        gdprConsent.consentString || ''
      }`;
    }
  }

  return gdprParams;
}

function generateBillableUrls(bid) {
  const billingUrls = [];
  const cpm = bid.originalCpm || bid.cpm;

  const billingUrl = new URL(bid.burl);

  const burlParam = billingUrl.searchParams.get('burl');

  if (burlParam) {
    billingUrl.searchParams.delete('burl');
    billingUrls.push(replaceAuctionPrice(burlParam, cpm));
  }

  billingUrls.push(replaceAuctionPrice(billingUrl.toString(), cpm));

  return billingUrls;
}

const converter = ortbConverter({
  request(buildRequest, imps, bidderRequest, context) {
    const bidRequest = context.bidRequests[0];
    const openRTBBidRequest = buildRequest(imps, bidderRequest, context);
    openRTBBidRequest.cur = [ENV.DEFAULT_CURRENCY];
    openRTBBidRequest.test = bidRequest.params?.test ? 1 : 0;

    deepSetValue(
      openRTBBidRequest,
      'site.ext.michao.site',
      bidRequest.params.site.toString()
    );
    if (bidRequest?.schain) {
      deepSetValue(openRTBBidRequest, 'source.schain', bidRequest.schain);
    }

    if (bidRequest.params?.partner) {
      deepSetValue(
        openRTBBidRequest,
        'site.publisher.ext.michao.partner',
        bidRequest.params.partner.toString()
      );
    }

    return openRTBBidRequest;
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(
      imp,
      'ext.michao.placement',
      bidRequest.params.placement.toString()
    );

    if (!bidRequest.mediaTypes?.native) {
      delete imp.native;
    }

    return imp;
  },

  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    const { bidRequest } = context;
    if (
      bidResponse.mediaType === VIDEO &&
      bidRequest.mediaTypes.video.context === 'outstream'
    ) {
      bidResponse.vastXml = bid.adm;
      const renderer = Renderer.install({
        url: ENV.OUTSTREAM_RENDERER_URL,
        id: bidRequest.bidId,
        adUnitCode: bidRequest.adUnitCode,
      });
      renderer.setRender((bid) => {
        bid.renderer.push(() => {
          const inRenderer = new window.InVideoRenderer();
          inRenderer.render(bid.adUnitCode, bid);
        });
      });
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

registerBidder(spec);
