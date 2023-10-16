import {
  logInfo,
  logError,
  logMessage,
  deepAccess,
  deepSetValue,
  mergeDeep
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

const BIDDER_CODE = 'dxkulture';
const DEFAULT_BID_TTL = 300;
const DEFAULT_NET_REVENUE = true;
const DEFAULT_CURRENCY = 'USD';
const SYNC_URL = 'https://ads.kulture.media/usync';

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (!imp.bidfloor) {
      imp.bidfloor = bidRequest.params.bidfloor || 0;
      imp.bidfloorcur = bidRequest.params.currency || DEFAULT_CURRENCY;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    mergeDeep(req, {
      ext: {
        hb: 1,
        prebidver: '$prebid.version$',
        adapterver: '1.0.0',
      }
    })

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
    if (bid.adm?.trim().startsWith('<VAST')) {
      resMediaType = VIDEO;
    } else {
      resMediaType = BANNER;
    }

    const isADomainPresent = bid.adomain && bid.adomain.length;

    if (isADomainPresent) {
      context.meta = {
        advertiserDomains: bid.adomain
      };
    }

    context.mediaType = resMediaType;
    context.currency = DEFAULT_CURRENCY;

    if (resMediaType === VIDEO) {
      context.vastXml = bid.adm;
    }

    const bidResponse = buildBidResponse(bid, context);

    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,
  VERSION: '1.0.0',
  supportedMediaTypes: [BANNER, VIDEO],
  ENDPOINT: 'https://ads.kulture.media/pbjs',

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bidRequest The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return (
      _validateParams(bid) &&
      _validateBanner(bid) &&
      _validateVideo(bid)
    );
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let contextMediaType = BANNER;

    if (hasVideoMediaType(validBidRequests)) {
      contextMediaType = VIDEO;
    }

    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest, context: {contextMediaType} });

    let publisherId = validBidRequests[0].params.publisherId;
    let placementId = validBidRequests[0].params.placementId;

    if (validBidRequests[0].params.e2etest) {
      logMessage('dxkulture: E2E test mode enabled');
      publisherId = 'e2etest'
    }
    let baseEndpoint = spec.ENDPOINT + '?pid=' + publisherId;

    if (placementId) {
      baseEndpoint += '&placementId=' + placementId
    }

    return {
      method: 'POST',
      url: baseEndpoint,
      data: data
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bids = converter.fromORTB({response: serverResponse.body, request: bidRequest.data}).bids;
    return bids;
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    logInfo('dxkulture.getUserSyncs', 'syncOptions', syncOptions, 'serverResponses', serverResponses);

    let syncs = [];

    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return syncs;
    }

    if (syncOptions.iframeEnabled || syncOptions.pixelEnabled) {
      let pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
      let queryParamStrings = [];
      let syncUrl = SYNC_URL;
      if (gdprConsent) {
        queryParamStrings.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
        queryParamStrings.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
      }
      if (uspConsent) {
        queryParamStrings.push('us_privacy=' + encodeURIComponent(uspConsent));
      }

      return [{
        type: pixelType,
        url: `${syncUrl}${queryParamStrings.length > 0 ? '?' + queryParamStrings.join('&') : ''}`
      }];
    }
  }

};

/* =======================================
 * Util Functions
 *======================================= */

function hasBannerMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.banner');
}

function hasVideoMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.video');
}

function _validateParams(bidRequest) {
  if (!bidRequest.params) {
    return false;
  }

  if (bidRequest.params.e2etest) {
    return true;
  }

  if (!bidRequest.params.publisherId) {
    logError('dxkulture: Validation failed: publisherId not declared');
    return false;
  }

  if (!bidRequest.params.placementId) {
    logError('dxkulture: Validation failed: placementId not declared');
    return false;
  }

  const mediaTypesExists = hasVideoMediaType(bidRequest) || hasBannerMediaType(bidRequest);
  if (!mediaTypesExists) {
    return false;
  }

  return true;
}

/**
 * Validates banner bid request. If it is not banner media type returns true.
 * @param {object} bid, bid to validate
 * @return boolean, true if valid, otherwise false
 */
function _validateBanner(bidRequest) {
  // If there's no banner no need to validate
  if (!hasBannerMediaType(bidRequest)) {
    return true;
  }
  const banner = deepAccess(bidRequest, 'mediaTypes.banner');
  if (!Array.isArray(banner.sizes)) {
    return false;
  }

  return true;
}

/**
 * Validates video bid request. If it is not video media type returns true.
 * @param {object} bid, bid to validate
 * @return boolean, true if valid, otherwise false
 */
function _validateVideo(bidRequest) {
  // If there's no video no need to validate
  if (!hasVideoMediaType(bidRequest)) {
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
    ...videoBidderParams // Bidder Specific overrides
  };

  if (!Array.isArray(videoParams.mimes) || videoParams.mimes.length === 0) {
    logError('dxkulture: Validation failed: mimes are invalid');
    return false;
  }

  if (!Array.isArray(videoParams.protocols) || videoParams.protocols.length === 0) {
    logError('dxkulture: Validation failed: protocols are invalid');
    return false;
  }

  if (!videoParams.context) {
    logError('dxkulture: Validation failed: context id not declared');
    return false;
  }

  if (videoParams.context !== 'instream') {
    logError('dxkulture: Validation failed: only context instream is supported ');
    return false;
  }

  if (typeof videoParams.playerSize === 'undefined' || !Array.isArray(videoParams.playerSize) || !Array.isArray(videoParams.playerSize[0])) {
    logError('dxkulture: Validation failed: player size not declared or is not in format [[w,h]]');
    return false;
  }

  return true;
}

registerBidder(spec);
