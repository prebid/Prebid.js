import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { loadExternalScript } from '../src/adloader.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  deepAccess,
  deepSetValue,
  formatQS,
  mergeDeep,
  prefixLog,
} from '../src/utils.js';
import { getDevicePixelRatio } from '../libraries/devicePixelRatio/devicePixelRatio.js';
import { highEntropySUAAccessor } from '../src/fpd/sua.js';

const MODULE_NAME = '51Degrees';
export const LOG_PREFIX = `[${MODULE_NAME} RTD Submodule]:`;
const { logMessage, logWarn, logError } = prefixLog(LOG_PREFIX);

// The Model Terms for Marketing, published by the Movement for an Open
// Web, which every party sending or receiving a 51Did is bound by. They
// are the legal basis a receiver acts under, so they are named on every
// 51d.es eids entry rather than left for the receiver to find. The
// document is versioned and cannot be changed once published, which is
// what the Terms Document Locator specification asks of a terms
// document. A publisher's own TDL is listed after this one, being the
// more specific statement, and never in place of it.
export const MODEL_TERMS_URL = 'https://m4ow.uk/mtm/2.txt';

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

  return { resourceKey, onPremiseJSUrl };
};

/**
 * Gets 51Degrees JS URL
 * @param {Object} pathData API path data
 * @param {string} [pathData.resourceKey] Resource key
 * @param {string} [pathData.onPremiseJSUrl] On-premise JS URL
 * @param {Object<string, any>} [pathData.hev] High entropy values
 * @param {string} [pathData.tcString] TCF consent string to forward as tcstring
 * @param {string} [pathData.gpp] GPP string to forward as gppstring
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
  deepSetNotEmptyValue(qs, '51D_PixelRatio', getDevicePixelRatio(_window));
  // id.usage contains a dot, so set it directly.
  if (pathData.idUsage) {
    qs['id.usage'] = pathData.idUsage;
  }
  if (pathData.tcString) {
    qs.tcstring = pathData.tcString;
  }
  if (pathData.gpp) {
    qs.gppstring = pathData.gpp;
  }

  const _qs = formatQS(qs);
  const _qsString = _qs ? `${queryPrefix}${_qs}` : '';

  return `${baseURL}${_qsString}`;
};

/**
 * Retrieves high entropy values from `navigator.userAgentData` if available
 *
 * @param {Array<string>} hints - An array of hints indicating which high entropy values to retrieve
 * @returns {Promise<undefined | Object<string, any>>} A promise that resolves to an object containing high entropy values if supported, or `undefined` if not
 */
const getHighEntropySUA = highEntropySUAAccessor();

function joinVersion(version) {
  return Array.isArray(version) ? version.join('.') : version;
}

/**
 * Retrieves high entropy values from `navigator.userAgentData` if available
 *
 * @param {Array<string>} hints - An array of hints indicating which high entropy values to retrieve
 * @returns {Promise<undefined | Object<string, any>>} A promise that resolves to an object containing high entropy values if supported, or `undefined` if not
 */
export const getHighEntropyValues = async (hints) => {
  const sua = await getHighEntropySUA(hints);
  if (!sua) {
    return undefined;
  }

  return {
    model: sua.model,
    platform: sua.platform?.brand,
    platformVersion: joinVersion(sua.platform?.version),
    fullVersionList: sua.browsers?.map(({ brand, version }) => ({
      brand,
      version: joinVersion(version),
    })),
  };
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
};

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
};

/**
 * Converts all 51Degrees data to ORTB2 format
 *
 * @param {Object} data51 Response from 51Degrees API
 * @param {Object} [data51.device] Device data
 * @param {Object} [data51.ip] IP data (device.ip/ipv6 + device.geo)
 * @param {Object} [data51.fodid] 51DiD data (mapped to user.eids)
 * @param {Object} [options]
 * @param {string} [options.tdlUrl] TDL URL passed through to the EID entry
 *
 * @returns {Object} Enriched ORTB2 object
 */
