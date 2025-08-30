import {
  logInfo,
  logWarn,
  logError,
  logMessage,
  deepAccess,
  deepSetValue,
  mergeDeep
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

// Configuration constants
const ADAPTER_CONFIG = {
  code: 'dxtech',
  version: '1.0.0',
  ttl: 300,
  netRevenue: true,
  currency: 'USD',
  endpoint: 'https://ads.dxtech.ai/pbjs',
  rendererUrl: 'https://cdn.dxtech.ai/players/dxOutstreamPlayer.js'
};

// ORTB converter configuration
const ortbConfig = ortbConverter({
  context: {
    netRevenue: ADAPTER_CONFIG.netRevenue,
    ttl: ADAPTER_CONFIG.ttl
  },
  imp: createImpBuilder,
  request: createRequestBuilder,
  bidResponse: createBidResponseBuilder
});

function createImpBuilder(buildImp, bidRequest, context) {
  const impression = buildImp(bidRequest, context);

  if (!impression.bidfloor) {
    impression.bidfloor = bidRequest.params.bidfloor || 0;
    impression.bidfloorcur = bidRequest.params.currency || ADAPTER_CONFIG.currency;
  }
  return impression;
}

function createRequestBuilder(buildRequest, imps, bidderRequest, context) {
  const request = buildRequest(imps, bidderRequest, context);

  mergeDeep(request, {
    ext: {
      hb: 1,
      prebidver: '$prebid.version$',
      adapterver: ADAPTER_CONFIG.version,
    }
  });

  // GDPR handling
  if (bidderRequest.gdprConsent) {
    deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    deepSetValue(request, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
  }

  // CCPA handling
  if (bidderRequest.uspConsent) {
    deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  return request;
}

function createBidResponseBuilder(buildBidResponse, bid, context) {
  const {bidRequest} = context;
  let mediaType;

  // Determine media type from ad markup
  if (bid.adm && bid.adm.trim().startsWith('<VAST')) {
    mediaType = VIDEO;
  } else {
    mediaType = BANNER;
  }

  context.mediaType = mediaType;
  context.currency = ADAPTER_CONFIG.currency;

  if (mediaType === VIDEO) {
    context.vastXml = bid.adm;
  }

  const response = buildBidResponse(bid, context);

  // Add outstream renderer if needed
  if (mediaType === VIDEO && bidRequest.mediaTypes && bidRequest.mediaTypes.video && bidRequest.mediaTypes.video.context === 'outstream') {
    response.renderer = createOutstreamRenderer(response);
  }

  return response;
}

// Validation functions
const ValidationRules = {
  checkParams(bidRequest) {
    if (!bidRequest.params) {
      return false;
    }

    if (bidRequest.params.e2etest) {
      return true;
    }

    if (!bidRequest.params.publisherId) {
      logError('dxtech: publisherId is required');
      return false;
    }

    if (!bidRequest.params.placementId) {
      logError('dxtech: placementId is required');
      return false;
    }

    const hasMedia = MediaTypeChecker.hasVideo(bidRequest) || MediaTypeChecker.hasBanner(bidRequest);
    if (!hasMedia) {
      return false;
    }

    return true;
  },

  checkBanner(bidRequest) {
    if (!MediaTypeChecker.hasBanner(bidRequest)) {
      return true;
    }

    const bannerConfig = deepAccess(bidRequest, 'mediaTypes.banner');
    if (!Array.isArray(bannerConfig.sizes)) {
      return false;
    }
    return true;
  },

  checkVideo(bidRequest) {
    if (!MediaTypeChecker.hasVideo(bidRequest)) {
      return true;
    }

    const videoConfig = deepAccess(bidRequest, 'mediaTypes.video', {});
    const videoParams = deepAccess(bidRequest, 'params.video', {});
    const params = deepAccess(bidRequest, 'params', {});

    if (params && params.e2etest) {
      return true;
    }

    const combinedVideoConfig = {
      ...videoConfig,
      ...videoParams
    };

    if (!Array.isArray(combinedVideoConfig.mimes) || combinedVideoConfig.mimes.length === 0) {
      logError('dxtech: video mimes configuration invalid');
      return false;
    }

    if (!Array.isArray(combinedVideoConfig.protocols) || combinedVideoConfig.protocols.length === 0) {
      logError('dxtech: video protocols configuration invalid');
      return false;
    }

    if (!combinedVideoConfig.context) {
      logError('dxtech: video context not specified');
      return false;
    }

    if (combinedVideoConfig.context !== 'instream') {
      logError('dxtech: only instream video context supported');
      return false;
    }

    if (typeof combinedVideoConfig.playerSize === 'undefined' ||
        !Array.isArray(combinedVideoConfig.playerSize) ||
        !Array.isArray(combinedVideoConfig.playerSize[0])) {
      logError('dxtech: video playerSize must be in format [[w,h]]');
      return false;
    }

    return true;
  }
};

const MediaTypeChecker = {
  hasBanner(bidRequest) {
    return !!deepAccess(bidRequest, 'mediaTypes.banner');
  },

  hasVideo(bidRequest) {
    return !!deepAccess(bidRequest, 'mediaTypes.video');
  },

  detectFromRequests(bidRequests) {
    for (const request of bidRequests) {
      if (this.hasVideo(request)) {
        return VIDEO;
      }
    }
    return BANNER;
  }
};

function createOutstreamRenderer(bidResponse) {
  const rendererSettings = {
    width: bidResponse.width,
    height: bidResponse.height,
    vastTimeout: 5000,
    maxAllowedVastTagRedirects: 3,
    allowVpaid: false,
    autoPlay: true,
    preload: true,
    mute: false
  };

  const renderer = Renderer.install({
    id: bidResponse.adId,
    url: ADAPTER_CONFIG.rendererUrl,
    config: rendererSettings,
    loaded: false,
    targetId: bidResponse.adUnitCode,
    adUnitCode: bidResponse.adUnitCode
  });

  try {
    renderer.setRender(function (bid) {
      bid.renderer.push(() => {
        const { id, config } = bid.renderer;
        window.dxOutstreamPlayer(bid, id, config);
      });
    });
  } catch (error) {
    logWarn('dxtech: Renderer setup error', error);
  }

  return renderer;
}

function buildEndpointUrl(publisherId, placementId) {
  let url = ADAPTER_CONFIG.endpoint + '?publisher_id=' + publisherId;

  if (placementId) {
    url += '&placement_id=' + placementId;
  }

  return url;
}

function processUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  logInfo('dxtech.getUserSyncs', 'syncOptions', syncOptions, 'serverResponses', serverResponses);
  let syncUrls = [];

  if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
    return syncUrls;
  }

  serverResponses.forEach(response => {
    const userSyncData = deepAccess(response, 'body.ext.usersync');
    if (userSyncData) {
      let allSyncs = [];

      Object.keys(userSyncData).forEach(key => {
        const syncInfo = userSyncData[key];
        if (syncInfo.syncs && syncInfo.syncs.length) {
          allSyncs = allSyncs.concat(syncInfo.syncs);
        }
      });

      allSyncs.forEach(syncData => {
        const params = [];
        let finalUrl = syncData.url;

        if (syncData.type === 'iframe') {
          if (gdprConsent) {
            params.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
            params.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
          }
          if (uspConsent) {
            params.push('us_privacy=' + encodeURIComponent(uspConsent));
          }
          finalUrl = `${syncData.url}${params.length > 0 ? '?' + params.join('&') : ''}`;
        }

        syncUrls.push({
          type: syncData.type === 'iframe' ? 'iframe' : 'image',
          url: finalUrl
        });
      });

      if (syncOptions.iframeEnabled) {
        syncUrls = syncUrls.filter(sync => sync.type === 'iframe');
      } else if (syncOptions.pixelEnabled) {
        syncUrls = syncUrls.filter(sync => sync.type === 'image');
      }
    }
  });

  logInfo('dxtech.getUserSyncs result=%o', syncUrls);
  return syncUrls;
}

// Main adapter specification
export const spec = {
  code: ADAPTER_CONFIG.code,
  VERSION: ADAPTER_CONFIG.version,
  supportedMediaTypes: [BANNER, VIDEO],
  ENDPOINT: ADAPTER_CONFIG.endpoint,

  isBidRequestValid: function (bid) {
    return (
      ValidationRules.checkParams(bid) &&
      ValidationRules.checkBanner(bid) &&
      ValidationRules.checkVideo(bid)
    );
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const contextMediaType = MediaTypeChecker.detectFromRequests(validBidRequests);
    const requestData = ortbConfig.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
      context: { contextMediaType }
    });

    let publisherId = validBidRequests[0].params.publisherId;
    const placementId = validBidRequests[0].params.placementId;

    if (validBidRequests[0].params.e2etest) {
      logMessage('dxtech: E2E test mode activated');
      publisherId = 'e2etest';
    }

    const requestUrl = buildEndpointUrl(publisherId, placementId);

    return {
      method: 'POST',
      url: requestUrl,
      data: requestData
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bids = ortbConfig.fromORTB({
      response: serverResponse.body,
      request: bidRequest.data
    }).bids;
    return bids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    return processUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent);
  }
};

registerBidder(spec);
