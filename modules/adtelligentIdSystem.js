/**
 * This module adds Adtelligent DMP Tokens to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/adtelligentIdSystem
 * @requires module:modules/userId
 */

import * as ajax from '../src/ajax.js';
import { submodule } from '../src/hook.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const gvlid = 410;
const moduleName = 'adtelligent';
const syncUrl = 'https://idrs.adtelligent.com/get';

function buildUrl(opts) {
  const queryPairs = [];
  for (let key in opts) {
    queryPairs.push(`${key}=${encodeURIComponent(opts[key])}`);
  }
  return `${syncUrl}?${queryPairs.join('&')}`;
}

function requestRemoteIdAsync(url, cb) {
  ajax.ajaxBuilder()(
    url,
    {
      success: response => {
        const jsonResponse = JSON.parse(response);
        const { u: dmpId } = jsonResponse;
        cb(dmpId);
      },
      error: () => {
        cb();
      }
    },
    null,
    {
      method: 'GET',
      contentType: 'application/json',
      withCredentials: true
    }
  );
}

/** @type {Submodule} */
export const adtelligentIdModule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: moduleName,
  gvlid: gvlid,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{adtelligentId: string}}
   */
  decode(uid) {
    return { adtelligentId: uid };
  },
  /**
   * get the Adtelligent Id from local storages and initiate a new user sync
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse}
   */
  getId(config, consentData) {
    const gdpr = consentData && consentData.gdprApplies ? 1 : 0;
    const gdprConsent = gdpr ? consentData.consentString : '';
    const url = buildUrl({
      gdpr,
      gdprConsent
    });

    if (window.adtDmp && window.adtDmp.ready) {
      return { id: window.adtDmp.getUID() }
    }

    return {
      callback: (cb) => {
        requestRemoteIdAsync(url, (id) => {
          cb(id);
        });
      }

    }
  },
  eids: {
    'adtelligentId': {
      source: 'adtelligent.com',
      atype: 3
    },
  }
};

submodule('userId', adtelligentIdModule);