export const convert51DegreesDataToOrtb2 = (data51, options = {}) => {
  const ortb2Data = {};

  if (!data51) {
    return ortb2Data;
  }

  mergeDeep(ortb2Data, convert51DegreesDeviceToOrtb2(data51.device));
  mergeDeep(ortb2Data, convert51DegreesIpToOrtb2(data51.ip));
  mergeDeep(ortb2Data, convert51DegreesFoDiDToOrtb2(data51.fodid, options.tdlUrl));

  return ortb2Data;
};

// The payload can come from an on-page integration the module does not
// control, so only values of the expected primitive type are merged.
const asString = (value) => (typeof value === 'string' && value.length > 0) ? value : undefined;
const asNumber = (value) => (typeof value === 'number' && isFinite(value)) ? value : undefined;

/**
 * Converts 51Degrees device data to ORTB2 format
 *
 * @param {Object} device 51Degrees device object
 * @param {string} [device.deviceid] Device ID (unique 51Degrees identifier)
 * @param {string} [device.devicetype] Device type
 * @param {string} [device.hardwarevendor] Hardware vendor
 * @param {string} [device.hardwaremodel] Hardware model
 * @param {string[]} [device.hardwarename] Hardware name
 * @param {string} [device.hardwarenameprefix] Hardware name prefix (e.g. "iPhone" from "iPhone 12 Pro Max")
 * @param {string} [device.hardwarenameversion] Hardware name version (e.g. "12 Pro Max" from "iPhone 12 Pro Max")
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
    asString(device.hardwarenameprefix) ||
    asString(device.hardwaremodel) || (
      Array.isArray(device.hardwarename) && device.hardwarename.length
        ? device.hardwarename.join(',')
        : null
    );

  const devicePhysicalPPI = asNumber(device.screenpixelsphysicalheight) && asNumber(device.screeninchesheight)
    ? Math.round(device.screenpixelsphysicalheight / device.screeninchesheight)
    : null;

  const devicePPI = asNumber(device.screenpixelsheight) && asNumber(device.screeninchesheight)
    ? Math.round(device.screenpixelsheight / device.screeninchesheight)
    : null;

  deepSetNotEmptyValue(ortb2Device, 'devicetype', ORTB_DEVICE_TYPE_MAP.get(device.devicetype));
  deepSetNotEmptyValue(ortb2Device, 'make', asString(device.hardwarevendor));
  deepSetNotEmptyValue(ortb2Device, 'model', deviceModel);
  deepSetNotEmptyValue(ortb2Device, 'hwv', asString(device.hardwarenameversion));
  deepSetNotEmptyValue(ortb2Device, 'os', asString(device.platformname));
  deepSetNotEmptyValue(ortb2Device, 'osv', asString(device.platformversion));
  deepSetNotEmptyValue(ortb2Device, 'h', asNumber(device.screenpixelsphysicalheight) || asNumber(device.screenpixelsheight));
  deepSetNotEmptyValue(ortb2Device, 'w', asNumber(device.screenpixelsphysicalwidth) || asNumber(device.screenpixelswidth));
  deepSetNotEmptyValue(ortb2Device, 'pxratio', asNumber(device.pixelratio));
  deepSetNotEmptyValue(ortb2Device, 'ppi', devicePhysicalPPI || devicePPI);
  deepSetNotEmptyValue(ortb2Device, 'ext.fod.deviceId', asString(device.deviceid));
  if (['True', 'False'].includes(device.thirdpartycookiesenabled)) {
    deepSetValue(ortb2Device, 'ext.fod.tpc', device.thirdpartycookiesenabled === 'True' ? 1 : 0);
  }

  return { device: ortb2Device };
};

/**
 * Converts 51Degrees IP data to ORTB2 format. Maps device.ip, device.ipv6,
 * and (when locationconfidence is high/medium) device.geo.* fields.
 *
 * @param {Object} ip 51Degrees ip object
 * @param {string} [ip.ip] IPv4 address
 * @param {string} [ip.ipv6] IPv6 address
 * @param {string} [ip.locationconfidence] high|medium gates geo fields
 * @param {number} [ip.latitude]
 * @param {number} [ip.longitude]
 * @param {string} [ip.countrycode3] ISO-3166-1 alpha-3
 * @param {string} [ip.iso31662lvl4] ISO-3166-2 subdivision code (e.g. GB-ENG)
 * @param {string} [ip.zipcode]
 * @param {number} [ip.timezoneoffset] minutes from UTC
 * @param {number} [ip.accuracyradiusmin] km (multiplied by 1000 in output to convert to meters)
 * @returns {Object} Enriched ORTB2 object fragment ({device:{...}})
 */
