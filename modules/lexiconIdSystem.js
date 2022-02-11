/**
 * This module adds Lexicon to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/lexiconIdSystem
 * @requires module:modules/userId
 */

import { logError } from '../src/utils.js';
import * as ajax from '../src/ajax.js';
import { submodule } from '../src/hook.js'

const MODULE_NAME = 'lexicon';
const LEXICON_URL = 'https://api-lexicon.33across.com/v1/envelope';
const AJAX_TIMEOUT = 10000;

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
   * @returns {{lexicon:string}}
   */
  decode(id) {
    // FIXME: Validate how the lexicon gets sent in userId vs userIdAsEids
    return {
      lexicon: {
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
    /* eslint-disable no-console */
    console.log('the params are', params);

    const { pid, url = LEXICON_URL, envelope } = params;

    if (!pid || typeof pid !== 'string') {
      logError('Lexicon ID submodule requires a partner ID to be defined');

      return;
    }

    if (envelope) {
      return envelope;
    }

    return {
      callback(cb) {
        ajax.ajaxBuilder(AJAX_TIMEOUT)(`${url}?pid=${pid}`, {
          success(response) {
            try {
              const responseJson = JSON.parse(response);

              cb(responseJson.data.envelope);
            } catch (err) {
              logError(`${MODULE_NAME}: Response parsing error`, err);

              cb();
            }
          },
          error(err) {
            logError(`${MODULE_NAME}: ID fetch encountered an error`, err);

            cb();
          }
        }, undefined, { withCredentials: true });
      }
    };
  }
};

submodule('userId', lexiconIdSubmodule);
