import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import {loadExternalScript} from '../src/adloader.js';
import {submodule} from '../src/hook.js';
import {
  deepAccess,
  deepSetValue,
  formatQS,
  mergeDeep,
  prefixLog,
} from '../src/utils.js';

const MODULE_NAME = '51Degrees';
export const LOG_PREFIX = `[${MODULE_NAME} RTD Submodule]:`;
const {logMessage, logWarn, logError} = prefixLog(LOG_PREFIX);

// ORTB device types
const ORTB_DEVICE_TYPE = {
  UNKNOWN: 0,
  MOBILE_TABLET: 1,
  PERSONAL_COMPUTER: 2,
  CONNECTED_TV: 3,
  PHONE: 4,
  TABLET: 5,
  CONNECTED_DEVICE: 6,
  SET_TOP_BOX: 7,
  OOH_DEVICE: 8
};

// Map of 51Degrees device types to ORTB device types. See
// https://51degrees.com/developers/property-dictionary?item=Device%7CDevice
// for available properties and values.
const ORTB_DEVICE_TYPE_MAP = new Map([
  ['Phone', ORTB_DEVICE_TYPE.PHONE],
  ['Console', ORTB_DEVICE_TYPE.SET_TOP_BOX],
  ['Desktop', ORTB_DEVICE_TYPE.PERSONAL_COMPUTER],
  ['EReader', ORTB_DEVICE_TYPE.PERSONAL_COMPUTER],
  ['IoT', ORTB_DEVICE_TYPE.CONNECTED_DEVICE],
  ['Kiosk', ORTB_DEVICE_TYPE.OOH_DEVICE],
  ['MediaHub', ORTB_DEVICE_TYPE.SET_TOP_BOX],
  ['Mobile', ORTB_DEVICE_TYPE.MOBILE_TABLET],
  ['Router', ORTB_DEVICE_TYPE.CONNECTED_DEVICE],
  ['SmallScreen', ORTB_DEVICE_TYPE.CONNECTED_DEVICE],
  ['SmartPhone', ORTB_DEVICE_TYPE.PHONE],
  ['SmartSpeaker', ORTB_DEVICE_TYPE.CONNECTED_DEVICE],
  ['SmartWatch', ORTB_DEVICE_TYPE.CONNECTED_DEVICE],
  ['Tablet', ORTB_DEVICE_TYPE.TABLET],
  ['Tv', ORTB_DEVICE_TYPE.CONNECTED_TV],
  ['Vehicle Display', ORTB_DEVICE_TYPE.PERSONAL_COMPUTER]
]);

/**
 * Extracts the parameters for 51Degrees RTD module from the config object passed at instantiation
 * @param {Object} moduleConfig Configuration object of the 51Degrees RTD module
 * @param {Object} reqBidsConfigObj Configuration object for the bidders, currently not used
 */
export const extractConfig = (moduleConfig, reqBidsConfigObj) => {
  // Resource key
  let resourceKey = deepAccess(moduleConfig, 'params.resourceKey');
  // On-premise JS URL
  let onPremiseJSUrl = deepAccess(moduleConfig, 'params.onPremiseJSUrl');

  // Trim the values
  if (typeof resourceKey === 'string') {
    resourceKey = resourceKey.trim();
  }
  if (typeof onPremiseJSUrl === 'string') {
    onPremiseJSUrl = onPremiseJSUrl.trim();
  }

  // If this module is configured via a 3rd party wrapper, both form inputs
  // might be mandatory. To handle this, 0 can be used as a value to skip
  // the parameter.
  if (typeof resourceKey === 'string' && resourceKey.trim() === '0') {
    resourceKey = undefined;
  }
  if (typeof onPremiseJSUrl === 'string' && onPremiseJSUrl.trim() === '0') {
    onPremiseJSUrl = undefined;
  }

  // Verify that onPremiseJSUrl is a valid URL: either a full URL, relative
  // path (/path/to/file.js), or a protocol-relative URL (//example.com/path/to/file.js)
  if (typeof onPremiseJSUrl === 'string' && onPremiseJSUrl.length && !(
    onPremiseJSUrl.startsWith('https://') ||
    onPremiseJSUrl.startsWith('http://') ||
    onPremiseJSUrl.startsWith('/'))
  ) {
    throw new Error(LOG_PREFIX + ' Invalid URL format for onPremiseJSUrl in moduleConfig');
  }

  // Verify that one of the parameters is provided,
  // but not both at the same time
  if (!resourceKey && !onPremiseJSUrl) {
    throw new Error(LOG_PREFIX + ' Missing parameter resourceKey or onPremiseJSUrl in moduleConfig');
  } else if (resourceKey && onPremiseJSUrl) {
    throw new Error(LOG_PREFIX + ' Only one of resourceKey or onPremiseJSUrl should be provided in moduleConfig');
  }

  // Verify that the resource key is not the one provided as an example
  if (resourceKey === '<YOUR_RESOURCE_KEY>') {
    throw new Error(LOG_PREFIX + ' replace <YOUR_RESOURCE_KEY> in configuration with a resource key obtained from https://configure.51degrees.com/HNZ75HT1');
  }

  return {resourceKey, onPremiseJSUrl};
}