export const convert51DegreesIpToOrtb2 = (ip) => {
  const ortb2 = {};

  if (!ip) {
    return ortb2;
  }

  // device.ip / device.ipv6 are not gated on confidence.
  deepSetNotEmptyValue(ortb2, 'device.ip', asString(ip.ip));
  deepSetNotEmptyValue(ortb2, 'device.ipv6', asString(ip.ipv6));

  const confidence = typeof ip.locationconfidence === 'string'
    ? ip.locationconfidence.toLowerCase()
    : undefined;
  let ipservice;
  if (confidence === 'high') {
    ipservice = 511;
  } else if (confidence === 'medium') {
    ipservice = 512;
  } else {
    return ortb2;
  }

  // Use null/undefined checks rather than truthy checks so 0 coordinates
  // (Gulf of Guinea) and 0 accuracy survive.
  const setIfDefined = (key, value) => {
    if (value !== null && value !== undefined) {
      deepSetValue(ortb2, key, value);
    }
  };

  setIfDefined('device.geo.lat', asNumber(ip.latitude));
  setIfDefined('device.geo.lon', asNumber(ip.longitude));
  deepSetNotEmptyValue(ortb2, 'device.geo.country', asString(ip.countrycode3));
  deepSetNotEmptyValue(ortb2, 'device.geo.region', asString(ip.iso31662lvl4));
  deepSetNotEmptyValue(ortb2, 'device.geo.zip', asString(ip.zipcode));
  setIfDefined('device.geo.utcoffset', asNumber(ip.timezoneoffset));
  const accuracyKm = asNumber(ip.accuracyradiusmin);
  setIfDefined(
    'device.geo.accuracy',
    accuracyKm === undefined ? undefined : accuracyKm * 1000,
  );

  // Only stamp type+ipservice if at least one geo.* field actually landed.
  // Otherwise we'd emit a device.geo with just metadata which is meaningless.
  if (ortb2.device && ortb2.device.geo) {
    deepSetValue(ortb2, 'device.geo.type', 2);
    deepSetValue(ortb2, 'device.geo.ipservice', ipservice);
  }

  return ortb2;
};

// EID match method (mm) and agent type (atype) for each 51Did cloud
// property. The cloud delivers a 51Did under a type-specific property
// name, so the property name carries the type: idprob* is Probabilistic
// (mm 5 Inference, atype 1), idrand* is Random (mm 0 Unknown, atype 1),
// and idhem* is Hashed Email (mm 3 Authenticated, atype 3). mm is an
// eid-level field, so values that share an mm share an entry.
const FODID_EID = {
  idproblic: { mm: 5, atype: 1 },
  idprobglobal: { mm: 5, atype: 1 },
  idrandlic: { mm: 0, atype: 1 },
  idrandglobal: { mm: 0, atype: 1 },
  idhemlic: { mm: 3, atype: 3 },
  idhemglobal: { mm: 3, atype: 3 },
};

