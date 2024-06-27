/**
 * This module adds the Azerion provider to the real time data module of prebid.
 *
 * The {@link module:modules/realTimeData} module is required
 * @module modules/azerionedgeRtdProvider
 * @requires module:modules/realTimeData
 */
import { submodule } from '../src/hook.js';
import { mergeDeep } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { loadExternalScript } from '../src/adloader.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

/**
 * @typedef {import('./rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const REAL_TIME_MODULE = 'realTimeData';
const SUBREAL_TIME_MODULE = 'azerionedge';
export const STORAGE_KEY = 'ht-pa-v1-a';

const IMPROVEDIGITAL_GVLID = '253';
const PURPOSES = ['1', '3', '5', '7', '9'];

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: SUBREAL_TIME_MODULE,
});

/**
 * Get script url to load
 *
 * @param {Object} config
 *
 * @return {String}
 */
function getScriptURL(config) {
  const VERSION = 'v1';
  const key = config.params?.key;
  const publisherPath = key ? `${key}/` : '';
  return `https://edge.hyth.io/js/${VERSION}/${publisherPath}azerion-edge.min.js`;
}

/**
 * Attach script tag to DOM
 *
 * @param {Object} config
 *
 * @return {void}
 */
export function attachScript(config) {
  const script = getScriptURL(config);
  loadExternalScript(script, SUBREAL_TIME_MODULE, () => {
    if (typeof window.azerionPublisherAudiences === 'function') {
      window.azerionPublisherAudiences(config.params?.process || {});
    }
  });
}

/**
 * Fetch audiences info from localStorage.
 *
 * @return {Array} Audience ids.
 */
export function getAudiences() {
  try {
    const data = storage.getDataFromLocalStorage(STORAGE_KEY);
    return JSON.parse(data).map(({ id }) => id);
  } catch (_) {
    return [];
  }
}

/**
 * Pass audience data to configured bidders, using ORTB2
 *
 * @param {Object} reqBidsConfigObj
 * @param {Object} config
 * @param {Array} audiences
 *
 * @return {void}
 */
export function setAudiencesToBidders(reqBidsConfigObj, config, audiences) {
  const defaultBidders = ['improvedigital'];
  const bidders = config.params?.bidders || defaultBidders;
  bidders.forEach((bidderCode) =>
    mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, {
      [bidderCode]: {
        user: {
          data: [
            {
              name: 'azerionedge',
              ext: { segtax: 4 },
              segment: audiences.map((id) => ({ id })),
            },
          ],
        },
      },
    })
  );
}

/**
 * Module initialisation.
 *
 * @param {Object} config
 * @param {Object} userConsent
 *
 * @return {boolean}
 */
function init(config, userConsent) {
  if (hasUserConsented(userConsent)) {
    attachScript(config);
  }
  return true;
}

/**
 * List the vendors consented coming from userConsent object.
 *
 * @param {Object} userConsent
 *
 * @return {Array}
 */
function getVendorsConsented(userConsent) {
  const consents = userConsent?.gdpr?.vendorData?.vendor?.consents || {};
  return Object.entries(consents).reduce((acc, [vendorId, consented]) => {
    return consented ? [...acc, vendorId] : acc;
  }, []);
}

/**
 * List the purposes consented coming from userConsent object.
 *
 * @param {Object} userConsent
 *
 * @return {Array}
 */
export function getPurposesConsented(userConsent) {
  const consents = userConsent?.gdpr?.vendorData?.purpose?.consents || {};
  return Object.entries(consents).reduce((acc, [purposeId, consented]) => {
    return consented ? [...acc, purposeId] : acc;
  }, []);
}

/**
 * Checks if GDPR gives us access through the userConsent object.
 *
 * @param {Object} userConsent
 *
 * @return {boolean}
 */
export function hasGDPRAccess(userConsent) {
  const gdprApplies = userConsent?.gdpr?.gdprApplies;
  const isVendorAllowed = getVendorsConsented(userConsent).includes(IMPROVEDIGITAL_GVLID);
  const arePurposesAllowed = PURPOSES.every((purpose) => getPurposesConsented(userConsent).includes(purpose));
  return !gdprApplies || (isVendorAllowed && arePurposesAllowed);
}

/**
 * Checks if USP gives us access through the userConsent object.
 *
 * @param {Object} userConsent
 *
 * @return {boolean}
 */
export function hasUSPAccess(userConsent) {
  const uspProvided = userConsent?.usp;
  const hasProvidedUserNotice = uspProvided?.[1] !== 'N';
  const hasNotOptedOut = uspProvided?.[2] !== 'Y';
  return !uspProvided || (hasProvidedUserNotice && hasNotOptedOut);
}

/**
 * Checks if GDPR/USP gives us access through the userConsent object.
 *
 * @param {Object} userConsent
 *
 * @return {boolean}
 */
export function hasUserConsented(userConsent) {
  return hasGDPRAccess(userConsent) && hasUSPAccess(userConsent);
}

/**
 * Real-time user audiences retrieval
 *
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
 *
 * @return {void}
 */
export function getBidRequestData(
  reqBidsConfigObj,
  callback,
  config,
  userConsent
) {
  if (hasUserConsented(userConsent)) {
    const audiences = getAudiences();
    if (audiences.length > 0) {
      setAudiencesToBidders(reqBidsConfigObj, config, audiences);
    }
  }
  callback();
}

/** @type {RtdSubmodule} */
export const azerionedgeSubmodule = {
  name: SUBREAL_TIME_MODULE,
  init: init,
  getBidRequestData: getBidRequestData,
  gvlid: IMPROVEDIGITAL_GVLID,
};

submodule(REAL_TIME_MODULE, azerionedgeSubmodule);
