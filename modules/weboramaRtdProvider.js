/**
 * This module adds Weborama provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch contextual data (page-centric) from Weborama server
 * @module modules/weboramaRtdProvider
 * @requires module:modules/realTimeData
 */

/**
* @typedef {Object} ModuleParams
* @property {WeboCtxConf} weboCtxConf
*/

/**
* @typedef {Object} WeboCtxConf
* @property {string} token required token to be used on bigsea contextual API requests
* @property {?string} targetURL specify the target url instead use the referer
* @property {?boolean} setTargeting if true will set the GAM targeting
* @property {?string} gamTargetingWeboCtxKey allow rename the webo_ctx key
* @property {?string} gamTargetingWeboDSKey allow rename the webo_ds key
* @property {?object} defaultProfile to be used if the profile is not found
*/

import * as utils from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
/** @type {string} */
const SUBMODULE_NAME = 'Weborama';
/** @type {string} */
const WEBO_CTX = 'webo_ctx';
/** @type {string} */
const WEBO_DS = 'webo_ds';

/** @type {null|Object} */
let _bigseaContextualProfile = null;

/** function that provides ad server targeting data to RTD-core
* @param {Array} adUnitsCodes
* @param {Object} moduleConfig
* @returns {Object} target data
 */
function getTargetingData(adUnitsCodes, moduleConfig) {
  moduleConfig = moduleConfig || {};
  const moduleParams = moduleConfig.params || {};
  const weboCtxConf = moduleParams.weboCtxConf || {};
  const defaultContextualProfiles = weboCtxConf.defaultProfile || {}
  const profile = _bigseaContextualProfile || defaultContextualProfiles;

  const ortb2 = config.getConfig('ortb2') || {};
  if (profile[WEBO_CTX]) {
    utils.deepSetValue(ortb2, 'site.ext.data.webo_ctx', profile[WEBO_CTX]);
  }
  if (profile[WEBO_DS]) {
    utils.deepSetValue(ortb2, 'site.ext.data.webo_ds', profile[WEBO_DS]);
  }
  config.setConfig({ortb2: ortb2});

  if (weboCtxConf.setTargeting === false) {
    return {};
  }

  try {
    const formattedProfile = formatBigseaContextualProfile(profile, weboCtxConf);
    const r = adUnitsCodes.reduce((rp, adUnitCode) => {
      if (adUnitCode) {
        rp[adUnitCode] = formattedProfile;
      }
      return rp;
    }, {});
    return r;
  } catch (e) {
    utils.logError('unable to format weborama rtd targeting data', e);
    return {};
  }
}

/** set bigsea contextual profile on module state
 * if the profile is empty, will store the default profile
 * @param {null|Object} data
 * @returns {void}
 */
export function setBigseaContextualProfile(data) {
  if (data && Object.keys(data).length > 0) {
    _bigseaContextualProfile = data;
  }
}

/** format bigsea contextual profile based on module configuration
 * @param {Object} data
 * @param {WeboCtxConf} weboCtxConf
 * @returns {Object}
 */
function formatBigseaContextualProfile(data, weboCtxConf) {
  const bigseaContextualProfile = {};
  const gamTargetingWeboCtxKey = weboCtxConf.gamTargetingWeboCtxKey || WEBO_CTX;
  const gamTargetingWeboDSKey = weboCtxConf.gamTargetingWeboDSKey || WEBO_DS;

  if (data.hasOwnProperty(WEBO_CTX)) {
    bigseaContextualProfile[gamTargetingWeboCtxKey] = data[WEBO_CTX];
  }

  if (data.hasOwnProperty(WEBO_DS)) {
    const weboDS = data[WEBO_DS];
    if (bigseaContextualProfile.hasOwnProperty(gamTargetingWeboDSKey) &&
      bigseaContextualProfile[gamTargetingWeboDSKey].length > 0) {
      bigseaContextualProfile[gamTargetingWeboDSKey] = bigseaContextualProfile[gamTargetingWeboDSKey].concat(weboDS)
    } else {
      bigseaContextualProfile[gamTargetingWeboDSKey] = weboDS;
    }
  }

  return bigseaContextualProfile;
}

/** onSucess callback type
 * @callback successCallback
 * @param {null|Object} data
 * @param {ModuleParams} moduleParams
 * @returns {void}
 */

/** onDone callback type
  * @callback doneCallback
  * @returns {void}
  */

/** Fetch Bigsea Contextual Profile
 * @param {WeboCtxConf} weboCtxConf
 * @param {successCallback} onSuccess callback
 * @param {doneCallback} onDone callback
 * @returns {void}
 */
function fetchContextualProfile(weboCtxConf, onSuccess, onDone) {
  const targetURL = weboCtxConf.targetURL || document.URL;
  const token = weboCtxConf.token;

  let queryString = '';
  queryString = utils.tryAppendQueryString(queryString, 'token', token);
  queryString = utils.tryAppendQueryString(queryString, 'url', targetURL);

  const url = 'https://ctx.weborama.com/api/profile?' + queryString;

  ajax(url, {
    success: function (response, req) {
      if (req.status === 200) {
        try {
          const data = JSON.parse(response);
          onSuccess(data);
          onDone();
        } catch (e) {
          onDone();
          utils.logError('unable to parse Weborama data', e);
        }
      } else if (req.status === 204) {
        onDone();
      }
    },
    error: function () {
      onDone();
      utils.logError('unable to get Weborama data');
    }
  },
  null,
  {
    method: 'GET',
    withCredentials: false,
  });
}

/** Initialize module
 * @param {object} moduleConfig
 * @return {boolean} true if module was initialized with success
 */
function init(moduleConfig) {
  _bigseaContextualProfile = null;

  moduleConfig = moduleConfig || {};
  const moduleParams = moduleConfig.params || {};
  const weboCtxConf = moduleParams.weboCtxConf || {};

  if (weboCtxConf.token) {
    fetchContextualProfile(weboCtxConf, setBigseaContextualProfile,
      () => utils.logMessage('fetchContextualProfile on init is done'));
  } else {
    utils.logError('missing param "token" for weborama rtd module initialization');
    return false;
  }

  return true;
}

export const weboramaSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getTargetingData: getTargetingData,
};

submodule(MODULE_NAME, weboramaSubmodule);
