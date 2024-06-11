import {deepAccess, deepSetValue, isBoolean, isNumber, isStr, logError, logInfo} from '../src/utils.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {ajax} from '../src/ajax.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'aidem';
const BASE_URL = 'https://zero.aidemsrv.com';
const LOCAL_BASE_URL = 'http://127.0.0.1:8787';

const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO];
const REQUIRED_VIDEO_PARAMS = [ 'mimes', 'protocols', 'context' ];

export const ERROR_CODES = {
  BID_SIZE_INVALID_FORMAT: 1,
  BID_SIZE_NOT_INCLUDED: 2,
  PROPERTY_NOT_INCLUDED: 3,
  SITE_ID_INVALID_VALUE: 4,
  MEDIA_TYPE_NOT_SUPPORTED: 5,
  PUBLISHER_ID_INVALID_VALUE: 6,
  INVALID_RATELIMIT: 7,
  PLACEMENT_ID_INVALID_VALUE: 8,
};

const endpoints = {
  request: `${BASE_URL}/prebidjs/ortb/v2.6/bid/request`,
  // notice: {
  //   win: `${BASE_URL}/notice/win`,
  //   timeout: `${BASE_URL}/notice/timeout`,
  //   error: `${BASE_URL}/notice/error`,
  // }
};

export function setEndPoints(env = null, path = '') {
  switch (env) {
    case 'local':
      endpoints.request = `${LOCAL_BASE_URL}${path}/prebidjs/ortb/v2.6/bid/request`;
      break;
    case 'main':
      endpoints.request = `${BASE_URL}${path}/prebidjs/ortb/v2.6/bid/request`;
      break;
  }
  return endpoints;
}

config.getConfig('aidem', function (config) {
  if (config.aidem.env) { setEndPoints(config.aidem.env, config.aidem.path); }
});

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  },
  request(buildRequest, imps, bidderRequest, context) {
    logInfo('Building request');
    const request = buildRequest(imps, bidderRequest, context);
    deepSetValue(request, 'at', 1);
    setPrebidRequestEnvironment(request);
    deepSetValue(request, 'regs', getRegs(bidderRequest));
    deepSetValue(request, 'site.publisher.id', bidderRequest.bids[0].params.publisherId);
    deepSetValue(request, 'site.id', bidderRequest.bids[0].params.siteId);
    return request;
  },
  imp(buildImp, bidRequest, context) {
    logInfo('Building imp bidRequest', bidRequest);
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'tagId', bidRequest.params.placementId);
    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const {bidRequest} = context;
    const bidResponse = buildBidResponse(bid, context);
    logInfo('Building bidResponse');
    logInfo('bid', bid);
    logInfo('bidRequest', bidRequest);
    logInfo('bidResponse', bidResponse);
    if (bidResponse.mediaType === VIDEO) {
      deepSetValue(bidResponse, 'vastUrl', bid.adm);
    }
    return bidResponse;
  }
});

// AIDEM Custom FN
function recur(obj) {
  var result = {}; var _tmp;
  for (var i in obj) {
    // enabledPlugin is too nested, also skip functions
    if (!(i === 'enabledPlugin' || typeof obj[i] === 'function')) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        // get props recursively
        _tmp = recur(obj[i]);
        // if object is not {}
        if (Object.keys(_tmp).length) {
          result[i] = _tmp;
        }
      } else {
        // string, number or boolean
        result[i] = obj[i];
      }
    }
  }
  return result;
}

function getRegs(bidderRequest) {
  let regs = {};
  const euConsentManagement = bidderRequest.gdprConsent;
  const usConsentManagement = bidderRequest.uspConsent;
  const coppa = config.getConfig('coppa');
  if (euConsentManagement && euConsentManagement.consentString) {
    deepSetValue(regs, 'gdpr_applies', !!euConsentManagement.consentString);
  } else {
    deepSetValue(regs, 'gdpr_applies', false);
  }
  if (usConsentManagement) {
    deepSetValue(regs, 'usp_applies', true);
    deepSetValue(regs, 'us_privacy', bidderRequest.uspConsent);
  } else {
    deepSetValue(regs, 'usp_applies', false);
  }
  if (isBoolean(coppa)) {
    deepSetValue(regs, 'coppa_applies', !!coppa);
  } else {
    deepSetValue(regs, 'coppa_applies', false);
  }

  return regs;
}

function setPrebidRequestEnvironment(payload) {
  const __navigator = JSON.parse(JSON.stringify(recur(navigator)));
  delete __navigator.plugins;
  deepSetValue(payload, 'environment.ri', getRefererInfo());
  deepSetValue(payload, 'environment.hl', window.history.length);
  deepSetValue(payload, 'environment.nav', __navigator);
  deepSetValue(payload, 'environment.inp.euc', window.encodeURIComponent.name === 'encodeURIComponent' && typeof window.encodeURIComponent.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.eu', window.encodeURI.name === 'encodeURI' && typeof window.encodeURI.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.js', window.JSON.stringify.name === 'stringify' && typeof window.JSON.stringify.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.jp', window.JSON.parse.name === 'parse' && typeof window.JSON.parse.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.ofe', window.Object.fromEntries.name === 'fromEntries' && typeof window.Object.fromEntries.prototype === 'undefined');
  deepSetValue(payload, 'environment.inp.oa', window.Object.assign.name === 'assign' && typeof window.Object.assign.prototype === 'undefined');
  deepSetValue(payload, 'environment.wpar.innerWidth', window.innerWidth);
  deepSetValue(payload, 'environment.wpar.innerHeight', window.innerHeight);
}

