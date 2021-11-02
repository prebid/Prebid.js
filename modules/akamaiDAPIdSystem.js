/**
 * This module adds DAP to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/akamaiDAPIdSubmodule
 * @requires module:modules/userId
 */

import { logMessage, logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { uspDataHandler } from '../src/adapterManager.js';

const MODULE_NAME = 'akamaiDAPId';
const STORAGE_KEY = 'akamai_dap_token';

export const storage = getStorageManager();

/** @type {Submodule} */
export const akamaiDAPIdSubmodule = {
  /**
    * used to link submodule with config
    * @type {string}
    */
  name: MODULE_NAME,
  /**
    * decode the stored id value for passing to bid requests
    * @function
    * @returns {{dapId:string}}
    */
  decode(value) {
    logMessage('akamaiDAPId [decode] value=', value);
    return { dapId: value };
  },

  /**
    * performs action to obtain id and return a value in the callback's response argument
    * @function
    * @param {ConsentData} [consentData]
    * @param {SubmoduleConfig} [config]
    * @returns {IdResponse|undefined}
    */
  getId(config, consentData) {
    const configParams = (config && config.params);
    if (!configParams) {
      logError('User ID - akamaiDAPId submodule requires a valid configParams');
      return;
    } else if (typeof configParams.apiHostname !== 'string') {
      logError('User ID - akamaiDAPId submodule requires a valid configParams.apiHostname');
      return;
    } else if (typeof configParams.domain !== 'string') {
      logError('User ID - akamaiDAPId submodule requires a valid configParams.domain');
      return;
    } else if (typeof configParams.type !== 'string') {
      logError('User ID - akamaiDAPId submodule requires a valid configParams.type');
      return;
    }
    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const gdprConsentString = hasGdpr ? consentData.consentString : '';
    const uspConsent = uspDataHandler.getConsentData();
    if (hasGdpr && (!gdprConsentString || gdprConsentString === '')) {
      logError('User ID - akamaiDAPId submodule requires consent string to call API');
      return;
    }
    // XXX: retrieve first-party data here if needed
    let url = '';
    let postData;
    let tokenName = '';
    if (configParams.apiVersion === 'v1') {
      if (configParams.type.indexOf('dap-signature:') == 0) {
        let parts = configParams.type.split(':');
        let v = parts[1];
        url = `https://${configParams.apiHostname}/data-activation/v1/domain/${configParams.domain}/signature?v=${v}&gdpr=${hasGdpr}&gdpr_consent=${gdprConsentString}&us_privacy=${uspConsent}`;
        tokenName = 'SigToken';
      } else {
        url = `https://${configParams.apiHostname}/data-activation/v1/identity/tokenize?gdpr=${hasGdpr}&gdpr_consent=${gdprConsentString}&us_privacy=${uspConsent}`;
        postData = {
          'version': 1,
          'domain': configParams.domain,
          'identity': configParams.identity,
          'type': configParams.type
        };
        tokenName = 'PubToken';
      }
    } else {
      url = `https://${configParams.apiHostname}/data-activation/x1/domain/${configParams.domain}/identity/tokenize?gdpr=${hasGdpr}&gdpr_consent=${gdprConsentString}&us_privacy=${uspConsent}`;
      postData = {
        'version': configParams.apiVersion,
        'identity': configParams.identity,
        'type': configParams.type,
        'attributes': configParams.attributes
      };
      tokenName = 'x1Token';
    }

    let cb = {
      success: (response, request) => {
        var token = (response === '') ? request.getResponseHeader('Akamai-DAP-Token') : response;
        storage.setDataInLocalStorage(STORAGE_KEY, token);
      },
      error: error => {
        logError('akamaiDAPId [getId:ajax.error] failed to retrieve ' + tokenName, error);
      }
    };

    ajax(url, cb, JSON.stringify(postData), { contentType: 'application/json' });

    let token = storage.getDataFromLocalStorage(STORAGE_KEY);
    logMessage('akamaiDAPId [getId] returning', token);

    return { id: token };
  }
};

submodule('userId', akamaiDAPIdSubmodule);
