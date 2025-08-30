import {
  logInfo,
  logWarn,
  logError,
  deepAccess,
  deepSetValue,
  mergeDeep
} from '../../src/utils.js';
import {BANNER, VIDEO} from '../../src/mediaTypes.js';
import { Renderer } from '../../src/Renderer.js';
import {ortbConverter} from '../ortbConverter/converter.js';

/**
 * @typedef {import('../../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../../src/adapters/bidderFactory.js').Bid} Bid
 */

const DEFAULT_CONFIG = {
  ttl: 300,
  netRevenue: true,
  currency: 'USD',
  version: '1.0.0'
};

/**
 * Creates an ORTB converter with common dx functionality
 * @param {Object} config - Adapter-specific configuration
 * @returns {Object} ORTB converter instance
 */
export function createDxConverter(config) {
  return ortbConverter({
    context: {
      netRevenue: config.netRevenue || DEFAULT_CONFIG.netRevenue,
      ttl: config.ttl || DEFAULT_CONFIG.ttl
    },
    imp(buildImp, bidRequest, context) {
      const imp = buildImp(bidRequest, context);

      if (!imp.bidfloor) {
        imp.bidfloor = bidRequest.params.bidfloor || 0;
        imp.bidfloorcur = bidRequest.params.currency || config.currency || DEFAULT_CONFIG.currency;
      }
      return imp;
    },
    request(buildRequest, imps, bidderRequest, context) {
      const req = buildRequest(imps, bidderRequest, context);
      mergeDeep(req, {
        ext: {
          hb: 1,
          prebidver: '$prebid.version$',
          adapterver: config.version || DEFAULT_CONFIG.version,
        }
      });

      // Attaching GDPR Consent Params
      if (bidderRequest.gdprConsent) {
        deepSetValue(req, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
        deepSetValue(req, 'regs.ext.gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
      }

      // CCPA
      if (bidderRequest.uspConsent) {
        deepSetValue(req, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      }

      return req;
    },
    bidResponse(buildBidResponse, bid, context) {
      let resMediaType;
      const {bidRequest} = context;

      if (bid.adm && bid.adm.trim().startsWith('<VAST')) {
        resMediaType = VIDEO;
      } else {
        resMediaType = BANNER;
      }

      context.mediaType = resMediaType;
      context.currency = config.currency || DEFAULT_CONFIG.currency;

      if (resMediaType === VIDEO) {
        context.vastXml = bid.adm;
      }

      const bidResponse = buildBidResponse(bid, context);

      if (resMediaType === VIDEO &&
          bidRequest.mediaTypes &&
          bidRequest.mediaTypes.video &&
          bidRequest.mediaTypes.video.context === 'outstream') {
        bidResponse.renderer = createOutstreamRenderer(bidResponse, config);
      }

      return bidResponse;
    }
  });
}

/**
 * Creates an outstream renderer
 * @param {Object} bid - Bid response object
 * @param {Object} config - Adapter configuration
 * @returns {Object} Renderer instance
 */
export function createOutstreamRenderer(bid, config) {
  const rendererConfig = {
    width: bid.width,
    height: bid.height,
    vastTimeout: 5000,
    maxAllowedVastTagRedirects: 3,
    allowVpaid: false,
    autoPlay: true,
    preload: true,
    mute: false
  };

  const renderer = Renderer.install({
    id: bid.adId,
    url: config.rendererUrl,
    config: rendererConfig,
    loaded: false,
    targetId: bid.adUnitCode,
    adUnitCode: bid.adUnitCode
  });

  try {
    renderer.setRender(function (bid) {
      bid.renderer.push(() => {
        const { id, config } = bid.renderer;
        window.dxOutstreamPlayer(bid, id, config);
      });
    });
  } catch (err) {
    logWarn(`${config.code}: Prebid Error calling setRender on renderer`, err);
  }

  return renderer;
}

/**
 * Media type detection utilities
 */
export const MediaTypeUtils = {
  hasBanner(bidRequest) {
    return !!deepAccess(bidRequest, 'mediaTypes.banner');
  },

  hasVideo(bidRequest) {
    return !!deepAccess(bidRequest, 'mediaTypes.video');
  },

  detectContext(validBidRequests) {
    if (validBidRequests.some(req => this.hasVideo(req))) {
      return VIDEO;
    }
    return BANNER;
  }
};

/**
 * Common validation functions
 */
export const ValidationUtils = {
  validateParams(bidRequest, adapterCode) {
    if (!bidRequest.params) {
      return false;
    }

    if (bidRequest.params.e2etest) {
      return true;
    }

    if (!bidRequest.params.publisherId) {
      logError(`${adapterCode}: Validation failed: publisherId not declared`);
      return false;
    }

    if (!bidRequest.params.placementId) {
      logError(`${adapterCode}: Validation failed: placementId not declared`);
      return false;
    }

    const mediaTypesExists = MediaTypeUtils.hasVideo(bidRequest) || MediaTypeUtils.hasBanner(bidRequest);
    if (!mediaTypesExists) {
      return false;
    }

    return true;
  },

  validateBanner(bidRequest) {
    if (!MediaTypeUtils.hasBanner(bidRequest)) {
      return true;
    }

    const banner = deepAccess(bidRequest, 'mediaTypes.banner');
    if (!Array.isArray(banner.sizes)) {
      return false;
    }

    return true;
  },

  validateVideo(bidRequest, adapterCode) {
    if (!MediaTypeUtils.hasVideo(bidRequest)) {
      return true;
    }

    const videoPlacement = deepAccess(bidRequest, 'mediaTypes.video', {});
    const videoBidderParams = deepAccess(bidRequest, 'params.video', {});
    const params = deepAccess(bidRequest, 'params', {});

    if (params && params.e2etest) {
      return true;
    }

    const videoParams = {
      ...videoPlacement,
      ...videoBidderParams
    };

    if (!Array.isArray(videoParams.mimes) || videoParams.mimes.length === 0) {
      logError(`${adapterCode}: Validation failed: mimes are invalid`);
      return false;
    }

    if (!Array.isArray(videoParams.protocols) || videoParams.protocols.length === 0) {
      logError(`${adapterCode}: Validation failed: protocols are invalid`);
      return false;
    }

    if (!videoParams.context) {
      logError(`${adapterCode}: Validation failed: context id not declared`);
      return false;
    }

    if (videoParams.context !== 'instream') {
      logError(`${adapterCode}: Validation failed: only context instream is supported`);
      return false;
    }

    if (typeof videoParams.playerSize === 'undefined' || !Array.isArray(videoParams.playerSize) || !Array.isArray(videoParams.playerSize[0])) {
      logError(`${adapterCode}: Validation failed: player size not declared or is not in format [[w,h]]`);
      return false;
    }

    return true;
  }
};

/**
 * URL building utilities
 */
export const UrlUtils = {
  buildEndpoint(baseUrl, publisherId, placementId, config) {
    const paramName = config.publisherParam || 'publisher_id';
    const placementParam = config.placementParam || 'placement_id';

    let url = `${baseUrl}?${paramName}=${publisherId}`;

    if (placementId) {
      url += `&${placementParam}=${placementId}`;
    }

    return url;
  }
};

/**
 * User sync utilities
 */
export const UserSyncUtils = {
  processUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, adapterCode) {
    logInfo(`${adapterCode}.getUserSyncs`, 'syncOptions', syncOptions, 'serverResponses', serverResponses);

    const syncResults = [];
    const canIframe = syncOptions.iframeEnabled;
    const canPixel = syncOptions.pixelEnabled;

    if (!canIframe && !canPixel) {
      return syncResults;
    }

    for (const response of serverResponses) {
      const syncData = deepAccess(response, 'body.ext.usersync');
      if (!syncData) continue;

      const allSyncItems = [];
      for (const syncInfo of Object.values(syncData)) {
        if (syncInfo.syncs && Array.isArray(syncInfo.syncs)) {
          allSyncItems.push(...syncInfo.syncs);
        }
      }

      for (const syncItem of allSyncItems) {
        const isIframeSync = syncItem.type === 'iframe';
        let finalUrl = syncItem.url;

        if (isIframeSync) {
          const urlParams = [];
          if (gdprConsent) {
            urlParams.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
            urlParams.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`);
          }
          if (uspConsent) {
            urlParams.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
          }
          if (urlParams.length) {
            finalUrl = `${syncItem.url}?${urlParams.join('&')}`;
          }
        }

        const syncType = isIframeSync ? 'iframe' : 'image';
        const shouldInclude = (isIframeSync && canIframe) || (!isIframeSync && canPixel);

        if (shouldInclude) {
          syncResults.push({
            type: syncType,
            url: finalUrl
          });
        }
      }
    }

    if (canIframe && canPixel) {
      return syncResults.filter(s => s.type === 'iframe');
    } else if (canIframe) {
      return syncResults.filter(s => s.type === 'iframe');
    } else if (canPixel) {
      return syncResults.filter(s => s.type === 'image');
    }

    logInfo(`${adapterCode}.getUserSyncs result=%o`, syncResults);
    return syncResults;
  }
};