function hasValidMediaType(bidRequest) {
  const supported = hasBannerMediaType(bidRequest) || hasVideoMediaType(bidRequest);
  if (!supported) {
    logError('AIDEM Bid Adapter: media type not supported', { bidder: BIDDER_CODE, code: ERROR_CODES.MEDIA_TYPE_NOT_SUPPORTED });
  }
  return supported;
}

function hasBannerMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.banner');
}

function hasVideoMediaType(bidRequest) {
  return !!deepAccess(bidRequest, 'mediaTypes.video');
}

function hasValidBannerMediaType(bidRequest) {
  const sizes = deepAccess(bidRequest, 'mediaTypes.banner.sizes');
  if (!sizes) {
    logError('AIDEM Bid Adapter: media type sizes missing', { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
    return false;
  }
  return true;
}

function hasValidVideoMediaType(bidRequest) {
  const sizes = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
  if (!sizes) {
    logError('AIDEM Bid Adapter: media type playerSize missing', { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
    return false;
  }
  return true;
}

function hasValidVideoParameters(bidRequest) {
  let valid = true;
  const adUnitsParameters = deepAccess(bidRequest, 'mediaTypes.video');
  const bidderParameter = deepAccess(bidRequest, 'params.video');
  for (let property of REQUIRED_VIDEO_PARAMS) {
    const hasAdUnitParameter = adUnitsParameters.hasOwnProperty(property);
    const hasBidderParameter = bidderParameter && bidderParameter.hasOwnProperty(property);
    if (!hasAdUnitParameter && !hasBidderParameter) {
      logError(`AIDEM Bid Adapter: ${property} is not included in either the adunit or params level`, { bidder: BIDDER_CODE, code: ERROR_CODES.PROPERTY_NOT_INCLUDED });
      valid = false;
    }
  }

  return valid;
}

function passesRateLimit(bidRequest) {
  const rateLimit = deepAccess(bidRequest, 'params.rateLimit', 1);
  if (!isNumber(rateLimit) || rateLimit > 1 || rateLimit < 0) {
    logError('AIDEM Bid Adapter: invalid rateLimit (must be a number between 0 and 1)', { bidder: BIDDER_CODE, code: ERROR_CODES.INVALID_RATELIMIT });
    return false;
  }
  if (rateLimit !== 1) {
    const randomRateValue = Math.random();
    if (randomRateValue > rateLimit) {
      return false;
    }
  }
  return true;
}

function hasValidParameters(bidRequest) {
  // Assigned from AIDEM to a publisher website
  const siteId = deepAccess(bidRequest, 'params.siteId');
  const publisherId = deepAccess(bidRequest, 'params.publisherId');

  if (!isStr(siteId)) {
    logError('AIDEM Bid Adapter: siteId must valid string', { bidder: BIDDER_CODE, code: ERROR_CODES.SITE_ID_INVALID_VALUE });
    return false;
  }

  if (!isStr(publisherId)) {
    logError('AIDEM Bid Adapter: publisherId must valid string', { bidder: BIDDER_CODE, code: ERROR_CODES.PUBLISHER_ID_INVALID_VALUE });
    return false;
  }

  return true;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  isBidRequestValid: function(bidRequest) {
    logInfo('bid: ', bidRequest);

    // check if request has valid mediaTypes
    if (!hasValidMediaType(bidRequest)) return false;

    // check if request has valid media type parameters at adUnit level
    if (hasBannerMediaType(bidRequest) && !hasValidBannerMediaType(bidRequest)) {
      return false;
    }

    if (hasVideoMediaType(bidRequest) && !hasValidVideoMediaType(bidRequest)) {
      return false;
    }

    if (hasVideoMediaType(bidRequest) && !hasValidVideoParameters(bidRequest)) {
      return false;
    }

    if (!hasValidParameters(bidRequest)) {
      return false;
    }

    return passesRateLimit(bidRequest);
  },

  buildRequests: function(bidRequests, bidderRequest) {
    logInfo('bidRequests: ', bidRequests);
    logInfo('bidderRequest: ', bidderRequest);
    const data = converter.toORTB({bidRequests, bidderRequest});
    logInfo('request payload', data);
    return {
      method: 'POST',
      url: endpoints.request,
      data,
      options: {
        withCredentials: true
      }
    };
  },

  interpretResponse: function (serverResponse, request) {
    logInfo('serverResponse body: ', serverResponse.body);
    logInfo('request data: ', request.data);
    const ortbBids = converter.fromORTB({response: serverResponse.body, request: request.data}).bids;
    logInfo('ortbBids: ', ortbBids);
    return ortbBids;
  },

  onBidWon: function(bid) {
    // Bidder specific code
    logInfo('onBidWon bid: ', bid);
    ajax(bid.burl);
  },

  // onBidderError: function({ bidderRequest }) {
  //   const notice = buildErrorNotice(bidderRequest);
  //   ajax(endpoints.notice.error, null, JSON.stringify(notice), { method: 'POST', withCredentials: true });
  // },
};
registerBidder(spec);
