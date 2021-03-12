/**
 * This module adds MediaWallah OpenLink to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/mwOpenLinkIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const openLinkID = {
  name: 'mwol',
  cookie_expiration: (86400 * 1000 * 365 * 1), // 1 year
  value: ''
}

const storage = getStorageManager();

function getExpirationDate() {
  const oneYearFromNow = new Date(utils.timestamp() + openLinkID.cookie_expiration);
  return oneYearFromNow.toGMTString();
}

function isValidConfig(configParams) {
  if (!configParams) {
    utils.logError('User ID - mwOlId submodule requires configParams');
    return false;
  }
  if (!configParams.accountId) {
    utils.logError('User ID - mwOlId submodule requires accountId to be defined');
    return false;
  }
  if (!configParams.partnerId) {
    utils.logError('User ID - mwOlId submodule requires partnerId to be defined');
    return false;
  }
  return true;
}

function deserializeMWOlId(mwOLIdStr) {
  const mwOLId = {};
  const values = mwOLIdStr.split(',');

  values.forEach(function(value) {
    const pair = value.split(':');
    // unpack a value of 1 as true
    mwOLId[pair[0]] = +pair[1] === 1 ? true : pair[1];
  });

  return mwOLId;
}

function serializeMWOLId(mwOLId) {
  let components = [];

  if (mwOLId.eid) {
    components.push('eid:' + mwOLId.eid);
  }
  if (mwOLId.ibaOptout) {
    components.push('ibaOptout:1');
  }
  if (mwOLId.ccpaOptout) {
    components.push('ccpaOptout:1');
  }

  return components.join(',');
}

function readCookie(name) {
  if (!name) name = openLinkID.name;
  const mwOlIdStr = storage.getCookie(name);
  if (mwOlIdStr) {
    return deserializeMWOlId(decodeURIComponent(mwOlIdStr));
  }
  return null;
}

function writeCookie(mwOLId) {
  if (mwOLId) {
    const mwOLIdStr = encodeURIComponent(serializeMWOLId(mwOLId));
    storage.setCookie(openLinkID.name, mwOLIdStr, getExpirationDate(), 'lax');
  }
}

function register(configParams, olid) {
  const { accountId, partnerId, uid } = configParams;
  const url = 'https://ol.mediawallahscript.com/?account_id=' + accountId +
            '&partner_id=' + partnerId +
            '&uid=' + uid +
            '&olid=' + olid +
            '&cb=' + Math.random()
            ;
  ajax(url);
}

function setID(configParams) {
  if (!isValidConfig(configParams)) return undefined;

  const mwOLId = readCookie();
  openLinkID.value = utils.generateUUID();

  const newmwOLId = mwOLId ? utils.deepClone(mwOLId) : {eid: openLinkID.value};
  writeCookie(newmwOLId);
  register(configParams, newmwOLId.eid);
  return {
    id: mwOLId
  };
};

/* End MW */

export { writeCookie };

/** @type {Submodule} */
export const mwOpenLinkSubModule = {
  /**
     * used to link submodule with config
     * @type {string}
     */
  name: 'mwOpenLinkId',
  /**
     * decode the stored id value for passing to bid requests
     * @function
     * @param {MwOlId} mwOlId
     * @return {(Object|undefined}
     */
  decode(mwOlId) {
    if (mwOlId && utils.isPlainObject(mwOlId)) {
      return { mwOlId };
    }
    return undefined;
  },

  /**
     * performs action to obtain id and return a value in the callback's response argument
     * @function
     * @param {SubmoduleParams} [submoduleParams]
     * @returns {id:MwOlId | undefined}
     */
  getId(submoduleConfig) {
    const submoduleConfigParams = (submoduleConfig && submoduleConfig.params) || {};
    if (!isValidConfig(submoduleConfigParams)) return undefined;
    return setID(submoduleConfigParams);
  }
};

submodule('userId', mwOpenLinkIdSubModule);