/**
 * Gets 51Degrees JS URL
 * @param {Object} pathData API path data
 * @param {string} [pathData.resourceKey] Resource key
 * @param {string} [pathData.onPremiseJSUrl] On-premise JS URL
 * @param {Object<string, any>} [pathData.hev] High entropy values
 * @param {Window} [win] Window object (mainly for testing)
 * @returns {string} 51Degrees JS URL
 */
export const get51DegreesJSURL = (pathData, win) => {
  const _window = win || window;
  const baseURL = pathData.onPremiseJSUrl || `https://cloud.51degrees.com/api/v4/${pathData.resourceKey}.js`;

  const queryPrefix = baseURL.includes('?') ? '&' : '?';
  const qs = {};

  deepSetNotEmptyValue(
    qs,
    '51D_GetHighEntropyValues',
    pathData.hev && Object.keys(pathData.hev).length ? btoa(JSON.stringify(pathData.hev)) : null,
  );
  deepSetNotEmptyValue(qs, '51D_ScreenPixelsHeight', _window?.screen?.height);
  deepSetNotEmptyValue(qs, '51D_ScreenPixelsWidth', _window?.screen?.width);
  deepSetNotEmptyValue(qs, '51D_PixelRatio', _window?.devicePixelRatio);

  const _qs = formatQS(qs);
  const _qsString = _qs ? `${queryPrefix}${_qs}` : '';

  return `${baseURL}${_qsString}`;
}

/**
 * Retrieves high entropy values from `navigator.userAgentData` if available
 *
 * @param {Array<string>} hints - An array of hints indicating which high entropy values to retrieve
 * @returns {Promise<undefined | Object<string, any>>} A promise that resolves to an object containing high entropy values if supported, or `undefined` if not
 */
export const getHighEntropyValues = async (hints) => {
  return navigator?.userAgentData?.getHighEntropyValues?.(hints);
};

/**
 * Check if meta[http-equiv="Delegate-CH"] tag is present in the document head and points to 51Degrees cloud
 *
 * The way to delegate processing User-Agent Client Hints to a 3rd party is either
 * via setting Permissions-Policy + Accept-CH response headers or Delegate-CH meta-http equiv.
 * Of those two, Delegate-CH meta http-equiv is an easier and more performant option
 * (client hints are sent on the very first request without a round trip required).
 * Using the getHighEntropyValues() API is an alternative;
 * however, Google is likely to restrict it as part of the Privacy Sandbox in future
 * versions of Chrome, so we want to be future-proof and transparent here.
 * Hence, a check that would output the warning if the user does not have proper delegation of UA-CH.
 *
 * @returns {boolean} True if 51Degrees meta is present
 * @returns {boolean} False if 51Degrees meta is not present
 */
export const is51DegreesMetaPresent = () => {
  const meta51 = document.head.querySelectorAll('meta[http-equiv="Delegate-CH"]');
  if (!meta51.length) {
    return false;
  }
  return Array.from(meta51).some(
    meta => !meta.content
      ? false
      : meta.content.includes('cloud.51degrees')
  );
}

/**
 * Sets the value of a key in the ORTB2 object if the value is not empty
 *
 * @param {Object} obj The object to set the key in
 * @param {string} key The key to set
 * @param {any} value The value to set
 */
export const deepSetNotEmptyValue = (obj, key, value) => {
  if (!key) {
    throw new Error(LOG_PREFIX + ' Key is required');
  }

  if (value) {
    deepSetValue(obj, key, value);
  }
}

/**
 * Converts all 51Degrees data to ORTB2 format
 *
 * @param {Object} data51 Response from 51Degrees API
 * @param {Object} [data51.device] Device data
 *
 * @returns {Object} Enriched ORTB2 object
 */
export const convert51DegreesDataToOrtb2 = (data51) => {
  let ortb2Data = {};

  if (!data51) {
    return ortb2Data;
  }

  ortb2Data = convert51DegreesDeviceToOrtb2(data51.device);

  // placeholder for the next 51Degrees RTD submodule update

  return ortb2Data;
};