/**
 * Converts 51Degrees fodid (51DiD) data to ORTB2 user.eids entries.
 * Each identifier type becomes its own 51d.es source entry, because the
 * match method (mm) is an eid-level field and differs by type:
 * Probabilistic is mm 5 (inference) atype 1, Random is mm 0 (unknown)
 * atype 1, and Hashed Email is mm 3 (authenticated) atype 3. The type
 * comes from which type-specific property the cloud populated (see
 * FODID_EID). A type's license and global values share its entry,
 * license value first. ext.tdl names the Model Terms for Marketing on
 * every entry, followed by the publisher's own TDL when one is
 * configured.
 *
 * @param {Object} fodid 51Degrees fodid object
 * @param {string} [fodid.idproblic] License-tier Probabilistic 51DiD
 * @param {string} [fodid.idprobglobal] Global-tier Probabilistic 51DiD
 * @param {string} [fodid.idrandlic] License-tier Random 51DiD
 * @param {string} [fodid.idrandglobal] Global-tier Random 51DiD
 * @param {string} [fodid.idhemlic] License-tier Hashed Email 51DiD
 * @param {string} [fodid.idhemglobal] Global-tier Hashed Email 51DiD
 * @param {string} [tdlUrl] TDL URL passed from module config
 * @returns {Object} Enriched ORTB2 fragment ({user:{eids:[...]}}) or {} when
 *                   no uids are available
 */
export const convert51DegreesFoDiDToOrtb2 = (fodid, tdlUrl) => {
  if (!fodid) {
    return {};
  }

  // One eids entry per match method (mm is an eid-level field). Iterating
  // FODID_EID keeps a stable order (Probabilistic, then Random, then
  // Hashed Email) and license value before global within each type.
  const byMm = new Map();
  Object.keys(FODID_EID).forEach((prop) => {
    const value = fodid[prop];
    if (!value || typeof value !== 'string') {
      return;
    }
    const { mm, atype } = FODID_EID[prop];
    if (!byMm.has(mm)) {
      byMm.set(mm, []);
    }
    byMm.get(mm).push({ id: value, atype });
  });

  if (byMm.size === 0) {
    return {};
  }

  const eids = [];
  byMm.forEach((uids, mm) => {
    // A fresh array per entry, so a consumer that edits one entry's
    // terms does not edit every other entry's at the same time.
    const tdl = tdlUrl ? [MODEL_TERMS_URL, tdlUrl] : [MODEL_TERMS_URL];
    eids.push({ inserter: '51degrees.com', source: '51d.es', mm, uids, ext: { tdl } });
  });

  if (!tdlUrl) {
    logWarn('tdlUrl is not configured; eids entries name the Model Terms alone in ext.tdl');
  }

  return { user: { eids } };
};

// PMP localStorage contract, duplicated from pmp/src/storage.ts of the
// 51Degrees/cloud repo. If PMP bumps SCHEMA_VERSION the shape check fails
// closed and we fall through to undefined.
const PMP_STORAGE_KEY = '__51d_pmp_pref';
const PMP_SCHEMA_VERSION = 1;

// Storage manager scoped to this RTD module. Required by Prebid's storage
// activity rules and the no-restricted-globals lint.
export const storageManager = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

/**
 * Resolves the id.usage value from PMP localStorage.
 * Returns undefined when no valid value is found,
 * which signals the caller to omit id.usage from the cloud URL entirely.
 *
 * @param {Object} moduleConfig 51Degrees RTD module config
 * @returns {string|undefined}
 */
export const resolveIdUsage = (moduleConfig) => {
  try {
    const stored = storageManager.getDataFromLocalStorage(PMP_STORAGE_KEY);
    if (!stored) {
      return undefined;
    }
    const parsed = JSON.parse(stored);
    if (parsed && parsed.v === PMP_SCHEMA_VERSION &&
        (parsed.p === 'standard' || parsed.p === 'personalized')) {
      return parsed.p;
    }
  } catch (_) {
    // Storage unavailable or JSON malformed; fall through.
  }
  return undefined;
};

/**
 * Reads the raw TCF consent string from Prebid user consent.
 *
 * @param {Object} userConsent Prebid user consent object
 * @returns {string|undefined}
 */
export const resolveTcString = (userConsent) => {
  const tc = deepAccess(userConsent, 'gdpr.consentString');
  return (typeof tc === 'string' && tc.length > 0) ? tc : undefined;
};

