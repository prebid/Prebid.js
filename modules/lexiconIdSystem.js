/**
 * This module adds Lexicon to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/lexiconIdSystem
 * @requires module:modules/userId
 */

import { logMessage, logError } from '../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { submodule } from '../src/hook.js'

const MODULE_NAME = 'lexicon';
const LEXICON_URL = 'https://api-lexicon.33across.com/v1/envelope';
const AJAX_TIMEOUT = 10000;

function getEnvelope(response) {
  if (!response.succeeded) {
    logError(`${MODULE_NAME}: `, response.error);

    return;
  }

  if (!response.data.envelope) {
    logMessage(`${MODULE_NAME}: No envelope was received`);

    return;
  }

  return response.data.envelope;
}

/** @type {Submodule} */
export const lexiconIdSubmodule = {
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
   * @returns {{lexicon:{ envelope: string}}}
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
  getId({ params = { } } = {}) {
    const { pid, apiUrl = LEXICON_URL } = params;

    if (!pid || typeof pid !== 'string') {
      logError('Lexicon ID submodule requires a partner ID to be defined');

      return;
    }

    return {
      callback(cb) {
        ajaxBuilder(AJAX_TIMEOUT)(`${apiUrl}?pid=${pid}`, {
          success(response) {
            let envelope;

            try {
              envelope = getEnvelope(JSON.parse(response))
            } catch (err) {
              logError(`${MODULE_NAME}: ID reading error`, err);
            }
            cb(envelope);
          },
          error(err) {
            logError(`${MODULE_NAME}: ID error response`, err);

            cb();
          }
        }, undefined, { withCredentials: true });
      }
    };
  }
};

submodule('userId', lexiconIdSubmodule);
