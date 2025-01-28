/**
 * This module adds IdentityLink to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/identityLinkSubmodule
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';
import { gppDataHandler } from '../src/adapterManager.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'identityLink';

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

const liverampEnvelopeName = '_lr_env';

/** @type {Submodule} */
export const identityLinkSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * used to specify vendor id
   * @type {number}
   */
  gvlid: 97,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{idl_env:string}}
   */
  decode(value) {
    return { 'idl_env': value }
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {ConsentData} [consentData]
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    const configParams = (config && config.params) || {};
    if (!configParams || typeof configParams.pid !== 'string') {
      utils.logError('identityLink: requires partner id to be defined');
      return;
    }
    const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const gdprConsentString = hasGdpr ? consentData.consentString : '';
    // use protocol relative urls for http or https
    if (hasGdpr && (!gdprConsentString || gdprConsentString === '')) {
      utils.logInfo('identityLink: Consent string is required to call envelope API.');
      return;
    }
    const gppData = gppDataHandler.getConsentData();
    const gppString = gppData && gppData.gppString ? gppData.gppString : false;
    const gppSectionId = gppData && gppData.gppString && gppData.applicableSections.length > 0 && gppData.applicableSections[0] !== -1 ? gppData.applicableSections[0] : false;
    const hasGpp = gppString && gppSectionId;
    const url = `https://api.rlcdn.com/api/identity/envelope?pid=${configParams.pid}${hasGdpr ? '&ct=4&cv=' + gdprConsentString : ''}${hasGpp ? '&gpp=' + gppString + '&gpp_sid=' + gppSectionId : ''}`;
    let resp;
    resp = function (callback) {
      // Check ats during callback so it has a chance to initialise.
      // If ats library is available, use it to retrieve envelope. If not use standard third party endpoint
      if (window.ats && window.ats.retrieveEnvelope) {
        utils.logInfo('identityLink: ATS exists!');
        window.ats.retrieveEnvelope(function (envelope) {
          if (envelope) {
            utils.logInfo('identityLink: An envelope can be retrieved from ATS!');
            setEnvelopeSource(true);
            callback(JSON.parse(envelope).envelope);
          } else {
            getEnvelope(url, callback, configParams);
          }
        });
      } else {
        // try to get envelope directly from storage if ats lib is not present on a page
        let envelope = getEnvelopeFromStorage();
        if (envelope) {
          utils.logInfo('identityLink: LiveRamp envelope successfully retrieved from storage!');
          callback(JSON.parse(envelope).envelope);
        } else {
          getEnvelope(url, callback, configParams);
        }
      }
    };

    return { callback: resp };
  },
  eids: {
    'idl_env': {
      source: 'liveramp.com',
      atype: 3
    },
  }
};
// return envelope from third party endpoint
function getEnvelope(url, callback, configParams) {
  const callbacks = {
    success: response => {
      let responseObj;
      if (response) {
        try {
          responseObj = JSON.parse(response);
        } catch (error) {
          utils.logInfo(error);
        }
      }
      callback((responseObj && responseObj.envelope) ? responseObj.envelope : '');
    },
    error: error => {
      utils.logInfo(`identityLink: identityLink: ID fetch encountered an error`, error);
      callback();
    }
  };

  if (!configParams.notUse3P && !storage.getCookie('_lr_retry_request')) {
    setRetryCookie();
    utils.logInfo('identityLink: A 3P retrieval is attempted!');
    setEnvelopeSource(false);
    ajax(url, callbacks, undefined, { method: 'GET', withCredentials: true });
  }
}

function setRetryCookie() {
  let now = new Date();
  now.setTime(now.getTime() + 3600000);
  storage.setCookie('_lr_retry_request', 'true', now.toUTCString());
}

function setEnvelopeSource(src) {
  let now = new Date();
  now.setTime(now.getTime() + 2592000000);
  storage.setCookie('_lr_env_src_ats', src, now.toUTCString());
}

export function getEnvelopeFromStorage() {
  let rawEnvelope = storage.getCookie(liverampEnvelopeName) || storage.getDataFromLocalStorage(liverampEnvelopeName);
  return rawEnvelope ? window.atob(rawEnvelope) : undefined;
}

submodule('userId', identityLinkSubmodule);