/**
 * Converts 51Degrees device data to ORTB2 format
 *
 * @param {Object} device 51Degrees device object
 * @param {string} [device.deviceid] Device ID (unique 51Degrees identifier)
 * @param {string} [device.devicetype] Device type
 * @param {string} [device.hardwarevendor] Hardware vendor
 * @param {string} [device.hardwaremodel] Hardware model
 * @param {string[]} [device.hardwarename] Hardware name
 * @param {string} [device.platformname] Platform name
 * @param {string} [device.platformversion] Platform version
 * @param {number} [device.screenpixelsheight] Screen height in pixels
 * @param {number} [device.screenpixelswidth] Screen width in pixels
 * @param {number} [device.screenpixelsphysicalheight] Screen physical height in pixels
 * @param {number} [device.screenpixelsphysicalwidth] Screen physical width in pixels
 * @param {number} [device.pixelratio] Pixel ratio
 * @param {number} [device.screeninchesheight] Screen height in inches
 * @param {string} [device.thirdpartycookiesenabled] Third-party cookies enabled
 *
 * @returns {Object} Enriched ORTB2 object
 */
export const convert51DegreesDeviceToOrtb2 = (device) => {
  const ortb2Device = {};

  if (!device) {
    return ortb2Device;
  }

  const deviceModel =
    device.hardwaremodel || (
      device.hardwarename && device.hardwarename.length
        ? device.hardwarename.join(',')
        : null
    );

  const devicePhysicalPPI = device.screenpixelsphysicalheight && device.screeninchesheight
    ? Math.round(device.screenpixelsphysicalheight / device.screeninchesheight)
    : null;

  const devicePPI = device.screenpixelsheight && device.screeninchesheight
    ? Math.round(device.screenpixelsheight / device.screeninchesheight)
    : null;

  deepSetNotEmptyValue(ortb2Device, 'devicetype', ORTB_DEVICE_TYPE_MAP.get(device.devicetype));
  deepSetNotEmptyValue(ortb2Device, 'make', device.hardwarevendor);
  deepSetNotEmptyValue(ortb2Device, 'model', deviceModel);
  deepSetNotEmptyValue(ortb2Device, 'os', device.platformname);
  deepSetNotEmptyValue(ortb2Device, 'osv', device.platformversion);
  deepSetNotEmptyValue(ortb2Device, 'h', device.screenpixelsphysicalheight || device.screenpixelsheight);
  deepSetNotEmptyValue(ortb2Device, 'w', device.screenpixelsphysicalwidth || device.screenpixelswidth);
  deepSetNotEmptyValue(ortb2Device, 'pxratio', device.pixelratio);
  deepSetNotEmptyValue(ortb2Device, 'ppi', devicePhysicalPPI || devicePPI);
  // kept for backward compatibility
  deepSetNotEmptyValue(ortb2Device, 'ext.fiftyonedegrees_deviceId', device.deviceid);
  deepSetNotEmptyValue(ortb2Device, 'ext.fod.deviceId', device.deviceid);
  if (['True', 'False'].includes(device.thirdpartycookiesenabled)) {
    deepSetValue(ortb2Device, 'ext.fod.tpc', device.thirdpartycookiesenabled === 'True' ? 1 : 0);
  }

  return {device: ortb2Device};
}

/**
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {Object} moduleConfig Configuration for 1plusX RTD module
 * @param {Object} userConsent
 */
export const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  try {
    // Get the required config
    const {resourceKey, onPremiseJSUrl} = extractConfig(moduleConfig, reqBidsConfigObj);
    logMessage('Resource key: ', resourceKey);
    logMessage('On-premise JS URL: ', onPremiseJSUrl);

    // Check if 51Degrees meta is present (cloud only)
    if (resourceKey) {
      logMessage('Checking if 51Degrees meta is present in the document head');
      if (!is51DegreesMetaPresent()) {
        logWarn('Delegate-CH meta tag is not present in the document head');
      }
    }

    getHighEntropyValues(['model', 'platform', 'platformVersion', 'fullVersionList']).then((hev) => {
      // Get 51Degrees JS URL, which is either cloud or on-premise
      const scriptURL = get51DegreesJSURL({resourceKey, onPremiseJSUrl, hev});
      logMessage('URL of the script to be injected: ', scriptURL);

      // Inject 51Degrees script, get device data and merge it into the ORTB2 object
      loadExternalScript(scriptURL, MODULE_TYPE_RTD, MODULE_NAME, () => {
        logMessage('Successfully injected 51Degrees script');
        const fod = /** @type {Object} */ (window.fod);
        // Convert and merge device data in the callback
        fod.complete((data) => {
          logMessage('51Degrees raw data: ', data);
          mergeDeep(
            reqBidsConfigObj.ortb2Fragments.global,
            convert51DegreesDataToOrtb2(data),
          );
          logMessage('reqBidsConfigObj: ', reqBidsConfigObj);
          callback();
        });
      }, document, {crossOrigin: 'anonymous'});
    });
  } catch (error) {
    // In case of an error, log it and continue
    logError(error);
    callback();
  }
}

/**
 * Init
 * @param {Object} config Module configuration
 * @param {boolean} userConsent User consent
 * @returns true
 */
const init = (config, userConsent) => {
  return true;
}

// 51Degrees RTD submodule object to be registered
export const fiftyOneDegreesSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
}

submodule('realTimeData', fiftyOneDegreesSubmodule);