/**
 * Reads the raw GPP string from Prebid user consent.
 *
 * @param {Object} userConsent Prebid user consent object
 * @returns {string|undefined}
 */
export const resolveGpp = (userConsent) => {
  const gpp = deepAccess(userConsent, 'gpp.gppString');
  return (typeof gpp === 'string' && gpp.length > 0) ? gpp : undefined;
};

/**
 * Returns the on-page 51Degrees integration object, if present.
 *
 * @returns {Object|null}
 */
export const getPageFod = () => {
  const fod = window.fod;
  return (fod && typeof fod.complete === 'function') ? fod : null;
};

/**
 * Returns errors reported by an on-page 51Degrees script, if any.
 *
 * A failed script request still assigns window.fod, but with only an `errors`
 * array and no complete() method, so getPageFod() correctly reports no usable
 * integration. Surfacing these errors keeps that failure attributable: without
 * them the caller falls through to the configuration check and reports a
 * missing resourceKey, which is not the actual problem.
 *
 * @returns {string[]|null}
 */
export const getPageFodErrors = () => {
  const errors = window.fod && window.fod.errors;
  return (Array.isArray(errors) && errors.length) ? errors : null;
};

// The fod object created by this module's own script load.
let ownFod = null;

// The 51Degrees script caches its cloud response in session storage under its
// object name, and that key carries nothing from the evidence that produced the
// response. On a cache hit the script skips the request altogether and its
// cached values take precedence over the ones rendered into the script that was
// just loaded, so a consent change reaches the cloud in the script URL only to
// be overwritten by what the previous consent produced. Every cached read is
// gated on this one entry, so dropping it is enough to force a fresh request;
// the per-property flags left behind are inert without it. The proper fix is to
// tie the cache to its evidence in the script itself: 51Degrees/javascript-templates#21.
const FOD_SESSION_CACHE_KEY = 'fod';

// Consent evidence this module's last own script load was made under.
let lastConsentEvidence = null;

/**
 * Drops the 51Degrees script's cached response when the consent evidence has
 * changed since this module last loaded its own script, so that the reload
 * answers to the new consent rather than replaying the old one.
 *
 * Does nothing on the first load or when the evidence is unchanged, and is a
 * no-op when session storage is not permitted: a stale cache is a better
 * outcome than a failed auction.
 *
 * @param {Object} evidence Consent evidence for the load about to happen
 */
const dropCachedResponseOnConsentChange = (evidence) => {
  const current = JSON.stringify(evidence);
  const previous = lastConsentEvidence;
  lastConsentEvidence = current;
  if (previous === null || previous === current) {
    return;
  }
  try {
    storageManager.removeDataFromSessionStorage(FOD_SESSION_CACHE_KEY);
    logMessage('Consent evidence changed; dropped the cached 51Degrees response');
  } catch (e) {
    logError(e);
  }
};

/**
 * Converts 51Degrees data and merges it into the ORTB2 fragments.
 *
 * @param {Object} data Raw 51Degrees response payload
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {string} [tdlUrl] TDL URL passed from module config
 * @param {Function} callback Called on completion
 */
const enrichFromData = (data, reqBidsConfigObj, tdlUrl, callback) => {
  try {
    logMessage('51Degrees raw data: ', data);
    const global = reqBidsConfigObj.ortb2Fragments.global;
    const enrichment = convert51DegreesDataToOrtb2(data, { tdlUrl });
    // Don't clobber a publisher-observed device.ip / device.ipv6 with
    // our IP-derived value. Publisher signal wins.
    if (enrichment.device) {
      if (deepAccess(global, 'device.ip')) delete enrichment.device.ip;
      if (deepAccess(global, 'device.ipv6')) delete enrichment.device.ipv6;
    }
    mergeDeep(global, enrichment);
    logMessage('reqBidsConfigObj: ', reqBidsConfigObj);
  } catch (e) {
    logError(e);
  }
  callback();
};

