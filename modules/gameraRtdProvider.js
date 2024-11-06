import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';
import {
  isPlainObject,
  logError,
  mergeDeep,
} from '../src/utils.js';

const MODULE_NAME = 'gamera';
const MODULE = `${MODULE_NAME}RtdProvider`;

/**
 * Initialize the Gamera RTD Module.
 * @param {Object} config
 * @param {Object} userConsent
 * @returns {boolean}
 */
function init(config, userConsent) {
  // TODO: do we require any configuration params?
  return true;
}

/**
 * Modify bid request data before auction
 * @param {Object} reqBidsConfigObj - The bid request config object
 * @param {function} callback - Callback function to execute after data handling
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent data
 */
function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  // TODO: do we need any configuration params?
  // TODO: do we need to handle user consent?

  // Check if gamera.getPrebidSegments is available
  if (typeof window.gamera?.getPrebidSegments !== 'function') {
    window.gamera = window.gamera || {};
    window.gamera.cmd = window.gamera.cmd || [];
    window.gamera.cmd.push(function () {
      enrichAuction(reqBidsConfigObj, callback, config, userConsent);
    });
    return;
  }

  enrichAuction(reqBidsConfigObj, callback, config, userConsent);
}

function enrichAuction(reqBidsConfigObj, callback, config, userConsent) {
  try {
    // segments.user - array of ortb2.user.data objects
    // segments.site - array of ortb2.site.content.data objects
    // segments.adUnits - dictionary adUnitCode -> ortb2Imp.ext.data object
    const segments = window.gamera.getPrebidSegments() || {};

    // Initialize ortb2Fragments and its nested objects
    reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
    reqBidsConfigObj.ortb2Fragments.global = reqBidsConfigObj.ortb2Fragments.global || {};

    // Add user-level data
    if (segments.user && segments.user.length) {
      reqBidsConfigObj.ortb2Fragments.global.user = reqBidsConfigObj.ortb2Fragments.global.user || {};
      reqBidsConfigObj.ortb2Fragments.global.user.data = reqBidsConfigObj.ortb2Fragments.global.user.data || [];

      segments.user.forEach(userData => {
        reqBidsConfigObj.ortb2Fragments.global.user.data.push(userData);
      });
    }

    // Add site-level data
    if (segments.site && segments.site.length) {
      reqBidsConfigObj.ortb2Fragments.global.site = reqBidsConfigObj.ortb2Fragments.global.site || {};
      reqBidsConfigObj.ortb2Fragments.global.site.content = reqBidsConfigObj.ortb2Fragments.global.site.content || {};
      reqBidsConfigObj.ortb2Fragments.global.site.content.data = reqBidsConfigObj.ortb2Fragments.global.site.content.data || [];

      segments.site.forEach(siteData => {
        reqBidsConfigObj.ortb2Fragments.global.site.content.data.push(siteData);
      });
    }

    // Add ad unit level data
    const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits || [];
    adUnits.forEach(adUnit => {
      const gameraData = segments.adUnits && segments.adUnits[adUnit.code];
      if (!gameraData || !isPlainObject(gameraData)) {
        return;
      }

      // Initialize ortb2Imp if it doesn't exist
      adUnit.ortb2Imp = adUnit.ortb2Imp || {};
      adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
      adUnit.ortb2Imp.ext.data = adUnit.ortb2Imp.ext.data || {};

      // Add gamera-specific data to each ad unit
      mergeDeep(adUnit.ortb2Imp.ext.data, gameraData);
    });
  } catch (error) {
    logError(MODULE, 'Error getting segments:', error);
  }

  callback();
}

export const subModuleObj = {
  name: MODULE_NAME,
  init: init,
  getBidRequestData: getBidRequestData,
};

submodule('realTimeData', subModuleObj);
