/**
 * This module adds MyGaru Real Time User Sync to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/mygaruIdSystem
 * @requires module:modules/userId
 */

import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 */

const bidderCode = 'mygaruId';
const syncUrl = 'https://ident.mygaru.com/v2/id';

export function buildUrl(opts) {
  const queryPairs = [];
  for (let key in opts) {
    if (opts[key] !== undefined) {
      queryPairs.push(`${key}=${encodeURIComponent(opts[key])}`);
    }
  }
  return `${syncUrl}?${queryPairs.join('&')}`;
}

function requestRemoteIdAsync(url) {
  return new Promise((resolve) => {
    ajax(
      url,
      {
        success: response => {
          try {
            const jsonResponse = JSON.parse(response);
            const { iuid } = jsonResponse;
            resolve(iuid);
          } catch (e) {
            resolve();
          }
        },
        error: () => {
          resolve();
        },
      },
      undefined,
      {
        method: 'GET',
        contentType: 'application/json'
      }
    );
  });
}

/** @type {Submodule} */
export const mygaruIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: bidderCode,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{id: string} | null}
   */
  decode(id) {
    return id;
  },
  /**
   * get the MyGaru Id from local storages and initiate a new user sync
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {{id: string | undefined}}
   */
  getId(config, consentData) {
    const gdprApplies = consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies ? 1 : 0;
    const gdprConsentString = gdprApplies ? consentData.consentString : undefined;
    const url = buildUrl({
      gdprApplies,
      gdprConsentString
    });

    return {
      url,
      callback: function (done) {
        return requestRemoteIdAsync(url).then((id) => {
          done({ mygaruId: id });
        })
      }
    }
  },
  eids: {
    'mygaruId': {
      source: 'mygaru.com',
      atype: 1
    },
  }
};

submodule('userId', mygaruIdSubmodule);
