/**
 * This module adds Criteo Real Time User Sync to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/criteoIdSystem
 * @requires module:modules/userId
 */

import { timestamp, parseUrl, triggerPixel, logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const gvlid = 91;
const bidderCode = 'criteo';
export const storage = getStorageManager(gvlid, bidderCode);

const bididStorageKey = 'cto_bidid';
const bundleStorageKey = 'cto_bundle';
const cookiesMaxAge = 13 * 30 * 24 * 60 * 60 * 1000;

const pastDateString = new Date(0).toString();
const expirationString = new Date(timestamp() + cookiesMaxAge).toString();

function extractProtocolHost (url, returnOnlyHost = false) {
  const parsedUrl = parseUrl(url, {noDecodeWholeURL: true})
  return returnOnlyHost
    ? `${parsedUrl.hostname}`
    : `${parsedUrl.protocol}://${parsedUrl.hostname}${parsedUrl.port ? ':' + parsedUrl.port : ''}/`;
}

function getFromAllStorages(key) {
  return storage.getCookie(key) || storage.getDataFromLocalStorage(key);
}

function saveOnAllStorages(key, value) {
  if (key && value) {
    storage.setCookie(key, value, expirationString);
    storage.setDataInLocalStorage(key, value);
  }
}

function deleteFromAllStorages(key) {
  storage.setCookie(key, '', pastDateString);
  storage.removeDataFromLocalStorage(key);
}

function getCriteoDataFromAllStorages() {
  return {
    bundle: getFromAllStorages(bundleStorageKey),
    bidId: getFromAllStorages(bididStorageKey),
  }
}

function buildCriteoUsersyncUrl(topUrl, domain, bundle, areCookiesWriteable, isLocalStorageWritable, isPublishertagPresent, gdprString) {
  const url = 'https://gum.criteo.com/sid/json?origin=prebid' +
    `${topUrl ? '&topUrl=' + encodeURIComponent(topUrl) : ''}` +
    `${domain ? '&domain=' + encodeURIComponent(domain) : ''}` +
    `${bundle ? '&bundle=' + encodeURIComponent(bundle) : ''}` +
    `${gdprString ? '&gdprString=' + encodeURIComponent(gdprString) : ''}` +
    `${areCookiesWriteable ? '&cw=1' : ''}` +
    `${isPublishertagPresent ? '&pbt=1' : ''}` +
    `${isLocalStorageWritable ? '&lsw=1' : ''}`;

  return url;
}

function callCriteoUserSync(parsedCriteoData, gdprString, callback) {
  const cw = storage.cookiesAreEnabled();
  const lsw = storage.localStorageIsEnabled();
  const topUrl = extractProtocolHost(getRefererInfo().referer);
  const domain = extractProtocolHost(document.location.href, true);
  const isPublishertagPresent = typeof criteo_pubtag !== 'undefined'; // eslint-disable-line camelcase

  const url = buildCriteoUsersyncUrl(
    topUrl,
    domain,
    parsedCriteoData.bundle,
    cw,
    lsw,
    isPublishertagPresent,
    gdprString
  );

  const callbacks = {
    success: response => {
      const jsonResponse = JSON.parse(response);
      if (jsonResponse.acwsUrl) {
        const urlsToCall = typeof jsonResponse.acwsUrl === 'string' ? [jsonResponse.acwsUrl] : jsonResponse.acwsUrl;
        urlsToCall.forEach(url => triggerPixel(url));
      } else if (jsonResponse.bundle) {
        saveOnAllStorages(bundleStorageKey, jsonResponse.bundle);
      }

      if (jsonResponse.bidId) {
        saveOnAllStorages(bididStorageKey, jsonResponse.bidId);
        const criteoId = { criteoId: jsonResponse.bidId };
        callback(criteoId);
      } else {
        deleteFromAllStorages(bididStorageKey);
        callback();
      }
    },
    error: error => {
      logError(`criteoIdSystem: unable to sync user id`, error);
      callback();
    }
  };

  ajax(url, callbacks, undefined, { method: 'GET', contentType: 'application/json', withCredentials: true });
}

/** @type {Submodule} */
export const criteoIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: bidderCode,
  gvlid: gvlid,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{criteoId: string} | undefined}
   */
  decode(bidId) {
    return bidId;
  },
  /**
   * get the Criteo Id from local storages and initiate a new user sync
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {{id: {criteoId: string} | undefined}}}
   */
  getId(config, consentData) {
    const hasGdprData = consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies;
    const gdprConsentString = hasGdprData ? consentData.consentString : undefined;

    let localData = getCriteoDataFromAllStorages();

    const result = (callback) => callCriteoUserSync(localData, gdprConsentString, callback);

    return {
      id: localData.bidId ? { criteoId: localData.bidId } : undefined,
      callback: result
    }
  }
};

submodule('userId', criteoIdSubmodule);
