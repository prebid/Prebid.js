/**
 * This module adds the jixie to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/jixieIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { ajax } from '../src/ajax.js';
import { parseUrl, buildUrl, isPlainObject, timestamp } from '../src/utils.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'jixieId';
const STD_JXID_KEY = '_jxx';
const PBJS_JXID_KEY = 'pbjx_jxx';
const PBJS_IDLOGSTR_KEY = 'pbjx_idlog';
const TRACKER_EP_FROM_IDMODULE = 'https://traid.jixie.io/api/usersyncpbjs'
const CK_LIFE_DAYS = 365;
const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000;

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

/**
 * remove any property in obj that is null or undefined
 * @param {*} obj
 */
function removeNullProp(obj) {
  for (const key in obj) {
    if (obj[key] === null || obj[key] === undefined) {
      delete obj[key];
    }
  }
}

/**
 * save the info returned by our endpoint into cookie
 * @param {object} response
 */
function persistExtInfo(response) {
  const o = response;
  if (o) {
    const ageMS = (CK_LIFE_DAYS) * 24 * 60 * 60 * 1000;
    const expireDT = new Date(timestamp() + ageMS).toUTCString();
    if (o.client_id) {
      storage.setCookie(PBJS_JXID_KEY, o.client_id, expireDT);
    }
    if (o.idlog) {
      storage.setCookie(PBJS_IDLOGSTR_KEY, o.idlog, expireDT);
    }
  }
}

/**
 * build the full url to call the jixie endpoint
 * @param {Object} params - config params from the pbjs setup
 * @param {Object} gdprConsent
 * @returns {string} a full url to call by ajax
 */
function buildIdCallUrl(params, gdprConsent) {
  const url = parseUrl(params.idendpoint || TRACKER_EP_FROM_IDMODULE);

  if (gdprConsent) {
    url.search.gdpr_consent = gdprConsent && gdprConsent.gdprApplies ? gdprConsent.consentString : '';
  }
  if (params) {
    if (params.accountid) { url.search.accountid = params.accountid; }
    url.search.client_id = storage.getCookie(PBJS_JXID_KEY);
    url.search.idlog = storage.getCookie(PBJS_IDLOGSTR_KEY);
    if (Array.isArray(params.pubExtIds)) {
      params.pubExtIds.forEach((extId) => {
        if (extId.ckname) {
          url.search[extId.pname] = storage.getCookie(extId.ckname);
        } else if (extId.lsname) {
          url.search[extId.pname] = storage.getDataFromLocalStorage(extId.lsname);
        }
      });
    }
  }
  removeNullProp(url.search);
  return buildUrl(url);
}

/**
 * just to check if the page has jixie publisher script planted
 * @returns {boolean}
 */
function pgHasJxEvtScript() {
  return ((window && window.jixie_o));
}

/**
 * analyze the log string from the server side to see if it is now time to
 * call the server again
 * @param {*} logstr a formatted string
 * @return {boolean}
 */
function shouldCallSrv(logstr) {
  if (!logstr) return true;
  const now = Date.now();
  const tsStr = logstr.split('_')[0];
  let ts = parseInt(tsStr, 10);
  if (!(tsStr.length === 13 && ts && ts >= (now - ONE_YEAR_IN_MS) && ts <= (now + ONE_YEAR_IN_MS))) {
    ts = undefined;
  }
  return (ts === undefined || (ts && now > ts));
}

/** @type {Submodule} */
export const jixieIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{jixieId: string} | undefined}
   */
  decode(value) {
    return (value != null && value.length > 0 ? { jixieId: value } : undefined);
  },
  /**
   * performs action to obtain id
   * Use a publink cookie first if it is present, otherwise use prebids copy, if neither are available callout to get a new id
   * @function
   * @param {SubmoduleConfig} [config] Config object with params and storage properties
   * @param {ConsentData|undefined} gdprConsent GDPR consent
   * @returns {IdResponse}
   */
  getId(config, gdprConsent) {
    if (!isPlainObject(config.params)) {
      config.params = {};
    }
    const options = { method: 'GET', withCredentials: true };
    const resp = function(callback) {
      let jxId;
      // If page has jixie script we use the standard jixie id cookie
      if (pgHasJxEvtScript()) {
        jxId = storage.getCookie(config.params.stdjxidckname || STD_JXID_KEY);
        callback(jxId || null);
        return;
      }
      // Case of no jixie script runs on this site:
      jxId = storage.getCookie(PBJS_JXID_KEY);
      const idLogStr = storage.getCookie(PBJS_IDLOGSTR_KEY);
      if (jxId && !shouldCallSrv(idLogStr)) {
        callback(jxId);
      } else {
        const handleResponse = function(responseText, xhr) {
          if (xhr.status === 200) {
            let response = JSON.parse(responseText);
            if (response && response.data && response.data.success) {
              response = response.data
              persistExtInfo(response);
              callback(response.client_id);
              if (response.telcoep) {
                ajax(response.telcoep, undefined, undefined, options);
              }
            }
          }
        };
        ajax(
          buildIdCallUrl(config.params, gdprConsent && gdprConsent.gdpr ? gdprConsent.gdpr : null), handleResponse, undefined, options
        );
      }
    };
    return { callback: resp };
  },
  eids: {
    'jixieId': {
      source: 'jixie.io',
      atype: 3
    },
  },
};
submodule('userId', jixieIdSubmodule);
