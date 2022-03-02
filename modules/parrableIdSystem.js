/**
 * This module adds Parrable to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/parrableIdSystem
 * @requires module:modules/userId
 */

// ci trigger: 1

import {contains, deepClone, inIframe, isEmpty, isPlainObject, logError, logWarn, timestamp} from '../src/utils.js';
import {find} from '../src/polyfill.js';
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {uspDataHandler} from '../src/adapterManager.js';
import {getStorageManager} from '../src/storageManager.js';

const PARRABLE_URL = 'https://h.parrable.com/prebid';
const PARRABLE_COOKIE_NAME = '_parrable_id';
const PARRABLE_GVLID = 928;
const LEGACY_ID_COOKIE_NAME = '_parrable_eid';
const LEGACY_OPTOUT_COOKIE_NAME = '_parrable_optout';
const ONE_YEAR_MS = 364 * 24 * 60 * 60 * 1000;
const EXPIRE_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:00 GMT';

const storage = getStorageManager({gvlid: PARRABLE_GVLID});

function getExpirationDate() {
  const oneYearFromNow = new Date(timestamp() + ONE_YEAR_MS);
  return oneYearFromNow.toGMTString();
}

function deserializeParrableId(parrableIdStr) {
  const parrableId = {};
  const values = parrableIdStr.split(',');

  values.forEach(function(value) {
    const pair = value.split(':');
    if (pair[0] === 'ccpaOptout' || pair[0] === 'ibaOptout') { // unpack a value of 0 or 1 as boolean
      parrableId[pair[0]] = Boolean(+pair[1]);
    } else if (!isNaN(pair[1])) { // convert to number if is a number
      parrableId[pair[0]] = +pair[1]
    } else {
      parrableId[pair[0]] = pair[1]
    }
  });

  return parrableId;
}

function serializeParrableId(parrableIdAndParams) {
  let components = [];

  if (parrableIdAndParams.eid) {
    components.push('eid:' + parrableIdAndParams.eid);
  }
  if (parrableIdAndParams.ibaOptout) {
    components.push('ibaOptout:1');
  }
  if (parrableIdAndParams.ccpaOptout) {
    components.push('ccpaOptout:1');
  }
  if (parrableIdAndParams.tpcSupport !== undefined) {
    const tpcSupportComponent = parrableIdAndParams.tpcSupport === true ? 'tpc:1' : 'tpc:0';
    const tpcUntil = `tpcUntil:${parrableIdAndParams.tpcUntil}`;
    components.push(tpcSupportComponent);
    components.push(tpcUntil);
  }
  if (parrableIdAndParams.filteredUntil) {
    components.push(`filteredUntil:${parrableIdAndParams.filteredUntil}`);
    components.push(`filterHits:${parrableIdAndParams.filterHits}`);
  }

  return components.join(',');
}

function isValidConfig(configParams) {
  if (!configParams) {
    logError('User ID - parrableId submodule requires configParams');
    return false;
  }
  if (!configParams.partners && !configParams.partner) {
    logError('User ID - parrableId submodule requires partner list');
    return false;
  }
  if (configParams.storage) {
    logWarn('User ID - parrableId submodule does not require a storage config');
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
    const parsedCookie = deserializeParrableId(decodeURIComponent(parrableIdStr));
    const { tpc, tpcUntil, filteredUntil, filterHits, ...parrableId } = parsedCookie;
    let { eid, ibaOptout, ccpaOptout, ...params } = parsedCookie;

    if ((Date.now() / 1000) >= tpcUntil) {
      params.tpc = undefined;
    }

    if ((Date.now() / 1000) < filteredUntil) {
      params.shouldFilter = true;
      params.filteredUntil = filteredUntil;
    } else {
      params.shouldFilter = false;
      params.filterHits = filterHits;
    }
    return { parrableId, params };
  }
  return null;
}

function writeCookie(parrableIdAndParams) {
  if (parrableIdAndParams) {
    const parrableIdStr = encodeURIComponent(serializeParrableId(parrableIdAndParams));
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
    if (isEmpty(config.allowedZones) &&
      isEmpty(config.allowedOffsets)) {
      return true;
    }
    if (isZoneListed(config.allowedZones, zone)) {
      return true;
    }
    if (contains(config.allowedOffsets, offset)) {
      return true;
    }
    return false;
  }

  function isBlocked() {
    if (isEmpty(config.blockedZones) &&
      isEmpty(config.blockedOffsets)) {
      return false;
    }
    if (isZoneListed(config.blockedZones, zone)) {
      return true;
    }
    if (contains(config.blockedOffsets, offset)) {
      return true;
    }
    return false;
  }

  return isBlocked() || !isAllowed();
}

function epochFromTtl(ttl) {
  return Math.floor((Date.now() / 1000) + ttl);
}

function incrementFilterHits(parrableId, params) {
  params.filterHits += 1;
  writeCookie({ ...parrableId, ...params })
}

function fetchId(configParams, gdprConsentData) {
  if (!isValidConfig(configParams)) return;

  let { parrableId, params } = readCookie() || {};
  if (!parrableId) {
    parrableId = readLegacyCookies();
    migrateLegacyCookies(parrableId);
  }

  if (shouldFilterImpression(configParams, parrableId)) {
    return null;
  }

  const eid = parrableId ? parrableId.eid : null;
  const refererInfo = getRefererInfo();
  const tpcSupport = params ? params.tpc : null;
  const shouldFilter = params ? params.shouldFilter : null;
  const uspString = uspDataHandler.getConsentData();
  const gdprApplies = (gdprConsentData && typeof gdprConsentData.gdprApplies === 'boolean' && gdprConsentData.gdprApplies);
  const gdprConsentString = (gdprConsentData && gdprApplies && gdprConsentData.consentString) || '';
  const partners = configParams.partners || configParams.partner;
  const trackers = typeof partners === 'string'
    ? partners.split(',')
    : partners;

  const data = {
    eid,
    trackers,
    url: refererInfo.referer,
    prebidVersion: '$prebid.version$',
    isIframe: inIframe(),
    tpcSupport
  };

  if (shouldFilter === false) {
    data.filterHits = params.filterHits;
  }

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
        let newParrableId = parrableId ? deepClone(parrableId) : {};
        let newParams = {};
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
              if (responseObj.tpcSupport !== undefined) {
                newParams.tpcSupport = responseObj.tpcSupport;
                newParams.tpcUntil = epochFromTtl(responseObj.tpcSupportTtl);
              }
              if (responseObj.filterTtl) {
                newParams.filteredUntil = epochFromTtl(responseObj.filterTtl);
                newParams.filterHits = 0;
              }
            }
          } catch (error) {
            logError(error);
            cb();
          }
          writeCookie({ ...newParrableId, ...newParams });
          cb(newParrableId);
        } else {
          logError('parrableId: ID fetch returned an empty result');
          cb();
        }
      },
      error: error => {
        logError(`parrableId: ID fetch encountered an error`, error);
        cb();
      }
    };

    if (shouldFilter) {
      incrementFilterHits(parrableId, params);
    } else {
      ajax(PARRABLE_URL, callbacks, searchParams, options);
    }
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
    if (parrableId && isPlainObject(parrableId)) {
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
