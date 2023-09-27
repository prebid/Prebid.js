/**
 * This module adds preciso to the User ID Module
 * The {@link module:modules/userId} is required
 *
 * @module modules/precisoIdSystem
 * @requires module:modules/userId
 */
import {uspDataHandler} from '../src/adapterManager.js';
import {ajaxBuilder} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {deepAccess, logError} from '../src/utils.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';
import {domainOverrideToRootDomain} from '../libraries/domainOverrideToRootDomain/index.js';

const NAME = 'precisoId';
const GVL_ID = 874;
const ID_KEY = NAME;
const version = '2.0';
const SYNC_URL = 'https://ck.2trk.info/rtb/user/';
const AJAX_TIMEOUT = 1000;
const AJAX_OPTIONS = {method: 'GET', withCredentials: true, contentType: 'text/plain'};

export const storage = getStorageManager({moduleName: NAME, moduleType: MODULE_TYPE_UID});
const PRECISOID_KEY = '_pre|usrid15';
const getBidAdapterID = () => storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(PRECISOID_KEY) : null;

function validateConfig(config) {
  if (
    config.storage != null &&
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

function handleSyncResponse(client, response, params, callback) {
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
  }, params, AJAX_OPTIONS);
}

export const precisoIdSubmodule = {
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

  domainOverride: domainOverrideToRootDomain(storage, NAME),

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

      ref: ref.ref,
      u: ref.location,
      tl: ref.topmostLocation,
      nf: ref.numIframes,
      rt: ref.reachedTop,

      v: '$prebid.version$',
      av: version,
      vg: '$$PREBID_GLOBAL$$',
      us_privacy: usp,
      am: getBidAdapterID(),
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
                handleSyncResponse(client, parsed, params, done);
                return;
              } catch (e) {
                logError(`${NAME} invalid response`, responseText);
              }
            }

            done(null);
          },
        },
        params,
        AJAX_OPTIONS
      );

    return { callback };
  },
  eids: {
    precisoId: {
      source: 'preciso.net',
      atype: 1,
    },
  }
};

submodule('userId', precisoIdSubmodule);
