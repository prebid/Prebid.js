/**
 * This module adds DAP to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/akamaiDAPIdSubmodule
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
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
    utils.logMessage('akamaiDAPId [decode] value=', value);
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
      utils.logError('User ID - akamaiDAPId submodule requires a valid configParams');
      return;
    } else if (typeof configParams.apiHostname !== 'string') {
      utils.logError('User ID - akamaiDAPId submodule requires a valid configParams.apiHostname');
      return;
    } else if (typeof configParams.domain !== 'string') {
      utils.logError('User ID - akamaiDAPId submodule requires a valid configParams.domain');
      return;
    } else if (typeof configParams.type !== 'string') {
      utils.logError('User ID - akamaiDAPId submodule requires a valid configParams.type');
      return;
    }
    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const gdprConsentString = hasGdpr ? consentData.consentString : '';
    const uspConsent = uspDataHandler.getConsentData();
    if (hasGdpr && (!gdprConsentString || gdprConsentString === '')) {
      utils.logError('User ID - akamaiDAPId submodule requires consent string to call API');
      return;
    }
    // XXX: retrieve first-party data here if needed
    let url = '';
    let postData;
    let tokenName = '';
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

    utils.logInfo('akamaiDAPId[getId] making API call for ' + tokenName);

    let cb = {
      success: response => {
        storage.setDataInLocalStorage(STORAGE_KEY, response);
      },
      error: error => {
        utils.logError('akamaiDAPId [getId:ajax.error] failed to retrieve ' + tokenName, error);
      }
    };

    ajax(url, cb, JSON.stringify(postData), { contentType: 'application/json' });

    let token = storage.getDataFromLocalStorage(STORAGE_KEY);
    utils.logMessage('akamaiDAPId [getId] returning', token);

    return { id: token };
  }
};

submodule('userId', akamaiDAPIdSubmodule);
