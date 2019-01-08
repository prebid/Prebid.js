import {registerBidder} from '../src/adapters/bidderFactory';
import {BANNER} from '../src/mediaTypes';
import * as utils from '../src/utils';
import {config} from '../src/config';

export const BIDDER_CODE = 'adikteev';
export const AK_PBJS_VERSION = '1.35.0';

export const AK_BASE_URL = 'https://prebid.adikteev.com';
export const AK_BASE_URL_STAGING = 'https://prebid-staging.adikteev.com';
export const AK_BASE_URL_DEVELOPMENT = 'http://localhost:3000';

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

export const akDebug = (parameterDebug, configDebug) => {
  if (parameterDebug && parameterDebug.length && parameterDebug.length > 0) return JSON.parse(parameterDebug);
  else if (configDebug) return configDebug;
  else return false;
};

export const akEnv = (parameterAkEnv, configAkEnv) => {
  if (utils.contains([PRODUCTION, STAGING, DEVELOPMENT], parameterAkEnv)) return parameterAkEnv;
  else if (utils.contains([PRODUCTION, STAGING, DEVELOPMENT], configAkEnv)) return configAkEnv;
  else return DEFAULT_ENV;
};

export const akOverrides = (parameterAkOverrides, configAkOverrides) => {
  if (parameterAkOverrides && parameterAkOverrides.length !== 0) {
    let parsedParams = null;
    try {
      parsedParams = JSON.parse(parameterAkOverrides);
    } catch (error) {
      parsedParams = null;
    }
    if (parsedParams) return parsedParams;
  }
  if (configAkOverrides && Object.keys(configAkOverrides).length !== 0) return configAkOverrides;
  else return {};
};

export const akUrl = (environment) => {
  switch (environment) {
    case DEVELOPMENT:
      return AK_BASE_URL_DEVELOPMENT;
    case STAGING:
      return AK_BASE_URL_STAGING;
    default:
      return AK_BASE_URL;
  }
};

export const endpointUrl = (parameterAkEnv, configAkEnv) => akUrl(akEnv(parameterAkEnv, configAkEnv)).concat(ENDPOINT_PATH);
export const userSyncIframeUrl = (parameterAkEnv, configAkEnv) => akUrl(akEnv(parameterAkEnv, configAkEnv)).concat(USER_SYNC_IFRAME_URL_PATH);
export const userSyncImageUrl = (parameterAkEnv, configAkEnv) => akUrl(akEnv(parameterAkEnv, configAkEnv)).concat(USER_SYNC_IMAGE_URL_PATH);

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
      bid.params.placementId &&
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
        debug: akDebug(utils.getParameterByName('akDebug'), config.getConfig('akDebug')),
        language: navigator.language,
        refererInfo: bidderRequest.refererInfo,
        deviceInfo: getDeviceInfo(getDeviceDimensions(), getViewDimensions(), getDocumentDimensions(), isWebGLEnabled()),
        userAgent: navigator.userAgent,
      },
      akOverrides(utils.getParameterByName('akOverrides'), config.getConfig('akOverrides')));

    return {
      method: 'POST',
      url: endpointUrl(utils.getParameterByName('akEnv'), config.getConfig('akEnv')),
      data: JSON.stringify(payload),
    };
  },

  interpretResponse: (serverResponse) => serverResponse.body,

  getUserSyncs: (syncOptions, serverResponses) => {
    const parameterAkEnv = utils.getParameterByName('akEnv');
    const configAkEnv = config.getConfig('akEnv');
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: userSyncIframeUrl(parameterAkEnv, configAkEnv),
      });
    }
    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'image',
        url: userSyncImageUrl(parameterAkEnv, configAkEnv),
      });
    }
    return syncs;
  },
};
registerBidder(spec);
