/**
 * This module adds Parrable to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/parrableIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import find from 'core-js-pure/features/array/find.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { uspDataHandler } from '../src/adapterManager.js';
import { getStorageManager } from '../src/storageManager.js';

const PARRABLE_URL = 'https://h.parrable.com/prebid';
const PARRABLE_COOKIE_NAME = '_parrable_id';
const PARRABLE_GVLID = 928;
const LEGACY_ID_COOKIE_NAME = '_parrable_eid';
const LEGACY_OPTOUT_COOKIE_NAME = '_parrable_optout';
const ONE_YEAR_MS = 364 * 24 * 60 * 60 * 1000;
const EXPIRE_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:00 GMT';

const storage = getStorageManager(PARRABLE_GVLID);

function getExpirationDate() {
  const oneYearFromNow = new Date(utils.timestamp() + ONE_YEAR_MS);
  return oneYearFromNow.toGMTString();
}

function deserializeParrableId(parrableIdStr) {
  const parrableId = {};
  const values = parrableIdStr.split(',');

  values.forEach(function(value) {
    const pair = value.split(':');
    // unpack a value of 1 as true
    parrableId[pair[0]] = +pair[1] === 1 ? true : pair[1];
  });

  return parrableId;
}

function serializeParrableId(parrableId) {
  let components = [];

  if (parrableId.eid) {
    components.push('eid:' + parrableId.eid);
  }
  if (parrableId.ibaOptout) {
    components.push('ibaOptout:1');
  }
  if (parrableId.ccpaOptout) {
    components.push('ccpaOptout:1');
  }

  return components.join(',');
}

function isValidConfig(configParams) {
  if (!configParams) {
    utils.logError('User ID - parrableId submodule requires configParams');
    return false;
  }
  if (!configParams.partners && !configParams.partner) {
    utils.logError('User ID - parrableId submodule requires partner list');
    return false;
  }
  if (configParams.storage) {
    utils.logWarn('User ID - parrableId submodule does not require a storage config');
  }
  return true;
}

function encodeBase64UrlSafe(base64) {
  const ENC = {
    '+': '-',
    '/': '_',
    '=': '.'
  };
  return base64.replace(/[+/=]/g, (m) => ENC[m]);
}

function readCookie() {
  const parrableIdStr = storage.getCookie(PARRABLE_COOKIE_NAME);
  if (parrableIdStr) {
    return deserializeParrableId(decodeURIComponent(parrableIdStr));
  }
  return null;
}

function writeCookie(parrableId) {
  if (parrableId) {
    const parrableIdStr = encodeURIComponent(serializeParrableId(parrableId));
    storage.setCookie(PARRABLE_COOKIE_NAME, parrableIdStr, getExpirationDate(), 'lax');
  }
}

function readLegacyCookies() {
  const eid = storage.getCookie(LEGACY_ID_COOKIE_NAME);
  const ibaOptout = (storage.getCookie(LEGACY_OPTOUT_COOKIE_NAME) === 'true');
  if (eid || ibaOptout) {
    const parrableId = {};
    if (eid) {
      parrableId.eid = eid;
    }
    if (ibaOptout) {
      parrableId.ibaOptout = ibaOptout;
    }
    return parrableId;
  }
  return null;
}

function migrateLegacyCookies(parrableId) {
  if (parrableId) {
    writeCookie(parrableId);
    if (parrableId.eid) {
      storage.setCookie(LEGACY_ID_COOKIE_NAME, '', EXPIRE_COOKIE_DATE);
    }
    if (parrableId.ibaOptout) {
      storage.setCookie(LEGACY_OPTOUT_COOKIE_NAME, '', EXPIRE_COOKIE_DATE);
    }
  }
}

function shouldFilterImpression(configParams, parrableId) {
  const config = configParams.timezoneFilter;

  if (!config) {
    return false;
  }

  if (parrableId) {
    return false;
  }

  const offset = (new Date()).getTimezoneOffset() / 60;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function isZoneListed(list, zone) {
    // IE does not provide a timeZone in IANA format so zone will be empty
    const zoneLowercase = zone && zone.toLowerCase();
    return !!(list && zone && find(list, zn => zn.toLowerCase() === zoneLowercase));
  }

  function isAllowed() {
    if (utils.isEmpty(config.allowedZones) &&
      utils.isEmpty(config.allowedOffsets)) {
      return true;
    }
    if (isZoneListed(config.allowedZones, zone)) {
      return true;
    }
    if (utils.contains(config.allowedOffsets, offset)) {
      return true;
    }
    return false;
  }

  function isBlocked() {
    if (utils.isEmpty(config.blockedZones) &&
      utils.isEmpty(config.blockedOffsets)) {
      return false;
    }
    if (isZoneListed(config.blockedZones, zone)) {
      return true;
    }
    if (utils.contains(config.blockedOffsets, offset)) {
      return true;
    }
    return false;
  }

  return isBlocked() || !isAllowed();
}

function fetchId(configParams, gdprConsentData) {
  if (!isValidConfig(configParams)) return;

  let parrableId = readCookie();
  if (!parrableId) {
    parrableId = readLegacyCookies();
    migrateLegacyCookies(parrableId);
  }

  if (shouldFilterImpression(configParams, parrableId)) {
    return null;
  }

  const eid = (parrableId) ? parrableId.eid : null;
  const refererInfo = getRefererInfo();
  const uspString = uspDataHandler.getConsentData();
  const gdprApplies = (gdprConsentData && typeof gdprConsentData.gdprApplies === 'boolean' && gdprConsentData.gdprApplies);
  const gdprConsentString = (gdprConsentData && gdprApplies && gdprConsentData.consentString) || '';
  const partners = configParams.partners || configParams.partner
  const trackers = typeof partners === 'string'
    ? partners.split(',')
    : partners;

  const data = {
    eid,
    trackers,
    url: refererInfo.referer,
    prebidVersion: '$prebid.version$',
    isIframe: utils.inIframe()
  };

  const searchParams = {
    data: encodeBase64UrlSafe(btoa(JSON.stringify(data))),
    gdpr: gdprApplies ? 1 : 0,
    _rand: Math.random()
  };

  if (uspString) {
    searchParams.us_privacy = uspString;
  }

  if (gdprApplies) {
    searchParams.gdpr_consent = gdprConsentString;
  }

  const options = {
    method: 'GET',
    withCredentials: true
  };

  const callback = function (cb) {
    const callbacks = {
      success: response => {
        let newParrableId = parrableId ? utils.deepClone(parrableId) : {};
        if (response) {
          try {
            let responseObj = JSON.parse(response);
            if (responseObj) {
              if (responseObj.ccpaOptout !== true) {
                newParrableId.eid = responseObj.eid;
              } else {
                newParrableId.eid = null;
                newParrableId.ccpaOptout = true;
              }
              if (responseObj.ibaOptout === true) {
                newParrableId.ibaOptout = true;
              }
            }
          } catch (error) {
            utils.logError(error);
            cb();
          }
          writeCookie(newParrableId);
          cb(newParrableId);
        } else {
          utils.logError('parrableId: ID fetch returned an empty result');
          cb();
        }
      },
      error: error => {
        utils.logError(`parrableId: ID fetch encountered an error`, error);
        cb();
      }
    };
    ajax(PARRABLE_URL, callbacks, searchParams, options);
  };

  return {
    callback,
    id: parrableId
  };
}

/** @type {Submodule} */
export const parrableIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'parrableId',
  /**
   * Global Vendor List ID
   * @type {number}
   */
  gvlid: PARRABLE_GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {ParrableId} parrableId
   * @return {(Object|undefined}
   */
  decode(parrableId) {
    if (parrableId && utils.isPlainObject(parrableId)) {
      return { parrableId };
    }
    return undefined;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {function(callback:function), id:ParrableId}
   */
  getId(config, gdprConsentData, currentStoredId) {
    const configParams = (config && config.params) || {};
    return fetchId(configParams, gdprConsentData);
  }
};

submodule('userId', parrableIdSubmodule);
