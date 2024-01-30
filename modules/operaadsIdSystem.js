/**
 * This module adds operaId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/operaadsIdSystem
 * @requires module:modules/userId
 */
import * as ajax from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { logMessage, logError } from '../src/utils.js';

/**
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'operaId';
const ID_KEY = MODULE_NAME;
const version = '1.0';
const SYNC_URL = 'https://t.adx.opera.com/identity/';
const AJAX_TIMEOUT = 300;
const AJAX_OPTIONS = {method: 'GET', withCredentials: true, contentType: 'application/json'};

function constructUrl(pairs) {
  const queries = [];
  for (let key in pairs) {
    queries.push(`${key}=${encodeURIComponent(pairs[key])}`);
  }
  return `${SYNC_URL}?${queries.join('&')}`;
}

function asyncRequest(url, cb) {
  ajax.ajaxBuilder(AJAX_TIMEOUT)(
    url,
    {
      success: response => {
        try {
          const jsonResponse = JSON.parse(response);
          const { uid: operaId } = jsonResponse;
          cb(operaId);
          return;
        } catch (e) {
          logError(`${MODULE_NAME}: invalid response`, response);
        }
        cb();
      },
      error: (err) => {
        logError(`${MODULE_NAME}: ID error response`, err);
        cb();
      }
    },
    null,
    AJAX_OPTIONS
  );
}

export const operaIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * @type {string}
   */
  version,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} id
   * @returns {{'operaId': string}}
   */
  decode: (id) =>
    id != null && id.length > 0
      ? { [ID_KEY]: id }
      : undefined,

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    logMessage(`${MODULE_NAME}: start synchronizing opera uid`);
    const params = (config && config.params) || {};
    if (typeof params.pid !== 'string' || params.pid.length == 0) {
      logError(`${MODULE_NAME}: submodule requires a publisher ID to be defined`);
      return;
    }

    const { pid, syncUrl = SYNC_URL } = params;
    const url = constructUrl(syncUrl, { publisherId: pid });

    return {
      callback: (cb) => {
        asyncRequest(url, cb);
      }
    }
  },

  eids: {
    'operaId': {
      source: 't.adx.opera.com',
      atype: 1
    },
  }
};

submodule('userId', operaIdSubmodule);
