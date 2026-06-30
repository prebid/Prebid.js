/**
 * This module adds novatiqId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/novatiqIdSystem
 * @requires module:modules/userId
 */

import { logInfo, getWindowLocation } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 */

const MODULE_NAME = 'novatiq';

/** Ephemeral first-party key for the current page hyper ID (aligned with direct GAM integration). */
const NVQ_HID_KEY = 'nvq_hid';
const NVQ_HID_TTL_MS = 60 * 1000;

/** @type {ReturnType<typeof setTimeout>|null} */
let nvqHidLocalStorageExpiryTimer = null;

export const novatiqStorage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

/** @type {Submodule} */
export const novatiqIdSubmodule = {

  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * used to specify vendor id
   * @type {number}
   */
  gvlid: 1119,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{novatiq: {snowflake: string}}}
   */
  decode(novatiqId, config) {
    const responseObj = {
      novatiq: {
        snowflake: novatiqId
      }
    };

    if (novatiqId.syncResponse !== undefined) {
      responseObj.novatiq.ext = {};
      responseObj.novatiq.ext.syncResponse = novatiqId.syncResponse;
    }

    if (typeof config !== 'undefined' && typeof config.params !== 'undefined' && typeof config.params.removeAdditionalInfo !== 'undefined' && config.params.removeAdditionalInfo === true) {
      delete responseObj.novatiq.snowflake.syncResponse;
    }

    return responseObj;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} config
   * @returns {string}
   */
  getId(config) {
    const configParams = config.params || {};
    const urlParams = this.getUrlParams(configParams);
    const srcId = this.getSrcId(configParams, urlParams);
    const sharedId = this.getSharedId(configParams);
    const useCallbacks = this.useCallbacks(configParams);

    logInfo('NOVATIQ config params: ' + JSON.stringify(configParams));
    logInfo('NOVATIQ Sync request used sourceid param: ' + srcId);
    logInfo('NOVATIQ Sync request Shared ID: ' + sharedId);

    return this.sendSyncRequest(useCallbacks, sharedId, srcId, urlParams);
  },

  sendSyncRequest(useCallbacks, sharedId, sspid, urlParams) {
    const syncUrl = this.getSyncUrl(sharedId, sspid, urlParams);
    const url = syncUrl.url;
    const novatiqId = syncUrl.novatiqId;

    // for testing
    const sharedStatus = (sharedId !== null && sharedId !== undefined && sharedId !== false) ? 'Found' : 'Not Found';

    if (useCallbacks) {
      const res = this.sendAsyncSyncRequest(novatiqId, url);
      res.sharedStatus = sharedStatus;

      return res;
    }

    this.persistEphemeralHyperId(novatiqId);
    this.sendSimpleSyncRequest(novatiqId, url);

    return {
      'id': novatiqId,
      'sharedStatus': sharedStatus
    };
  },

  sendAsyncSyncRequest(novatiqId, url) {
    logInfo('NOVATIQ Setting up ASYNC sync request');
    const persistEphemeralHyperId = this.persistEphemeralHyperId.bind(this);

    const resp = function (callback) {
      logInfo('NOVATIQ *** Calling ASYNC sync request');

      function onSuccess(response, responseObj) {
        let syncrc;
        var novatiqIdJson = { syncResponse: 0 };
        syncrc = responseObj.status;
        logInfo('NOVATIQ Sync Response Code:' + syncrc);
        logInfo('NOVATIQ *** ASYNC request returned ' + syncrc);
        if (syncrc === 200) {
          novatiqIdJson = { 'id': novatiqId, syncResponse: 1 };
          persistEphemeralHyperId(novatiqId);
        } else {
          if (syncrc === 204) {
            novatiqIdJson = { 'id': novatiqId, syncResponse: 2 };
            persistEphemeralHyperId(novatiqId);
          }
        }
        callback(novatiqIdJson);
      }

      ajax(url,
        { success: onSuccess },
        undefined, { method: 'GET', withCredentials: false });
    };

    return { callback: resp };
  },

  sendSimpleSyncRequest(novatiqId, url) {
    logInfo('NOVATIQ Sending SIMPLE sync request');

    ajax(url, undefined, undefined, { method: 'GET', withCredentials: false });

    logInfo('NOVATIQ snowflake: ' + novatiqId);
  },

  /**
   * Store the generated hyper ID briefly for first-party use: cookie when allowed, else localStorage JSON with expiresAt.
   * @param {string} hyperId
   */
  persistEphemeralHyperId(hyperId) {
    const ttlMs = NVQ_HID_TTL_MS;
    if (!novatiqStorage.cookiesAreEnabled()) {
      if (novatiqStorage.hasLocalStorage()) {
        this.removeExpiredEphemeralHyperIdFromLocalStorage();
        novatiqStorage.setDataInLocalStorage(NVQ_HID_KEY, JSON.stringify({
          hyperId: hyperId,
          expiresAt: Date.now() + ttlMs
        }));
        this.scheduleEphemeralHyperIdLocalStorageExpiry();
        logInfo('NOVATIQ ephemeral hyperId stored in localStorage (' + (ttlMs / 1000) + 's TTL, cookies unavailable)');
      }
      return;
    }
    if (novatiqStorage.hasLocalStorage()) {
      novatiqStorage.removeDataFromLocalStorage(NVQ_HID_KEY);
    }
    const expiry = new Date(Date.now() + ttlMs).toUTCString();
    novatiqStorage.setCookie(NVQ_HID_KEY, hyperId, expiry, 'Lax');
    logInfo('NOVATIQ ephemeral hyperId stored in cookie (' + (ttlMs / 1000) + 's TTL)');
  },

  removeExpiredEphemeralHyperIdFromLocalStorage() {
    if (!novatiqStorage.hasLocalStorage()) {
      return;
    }
    const raw = novatiqStorage.getDataFromLocalStorage(NVQ_HID_KEY);
    if (raw === null || raw === undefined || raw === '') {
      return;
    }
    const payload = JSON.parse(raw);
    if (typeof payload.expiresAt !== 'number' || payload.expiresAt <= Date.now()) {
      novatiqStorage.removeDataFromLocalStorage(NVQ_HID_KEY);
    }
  },

  scheduleEphemeralHyperIdLocalStorageExpiry() {
    if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') {
      return;
    }
    if (nvqHidLocalStorageExpiryTimer !== null) {
      window.clearTimeout(nvqHidLocalStorageExpiryTimer);
    }
    nvqHidLocalStorageExpiryTimer = window.setTimeout(function () {
      if (novatiqStorage.hasLocalStorage()) {
        novatiqStorage.removeDataFromLocalStorage(NVQ_HID_KEY);
        logInfo('NOVATIQ ephemeral hyperId removed from localStorage after TTL');
      }
      nvqHidLocalStorageExpiryTimer = null;
    }, NVQ_HID_TTL_MS);
  },

  getNovatiqId(urlParams) {
    // standard uuid format
    let uuidFormat = [1e7] + -1e3 + -4e3 + -8e3 + -1e11;
    if (urlParams.useStandardUuid === false) {
      // novatiq standard uuid(like) format
      uuidFormat = uuidFormat + 1e3;
    }

    return (uuidFormat).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  },

  getSyncUrl(sharedId, sspid, urlParams) {
    const novatiqId = this.getNovatiqId(urlParams);

    let url = 'https://spadsync.com/sync?' + urlParams.novatiqId + '=' + novatiqId;

    if (urlParams.useSspId) {
      url = url + '&sspid=' + sspid;
    }

    if (urlParams.useSspHost) {
      const ssphost = getWindowLocation().hostname;
      logInfo('NOVATIQ partner hostname: ' + ssphost);

      url = url + '&ssphost=' + ssphost;
    }

    // append on the shared ID if we have one
    if (sharedId !== null && sharedId !== undefined) {
      url = url + '&sharedId=' + sharedId;
    }

    return {
      url: url,
      novatiqId: novatiqId
    };
  },

  getUrlParams(configParams) {
    const urlParams = {
      novatiqId: 'snowflake',
      useStandardUuid: false,
      useSspId: true,
      useSspHost: true
    };

    if (typeof configParams.urlParams !== 'undefined') {
      if (configParams.urlParams.novatiqId !== undefined) {
        urlParams.novatiqId = configParams.urlParams.novatiqId;
      }
      if (configParams.urlParams.useStandardUuid !== undefined) {
        urlParams.useStandardUuid = configParams.urlParams.useStandardUuid;
      }
      if (configParams.urlParams.useSspId !== undefined) {
        urlParams.useSspId = configParams.urlParams.useSspId;
      }
      if (configParams.urlParams.useSspHost !== undefined) {
        urlParams.useSspHost = configParams.urlParams.useSspHost;
      }
    }

    return urlParams;
  },

  useCallbacks(configParams) {
    return typeof configParams.useCallbacks !== 'undefined' && configParams.useCallbacks === true;
  },

  useSharedId(configParams) {
    return typeof configParams.useSharedId !== 'undefined' && configParams.useSharedId === true;
  },

  getCookieOrStorageID(configParams) {
    let cookieOrStorageID = '_pubcid';

    if (typeof configParams.sharedIdName !== 'undefined' && configParams.sharedIdName !== null && configParams.sharedIdName !== '') {
      cookieOrStorageID = configParams.sharedIdName;
      logInfo('NOVATIQ sharedID name redefined: ' + cookieOrStorageID);
    }

    return cookieOrStorageID;
  },

  // return null if we aren't supposed to use one or we are but there isn't one present
  getSharedId(configParams) {
    let sharedId = null;
    if (this.useSharedId(configParams)) {
      const cookieOrStorageID = this.getCookieOrStorageID(configParams);

      // first check local storage
      if (novatiqStorage.hasLocalStorage()) {
        sharedId = novatiqStorage.getDataFromLocalStorage(cookieOrStorageID);
        logInfo('NOVATIQ sharedID retrieved from local storage:' + sharedId);
      }

      // if nothing check the local cookies
      if (sharedId === null || sharedId === undefined) {
        sharedId = novatiqStorage.getCookie(cookieOrStorageID);
        logInfo('NOVATIQ sharedID retrieved from cookies:' + sharedId);
      }
    }

    logInfo('NOVATIQ sharedID returning: ' + sharedId);

    return sharedId;
  },

  getSrcId(configParams, urlParams) {
    if (urlParams.useSspId === false) {
      logInfo('NOVATIQ Configured to NOT use sspid');
      return '';
    }

    logInfo('NOVATIQ Configured sourceid param: ' + configParams.sourceid);

    let srcId;
    if (typeof configParams.sourceid === 'undefined' || configParams.sourceid === null || configParams.sourceid === '') {
      srcId = '000';
      logInfo('NOVATIQ sourceid param set to value 000 due to undefined parameter or missing value in config section');
    } else if (configParams.sourceid.length < 3 || configParams.sourceid.length > 3) {
      srcId = '001';
      logInfo('NOVATIQ sourceid param set to value 001 due to wrong size in config section 3 chars max e.g. 1ab');
    } else {
      srcId = configParams.sourceid;
    }
    return srcId;
  },
  eids: {
    'novatiq': {
      getValue: function(data) {
        if (data.snowflake.id === undefined) {
          return data.snowflake;
        }

        return data.snowflake.id;
      },
      source: 'novatiq.com',
    },
  }
};
submodule('userId', novatiqIdSubmodule);
