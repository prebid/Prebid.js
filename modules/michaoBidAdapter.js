import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import {
  deepSetValue,
  isArray,
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
  RENDERER_URL:
    'https://cdn.jsdelivr.net/npm/in-renderer-js@latest/dist/in-video-renderer.umd.min.js',
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

    if (params?.badv) {
      if (!isArray(params?.badv)) {
        domainLogger.invalidBadvError(params?.badv);
        return false;
      }
    }

    if (params?.bcat) {
      if (!isArray(params?.bcat)) {
        domainLogger.invalidBcatError(params?.bcat);
        return false;
      }
    }

    if (bid.params?.reward) {
      if (!isBoolean(params?.reward)) {
        domainLogger.invalidRewardError(params?.reward);
        return false;
      }
    }

    const video = bid.mediaTypes?.video;
    if (video) {
      if (!video.context) {
        domainLogger.invalidVideoContext();
        return false;
      }

      if (!video.playerSize || !Array.isArray(video.playerSize)) {
        domainLogger.invalidVideoPlayerSize();
        return false;
      }

      if (!isNumber(video.minduration)) {
        domainLogger.invalidVideoMinDuration();
        return false;
      }

      if (!isNumber(video.maxduration)) {
        domainLogger.invalidVideoMaxDuration();
        return false;
      }

      if (!Array.isArray(video.mimes) || video.mimes.length === 0) {
        domainLogger.invalidVideoMimes();
        return false;
      }

      if (!Array.isArray(video.protocols) || video.protocols.length === 0) {
        domainLogger.invalidVideoProtocols();
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

      if (validBidRequest.mediaTypes?.video) {
        bidRequestEachFormat.push({
          ...validBidRequest,
          mediaTypes: {
            video: validBidRequest.mediaTypes.video,
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
      triggerPixel(generateBillableUrl(bid));
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

  invalidBadvError(value) {
    logError(
      `Michao Bid Adapter: Invalid badv. Expected array, got ${typeof value}`
    );
  },

  invalidBcatError(value) {
    logError(
      `Michao Bid Adapter: Invalid bcat. Expected array, got ${typeof value}`
    );
  },

  invalidRewardError(value) {
    logError(
      `Michao Bid Adapter: Invalid reward. Expected boolean, got ${typeof value}. Value: ${value}`
    );
  },

  invalidVideoContext() {
    logError('Michao Bid Adapter: Video context is not set');
  },

  invalidVideoPlayerSize() {
    logError('Michao Bid Adapter: Video playerSize is not set or invalid');
  },

  invalidVideoMinDuration() {
    logError('Michao Bid Adapter: Video minDuration is not set or invalid');
  },

  invalidVideoMaxDuration() {
    logError('Michao Bid Adapter: Video maxDuration is not set or invalid');
  },

  invalidVideoMimes() {
    logError('Michao Bid Adapter: Video mimes is not set or invalid');
  },

  invalidVideoProtocols() {
    logError('Michao Bid Adapter: Video protocols is not set or invalid');
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

function generateBillableUrl(bid) {
  return replaceAuctionPrice(bid.burl, bid.originalCpm || bid.cpm);
}

const converter = ortbConverter({
  request(buildRequest, imps, bidderRequest, context) {
    const bidRequest = context.bidRequests[0];
    const openRTBBidRequest = buildRequest(imps, bidderRequest, context);
    openRTBBidRequest.cur = [ENV.DEFAULT_CURRENCY];
    openRTBBidRequest.test = config.getConfig('debug') ? 1 : 0;
    openRTBBidRequest.bcat = bidRequest.params?.bcat || [];
    openRTBBidRequest.badv = bidRequest.params?.badv || [];
    deepSetValue(
      openRTBBidRequest,
      'site.id',
      bidRequest.params.site.toString()
    );
    if (bidRequest?.schain) {
      deepSetValue(openRTBBidRequest, 'source.schain', bidRequest.schain);
    }

    if (bidRequest.params.partner) {
      deepSetValue(
        openRTBBidRequest,
        'site.publisher.ext.partner',
        bidRequest.params.partner.toString()
      );
    }

    return openRTBBidRequest;
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.placement', bidRequest.params.placement.toString());
    deepSetValue(imp, 'rwdd', bidRequest.params?.reward ? 1 : 0);
    deepSetValue(
      imp,
      'bidfloor',
      isNumber(bidRequest.params?.bidFloor) ? bidRequest.params?.bidFloor : 0
    );

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
        url: ENV.RENDERER_URL,
        id: bidRequest.bidId,
        adUnitCode: bidRequest.adUnitCode,
      });
      renderer.render(() => {
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
