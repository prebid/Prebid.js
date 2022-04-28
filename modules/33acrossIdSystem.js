/**
 * This module adds 33acrossId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/33acrossIdSystem
 * @requires module:modules/userId
 */

import { logMessage, logError } from '../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { uspDataHandler } from '../src/adapterManager.js';

const MODULE_NAME = '33acrossId';
const API_URL = 'https://lexicon.33across.com/v1/envelope';
const AJAX_TIMEOUT = 10000;

function getEnvelope(response) {
  if (!response.succeeded) {
    logError(`${MODULE_NAME}: Unsuccessful response`);

    return;
  }

  if (!response.data.envelope) {
    logMessage(`${MODULE_NAME}: No envelope was received`);

    return;
  }

  return response.data.envelope;
}

function calculateQueryStringParams(pid, gdprConsentData) {
  const uspString = uspDataHandler.getConsentData();
  const gdprApplies = Boolean(gdprConsentData?.gdprApplies);
  const params = {
    pid,
    gdpr: Number(gdprApplies),
  };

  if (uspString) {
    params.us_privacy = uspString;
  }

  if (gdprApplies) {
    params.gdpr_consent = gdprConsentData.consentString || '';
  }

  return params;
}

/** @type {Submodule} */
export const thirthyThreeAcrossIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  gvlid: 58,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} id
   * @returns {{'33acrossId':{ envelope: string}}}
   */
  decode(id) {
    return {
      [MODULE_NAME]: {
        envelope: id
      }
    };
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId({ params = { } }, gdprConsentData) {
    if (typeof params.pid !== 'string') {
      logError(`${MODULE_NAME}: Submodule requires a partner ID to be defined`);

      return;
    }

    const { pid, apiUrl = API_URL } = params;

    return {
      callback(cb) {
        ajaxBuilder(AJAX_TIMEOUT)(apiUrl, {
          success(response) {
            let envelope;

            try {
              envelope = getEnvelope(JSON.parse(response))
            } catch (err) {
              logError(`${MODULE_NAME}: ID reading error:`, err);
            }
            cb(envelope);
          },
          error(err) {
            logError(`${MODULE_NAME}: ID error response`, err);

            cb();
          }
        }, calculateQueryStringParams(pid, gdprConsentData), { method: 'GET', withCredentials: true });
      }
    };
  }
};

submodule('userId', thirthyThreeAcrossIdSubmodule);
