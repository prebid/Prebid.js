/**
 * This module adds AMX to the User ID Module
 * The {@link module:modules/userId} is required
 *
 * @module modules/amxIdSystem
 * @requires module:modules/userId
 */
import {uspDataHandler} from '../src/adapterManager.js';
import {ajaxBuilder} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {deepAccess, logError} from '../src/utils.js';

const NAME = 'amxId';
const GVL_ID = 737;
const ID_KEY = NAME;
const version = '1.0';
const SYNC_URL = 'https://id.a-mx.com/sync/';
const AJAX_TIMEOUT = 300;

function validateConfig(config) {
  if (config == null || config.storage == null) {
    logError(`${NAME}: config.storage is required.`);
    return false;
  }

  if (config.storage.type !== 'html5') {
    logError(
      `${NAME} only supports storage.type "html5". ${config.storage.type} was provided`
    );
    return false;
  }

  if (
    typeof config.storage.expires === 'number' &&
    config.storage.expires > 30
  ) {
    logError(
      `${NAME}: storage.expires must be <= 30. ${config.storage.expires} was provided`
    );
    return false;
  }

  return true;
}

function handleSyncResponse(client, response, callback) {
  if (response.id != null && response.id.length > 0) {
    callback(response.id);
    return;
  }

  if (response.u == null || response.u.length === 0) {
    callback(null);
    return;
  }

  client(response.u, {
    error(e) {
      logError(`${NAME} failed on ${response.u}`, e);
      callback(null);
    },
    success(complete) {
      if (complete != null && complete.length > 0) {
        const value = JSON.parse(complete);
        if (value.id != null) {
          callback(value.id);
          return;
        }
      }

      logError(`${NAME} invalid value`, complete);
      callback(null);
    },
  });
}

export const amxIdSubmodule = {
  /**
   * @type {string}
   */
  name: NAME,

  /**
   * @type {string}
   */
  version,

  /**
   * IAB TCF Vendor ID
   * @type {string}
   */
  gvlid: GVL_ID,

  decode: (value) =>
    value != null && value.length > 0
      ? { [ID_KEY]: value }
      : undefined,

  getId(config, consentData, _extant) {
    if (!validateConfig(config)) {
      return undefined;
    }

    const consent = consentData || { gdprApplies: false, consentString: '' };
    const client = ajaxBuilder(AJAX_TIMEOUT);
    const usp = uspDataHandler.getConsentData();
    const ref = getRefererInfo();

    const params = {
      tagId: deepAccess(config, 'params.tagId', ''),
      // TODO: are these referer values correct?
      ref: ref.ref,
      u: ref.location,
      v: '$prebid.version$',
      vg: '$$PREBID_GLOBAL$$',
      us_privacy: usp,
      gdpr: consent.gdprApplies ? 1 : 0,
      gdpr_consent: consent.consentString,
    };

    const callback = (done) =>
      client(
        SYNC_URL,
        {
          error(e) {
            logError(`${NAME} failed to load`, e);
            done(null);
          },
          success(responseText) {
            if (responseText != null && responseText.length > 0) {
              try {
                const parsed = JSON.parse(responseText);
                handleSyncResponse(client, parsed, done);
                return;
              } catch (e) {
                logError(`${NAME} invalid response`, responseText);
              }
            }

            done(null);
          },
        },
        params,
        {
          method: 'GET'
        }
      );

    return { callback };
  },
};

submodule('userId', amxIdSubmodule);
