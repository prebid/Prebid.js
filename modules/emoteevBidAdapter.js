import {registerBidder} from '../src/adapters/bidderFactory';
import {BANNER} from '../src/mediaTypes';
import * as utils from '../src/utils';
import {config} from '../src/config';

export const BIDDER_CODE = 'emoteev';
export const AK_PBJS_VERSION = '1.35.0';

export const EMOTEEV_BASE_URL = 'https://prebid.emoteev.io';
export const EMOTEEV_BASE_URL_STAGING = 'https://prebid-staging.emoteev.io';
export const EMOTEEV_BASE_URL_DEVELOPMENT = 'http://localhost:3000';

export const ENDPOINT_PATH = '/api/prebid/bid';
export const USER_SYNC_IFRAME_URL_PATH = '/api/prebid/sync-iframe';
export const USER_SYNC_IMAGE_URL_PATH = '/api/prebid/sync-image';

export const PRODUCTION = 'production';
export const STAGING = 'staging';
export const DEVELOPMENT = 'development';
export const DEFAULT_ENV = PRODUCTION;

export const conformBidRequest = bidRequest => {
  return {
    params: bidRequest.params,
    crumbs: bidRequest.crumbs,
    sizes: bidRequest.sizes,
    bidId: bidRequest.bidId,
    bidderRequestId: bidRequest.bidderRequestId,
  };
};

export const emoteevDebug = (parameterDebug, configDebug) => {
  if (parameterDebug && parameterDebug.length && parameterDebug.length > 0) return JSON.parse(parameterDebug);
  else if (configDebug) return configDebug;
  else return false;
};

export const emoteevEnv = (parameteremoteevEnv, configemoteevEnv) => {
  if (utils.contains([PRODUCTION, STAGING, DEVELOPMENT], parameteremoteevEnv)) return parameteremoteevEnv;
  else if (utils.contains([PRODUCTION, STAGING, DEVELOPMENT], configemoteevEnv)) return configemoteevEnv;
  else return DEFAULT_ENV;
};

export const emoteevOverrides = (parameteremoteevOverrides, configemoteevOverrides) => {
  if (parameteremoteevOverrides && parameteremoteevOverrides.length !== 0) {
    let parsedParams = null;
    try {
      parsedParams = JSON.parse(parameteremoteevOverrides);
    } catch (error) {
      parsedParams = null;
    }
    if (parsedParams) return parsedParams;
  }
  if (configemoteevOverrides && Object.keys(configemoteevOverrides).length !== 0) return configemoteevOverrides;
  else return {};
};

export const akUrl = (environment) => {
  switch (environment) {
    case DEVELOPMENT:
      return EMOTEEV_BASE_URL_DEVELOPMENT;
    case STAGING:
      return EMOTEEV_BASE_URL_STAGING;
    default:
      return EMOTEEV_BASE_URL;
  }
};

export const endpointUrl = (parameteremoteevEnv, configemoteevEnv) => akUrl(emoteevEnv(parameteremoteevEnv, configemoteevEnv)).concat(ENDPOINT_PATH);
export const userSyncIframeUrl = (parameteremoteevEnv, configemoteevEnv) => akUrl(emoteevEnv(parameteremoteevEnv, configemoteevEnv)).concat(USER_SYNC_IFRAME_URL_PATH);
export const userSyncImageUrl = (parameteremoteevEnv, configemoteevEnv) => akUrl(emoteevEnv(parameteremoteevEnv, configemoteevEnv)).concat(USER_SYNC_IMAGE_URL_PATH);

export const getViewDimensions = () => {
  let w = window;
  let prefix = 'inner';

  if (window.innerWidth === undefined || window.innerWidth === null) {
    w = document.documentElement || document.body;
    prefix = 'client';
  }

  return {
    width: w[`${prefix}Width`],
    height: w[`${prefix}Height`],
  };
};

export const getDeviceDimensions = () => {
  return {
    width: window.screen ? window.screen.width : '',
    height: window.screen ? window.screen.height : '',
  };
};

export const getDocumentDimensions = () => {
  const de = document.documentElement;
  const be = document.body;

  const bodyHeight = be ? Math.max(be.offsetHeight, be.scrollHeight) : 0;

  const w = Math.max(de.clientWidth, de.offsetWidth, de.scrollWidth);
  const h = Math.max(
    de.clientHeight,
    de.offsetHeight,
    de.scrollHeight,
    bodyHeight
  );

  return {
    width: isNaN(w) ? '' : w,
    height: isNaN(h) ? '' : h,
  };
};

export const isWebGLEnabled = () => {
  // Create test canvas
  let canvas = document.createElement('canvas');

  // The gl context
  let gl = null;

  // Try to get the regular WebGL
  try {
    gl = canvas.getContext('webgl');
  } catch (ex) {
    canvas = undefined;
    return false;
  }

  // No regular WebGL found
  if (!gl) {
    // Try experimental WebGL
    try {
      gl = canvas.getContext('experimental-webgl');
    } catch (ex) {
      canvas = undefined;
      return false;
    }
  }

  return !!gl;
};

export const getDeviceInfo = (deviceDimensions, viewDimensions, documentDimensions, webGL) => {
  return {
    browserWidth: viewDimensions.width,
    browserHeight: viewDimensions.height,
    deviceWidth: deviceDimensions.width,
    deviceHeight: deviceDimensions.height,
    documentWidth: documentDimensions.width,
    documentHeight: documentDimensions.height,
    webGL: webGL,
  };
};

const validateSizes = sizes => utils.isArray(sizes) && sizes.some(size => utils.isArray(size) && size.length === 2);

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => {
    return !!(
      bid &&
      bid.params &&
      bid.params.adSpaceId &&
      bid.bidder === BIDDER_CODE &&
      validateSizes(bid.mediaTypes.banner.sizes)
    );
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    const payload = Object.assign({},
      {
        akPbjsVersion: AK_PBJS_VERSION,
        bidRequests: validBidRequests.map(conformBidRequest),
        currency: config.getConfig('currency'),
        debug: emoteevDebug(utils.getParameterByName('emoteevDebug'), config.getConfig('emoteev.debug')),
        language: navigator.language,
        refererInfo: bidderRequest.refererInfo,
        deviceInfo: getDeviceInfo(getDeviceDimensions(), getViewDimensions(), getDocumentDimensions(), isWebGLEnabled()),
        userAgent: navigator.userAgent,
      },
      emoteevOverrides(utils.getParameterByName('emoteevOverrides'), config.getConfig('emoteev.overrides')));

    return {
      method: 'POST',
      url: endpointUrl(utils.getParameterByName('emoteevEnv'), config.getConfig('emoteev.env')),
      data: JSON.stringify(payload),
    };
  },

  interpretResponse: (serverResponse) => serverResponse.body,

  getUserSyncs: (syncOptions, serverResponses) => {
    const parameteremoteevEnv = utils.getParameterByName('emoteev.env');
    const configemoteevEnv = config.getConfig('emoteev.env');
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: userSyncIframeUrl(parameteremoteevEnv, configemoteevEnv),
      });
    }
    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'image',
        url: userSyncImageUrl(parameteremoteevEnv, configemoteevEnv),
      });
    }
    return syncs;
  },
};
registerBidder(spec);
