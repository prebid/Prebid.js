/**
 * This module adds MediaWallah OpenLink to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/mwOpenLinkIdSystem
 * @requires module:modules/userId
 */

import { timestamp, logError, deepClone, generateUUID, isPlainObject } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const openLinkID = {
  name: 'mwol',
  cookie_expiration: (86400 * 1000 * 365 * 1) // 1 year
}

const storage = getStorageManager();

function getExpirationDate() {
  return (new Date(timestamp() + openLinkID.cookie_expiration)).toGMTString();
}

function isValidConfig(configParams) {
  if (!configParams) {
    logError('User ID - mwOlId submodule requires configParams');
    return false;
  }
  if (!configParams.accountId) {
    logError('User ID - mwOlId submodule requires accountId to be defined');
    return false;
  }
  if (!configParams.partnerId) {
    logError('User ID - mwOlId submodule requires partnerId to be defined');
    return false;
  }
  return true;
}

function deserializeMwOlId(mwOlIdStr) {
  const mwOlId = {};
  const mwOlIdArr = mwOlIdStr.split(',');

  mwOlIdArr.forEach(function(value) {
    const pair = value.split(':');
    // unpack a value of 1 as true
    mwOlId[pair[0]] = +pair[1] === 1 ? true : pair[1];
  });

  return mwOlId;
}

function serializeMwOlId(mwOlId) {
  let components = [];

  if (mwOlId.eid) {
    components.push('eid:' + mwOlId.eid);
  }
  if (mwOlId.ibaOptout) {
    components.push('ibaOptout:1');
  }
  if (mwOlId.ccpaOptout) {
    components.push('ccpaOptout:1');
  }

  return components.join(',');
}

function readCookie(name) {
  if (!name) name = openLinkID.name;
  const mwOlIdStr = storage.getCookie(name);
  if (mwOlIdStr) {
    return deserializeMwOlId(decodeURIComponent(mwOlIdStr));
  }
  return null;
}

function writeCookie(mwOlId) {
  if (mwOlId) {
    const mwOlIdStr = encodeURIComponent(serializeMwOlId(mwOlId));
    storage.setCookie(openLinkID.name, mwOlIdStr, getExpirationDate(), 'lax');
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
  const mwOlId = readCookie();
  const newMwOlId = mwOlId ? deepClone(mwOlId) : {eid: generateUUID()};
  writeCookie(newMwOlId);
  register(configParams, newMwOlId.eid);
  return {
    id: newMwOlId
  };
};

/* End MW */

export { writeCookie };

/** @type {Submodule} */
export const mwOpenLinkIdSubModule = {
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
    const id = mwOlId && isPlainObject(mwOlId) ? mwOlId.eid : undefined;
    return id ? { 'mwOpenLinkId': id } : undefined;
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
