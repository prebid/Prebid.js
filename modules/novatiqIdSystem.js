/**
 * This module adds novatiqId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/novatiqIdSystem
 * @requires module:modules/userId
 */

import { logInfo } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';

/** @type {Submodule} */
export const novatiqIdSubmodule = {

  /**
 * used to link submodule with config
 * @type {string}
 */
  name: 'novatiq',

  /**
 * decode the stored id value for passing to bid requests
 * @function
 * @returns {novatiq: {snowflake: string}}
 */
  decode(novatiqId, config) {
    let responseObj = {
      novatiq: {
        snowflake: novatiqId
      }
    };
    return responseObj;
  },

  /**
 * performs action to obtain id and return a value in the callback's response argument
 * @function
 * @param {SubmoduleConfig} config
 * @returns {id: string}
 */
  getId(config) {
    function snowflakeId(placeholder) {
      return placeholder
        ? (placeholder ^ Math.random() * 16 >> placeholder / 4).toString(16)
        : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11 + 1e3).replace(/[018]/g, snowflakeId);
    }

    const configParams = config.params || {};
    const srcId = this.getSrcId(configParams);
    const sharedId = this.getSharedId(configParams);

    logInfo('NOVATIQ config params: ' + JSON.stringify(configParams));
    logInfo('NOVATIQ Sync request used sourceid param: ' + srcId);
    logInfo('NOVATIQ Sync request Shared ID: ' + sharedId);

    let partnerhost;
    partnerhost = window.location.hostname;
    logInfo('NOVATIQ partner hostname: ' + partnerhost);

    const novatiqId = snowflakeId();

    let url = 'https://spadsync.com/sync?sptoken=' + novatiqId + '&sspid=' + srcId + '&ssphost=' + partnerhost;

    // for testing
    let sharedStatus = 'Not Found';

    // append on the shared ID if we have one
    if (sharedId != null) {
      url = url + '&sharedId=' + sharedId;
      sharedStatus = 'Found';
    }

    ajax(url, undefined, undefined, { method: 'GET', withCredentials: false });

    logInfo('NOVATIQ snowflake: ' + novatiqId);
    return { 'id': novatiqId,
      'sharedStatus': sharedStatus }
  },

  useSharedId(configParams) {
    return typeof configParams.useSharedId != 'undefined' && configParams.useSharedId === true;
  },

  // return null if we aren't supposed to use one or we are but there isn't one present
  getSharedId(configParams) {
    let sharedId = null;
    if (this.useSharedId(configParams)) {
      let cookieOrStorageID = '_pubcid';

      // Has the cookieOrStorageID been redefined?
      if (typeof configParams.sharedIdName != 'undefined' && configParams.sharedIdName != null && configParams.sharedIdName != '') {
        cookieOrStorageID = configParams.sharedIdName;
        logInfo('NOVATIQ sharedID name redefined: ' + cookieOrStorageID);
      }

      const storage = getStorageManager('', 'pubCommonId');

      // first check local storage
      if (storage.hasLocalStorage()) {
        sharedId = storage.getDataFromLocalStorage(cookieOrStorageID);
        logInfo('NOVATIQ sharedID retrieved from local storage:' + sharedId);
      }

      // if nothing check the local cookies
      if (sharedId == null) {
        sharedId = storage.getCookie(cookieOrStorageID);
        logInfo('NOVATIQ sharedID retrieved from cookies:' + sharedId);
      }
    }

    logInfo('NOVATIQ sharedID returning: ' + sharedId);

    return sharedId;
  },

  getSrcId(configParams) {
    logInfo('NOVATIQ Configured sourceid param: ' + configParams.sourceid);

    function isHex(str) {
      var a = parseInt(str, 16);
      return (a.toString(16) === str)
    }

    let srcId;
    if (typeof configParams.sourceid === 'undefined' || configParams.sourceid === null || configParams.sourceid === '') {
      srcId = '000';
      logInfo('NOVATIQ sourceid param set to value 000 due to undefined parameter or missing value in config section');
    } else if (configParams.sourceid.length < 3 || configParams.sourceid.length > 3) {
      srcId = '001';
      logInfo('NOVATIQ sourceid param set to value 001 due to wrong size in config section 3 chars max e.g. 1ab');
    } else if (isHex(configParams.sourceid) == false) {
      srcId = '002';
      logInfo('NOVATIQ sourceid param set to value 002 due to wrong format in config section expecting hex value only');
    } else {
      srcId = configParams.sourceid;
    }
    return srcId
  }
};
submodule('userId', novatiqIdSubmodule);
