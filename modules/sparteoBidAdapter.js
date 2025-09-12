import { deepAccess, deepSetValue, logWarn, logError, parseSizesInput, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { Renderer } from '../src/Renderer.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 */

const BIDDER_CODE = 'sparteo';
const GVLID = 1028;
const TTL = 60;
const HTTP_METHOD = 'POST';
const REQUEST_URL = 'https://bid.sparteo.com/auction';
const USER_SYNC_URL_IFRAME = 'https://sync.sparteo.com/sync/iframe.html?from=prebidjs';
let isSynced = window.sparteoCrossfire?.started || false;

const converter = ortbConverter({
  context: {
    // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: TTL // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    deepSetValue(request, 'site.publisher.ext.params.pbjsVersion', '$prebid.version$');

    if (bidderRequest.bids[0].params.networkId) {
      request.site.publisher.ext.params.networkId = bidderRequest.bids[0].params.networkId;
    }

    if (bidderRequest.bids[0].params.publisherId) {
      request.site.publisher.ext.params.publisherId = bidderRequest.bids[0].params.publisherId;
    }

    return request;
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    deepSetValue(imp, 'ext.sparteo.params', bidRequest.params);
    imp.ext.sparteo.params.adUnitCode = bidRequest.adUnitCode;

    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = deepAccess(bid, 'ext.prebid.type');

    const response = buildBidResponse(bid, context);

    if (context.mediaType === 'video') {
      response.nurl = bid.nurl;
      response.vastUrl = deepAccess(bid, 'ext.prebid.cache.vastXml.url') ?? null;
    }

    // extract renderer config, if present, and create Prebid renderer
    const rendererConfig = deepAccess(bid, 'ext.prebid.renderer') ?? null;
    if (rendererConfig && rendererConfig.url) {
      response.renderer = createRenderer(rendererConfig);
    }

    return response;
  }
});

function createRenderer(rendererConfig) {
  const renderer = Renderer.install({
    url: rendererConfig.url,
    loaded: false,
    config: rendererConfig
  });
  try {
    renderer.setRender(outstreamRender);
  } catch (err) {
    logWarn('Sparteo Bid Adapter: Prebid Error calling setRender on renderer', err);
  }
  return renderer;
}

function outstreamRender(bid) {
  if (!document.getElementById(bid.adUnitCode)) {
    logError(`Sparteo Bid Adapter: Video renderer did not started. bidResponse.adUnitCode is probably not a DOM element : ${bid.adUnitCode}`);
    return;
  }

  const config = bid.renderer.getConfig() ?? {};

  bid.renderer.push(() => {
    window.ANOutstreamVideo.renderAd({
      targetId: bid.adUnitCode, // target div id to render video
      adResponse: {
        ad: {
          video: {
            content: bid.vastXml,
            player_width: bid.width,
            player_height: bid.height
          }
        }
      },
      sizes: [bid.width, bid.height],
      rendererOptions: config.options ?? {}
    });
  });
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const bannerParams = deepAccess(bid, 'mediaTypes.banner');
    const videoParams = deepAccess(bid, 'mediaTypes.video');

    if (!bid.params) {
      logError('The bid params are missing');
      return false;
    }

    if (!bid.params.networkId && !bid.params.publisherId) {
      // publisherId is deprecated but is still accepted for now for retrocompatibility purpose.
      logError('The networkId is required');
      return false;
    }

    if (!bannerParams && !videoParams) {
      logError('The placement must be of banner or video type');
      return false;
    }

    /**
     * BANNER checks
     */

    if (bannerParams) {
      const sizes = bannerParams.sizes;

      if (!sizes || parseSizesInput(sizes).length === 0) {
        logError('mediaTypes.banner.sizes must be set for banner placement at the right format.');
        return false;
      }
    }

    /**
     * VIDEO checks
     */

    if (videoParams) {
      if (parseSizesInput(videoParams.playerSize).length === 0) {
        logError('mediaTypes.video.playerSize must be set for video placement at the right format.');
        return false;
      }
    }

    return true;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const payload = converter.toORTB({bidRequests, bidderRequest})

    return {
      method: HTTP_METHOD,
      url: bidRequests[0].params.endpoint ? bidRequests[0].params.endpoint : REQUEST_URL,
      data: payload
    };
  },

  interpretResponse: function (serverResponse, requests) {
    const bids = converter.fromORTB({response: serverResponse.body, request: requests.data}).bids;

    return bids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    let syncurl = '';

    if (!isSynced && !window.sparteoCrossfire?.started) {
      // Attaching GDPR Consent Params in UserSync url
      if (gdprConsent) {
        syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
        syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
      }
      if (uspConsent && uspConsent.consentString) {
        syncurl += `&usp_consent=${uspConsent.consentString}`;
      }

      if (syncOptions.iframeEnabled) {
        isSynced = true;

        window.sparteoCrossfire = {
          started: true
        };

        return [{
          type: 'iframe',
          url: USER_SYNC_URL_IFRAME + syncurl
        }];
      }
    }
  },

  onTimeout: function (timeoutData) {},

  onBidWon: function (bid) {
    if (bid && bid.nurl) {
      triggerPixel(bid.nurl, null);
    }
  },

  onSetTargeting: function (bid) {}
};

registerBidder(spec);