/**
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {Object} moduleConfig Configuration for 1plusX RTD module
 * @param {Object} userConsent
 */
export const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  let callbackCalled = false;
  const callbackOnce = () => {
    if (!callbackCalled) {
      callbackCalled = true;
      callback();
    }
  };
  try {
    const tdlUrl = deepAccess(moduleConfig, 'params.tdlUrl');
    const idUsage = resolveIdUsage(moduleConfig);
    const tcString = resolveTcString(userConsent);
    const gpp = resolveGpp(userConsent);
    logMessage('Resolved id.usage: ', idUsage);
    logMessage('TCF consent string present: ', !!tcString);
    logMessage('GPP string present: ', !!gpp);

    const onData = (data) => {
      if (!callbackCalled) {
        enrichFromData(data, reqBidsConfigObj, tdlUrl, callbackOnce);
      }
    };

    const pageFod = getPageFod();
    if (pageFod && pageFod !== ownFod) {
      logMessage('Using on-page 51Degrees integration (window.fod)');
      pageFod.complete(onData);
      return;
    }

    const pageFodErrors = getPageFodErrors();
    if (pageFodErrors) {
      logError('On-page 51Degrees script reported errors: ' + pageFodErrors.join('; '));
    }

    // Only the module's own load reaches here, and only it can be re-made under
    // the new consent, so the cache is dropped on this path alone.
    dropCachedResponseOnConsentChange({ idUsage, tcString, gpp });

    const { resourceKey, onPremiseJSUrl } = extractConfig(moduleConfig, reqBidsConfigObj);
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
      const scriptURL = get51DegreesJSURL({ resourceKey, onPremiseJSUrl, hev, idUsage, tcString, gpp });
      logMessage('URL of the script to be injected: ', scriptURL);

      // Inject 51Degrees script, get device data and merge it into the ORTB2 object.
      // Every branch below has to reach callbackOnce: a callback the module never
      // invokes stalls the auction for the whole auctionDelay, with nothing in the
      // log to attribute it to this module.
      const tag = loadExternalScript(scriptURL, MODULE_TYPE_RTD, MODULE_NAME, {
        success: () => {
          logMessage('Successfully injected 51Degrees script');
          const fod = /** @type {Object} */ (window.fod);
          // A rejected request (unknown resource key, expired licence) still
          // serves a script body, but one that defines only fod.errors. Calling
          // complete() on it throws inside the loader, which swallows the error.
          if (!fod || typeof fod.complete !== 'function') {
            const errors = getPageFodErrors();
            logError('Injected 51Degrees script did not provide a usable fod object' +
              (errors ? ': ' + errors.join('; ') : ''));
            callbackOnce();
            return;
          }
          ownFod = fod;
          // Convert and merge device data in the callback
          fod.complete(onData);
        },
        // Blocked, offline, or a non-200 response. Only the object form of the
        // callback gets told about this; a bare function is called on success only.
        error: (e) => {
          logError('Failed to load the 51Degrees script: ', e);
          callbackOnce();
        },
      }, document, { crossOrigin: 'anonymous' });

      // loadExternalScript returns nothing when activity controls deny the load,
      // and in that case neither callback ever runs.
      if (!tag) {
        logError('Loading the 51Degrees script was not allowed');
        callbackOnce();
      }
    }).catch((error) => {
      logError(error);
      callbackOnce();
    });
  } catch (error) {
    // In case of an error, log it and continue
    logError(error);
    callbackOnce();
  }
};

/**
 * Init
 * @param {Object} config Module configuration
 * @param {boolean} userConsent User consent
 * @returns true
 */
const init = (config, userConsent) => {
  return true;
};

// 51Degrees RTD submodule object to be registered
export const fiftyOneDegreesSubmodule = {
  name: MODULE_NAME,
  disclosureURL: 'local://modules/51DegreesRtdProvider.json',
  init,
  getBidRequestData,
};

submodule('realTimeData', fiftyOneDegreesSubmodule);
