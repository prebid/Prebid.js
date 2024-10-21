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
  attachScript(config);
  return true;
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
  const audiences = getAudiences();
  if (audiences.length > 0) {
    setAudiencesToBidders(reqBidsConfigObj, config, audiences);
  }
  callback();
}

/** @type {RtdSubmodule} */
export const azerionedgeSubmodule = {
  name: SUBREAL_TIME_MODULE,
  init: init,
  getBidRequestData: getBidRequestData,
};

submodule(REAL_TIME_MODULE, azerionedgeSubmodule);
