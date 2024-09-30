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
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { gdprDataHandler, uspDataHandler, gppDataHandler } from '../src/adapterManager.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 */

const gvlid = 91;
const bidderCode = 'criteo';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: bidderCode });

const bididStorageKey = 'cto_bidid';
const bundleStorageKey = 'cto_bundle';
const dnaBundleStorageKey = 'cto_dna_bundle';
const cookiesMaxAge = 13 * 30 * 24 * 60 * 60 * 1000;

const STORAGE_TYPE_LOCALSTORAGE = 'html5';
const STORAGE_TYPE_COOKIES = 'cookie';

const pastDateString = new Date(0).toString();
const expirationString = new Date(timestamp() + cookiesMaxAge).toString();

function extractProtocolHost(url, returnOnlyHost = false) {
  const parsedUrl = parseUrl(url, { noDecodeWholeURL: true })
  return returnOnlyHost
    ? `${parsedUrl.hostname}`
    : `${parsedUrl.protocol}://${parsedUrl.hostname}${parsedUrl.port ? ':' + parsedUrl.port : ''}/`;
}

function getFromStorage(submoduleConfig, key) {
  if (submoduleConfig?.storage?.type === STORAGE_TYPE_LOCALSTORAGE) {
    return storage.getDataFromLocalStorage(key);
  } else if (submoduleConfig?.storage?.type === STORAGE_TYPE_COOKIES) {
    return storage.getCookie(key);
  }

  return storage.getCookie(key) || storage.getDataFromLocalStorage(key);
}

function saveOnStorage(submoduleConfig, key, value, hostname) {
  if (key && value) {
    if (submoduleConfig?.storage?.type === STORAGE_TYPE_LOCALSTORAGE) {
      storage.setDataInLocalStorage(key, value);
    } else if (submoduleConfig?.storage?.type === STORAGE_TYPE_COOKIES) {
      setCookieOnAllDomains(key, value, expirationString, hostname, true);
    } else {
      storage.setDataInLocalStorage(key, value);
      setCookieOnAllDomains(key, value, expirationString, hostname, true);
    }
  }
}

function setCookieOnAllDomains(key, value, expiration, hostname, stopOnSuccess) {
  const subDomains = hostname.split('.');
  for (let i = 0; i < subDomains.length; ++i) {
    // Try to write the cookie on this subdomain (we want it to be stored only on the TLD+1)
    const domain = subDomains.slice(subDomains.length - i - 1, subDomains.length).join('.');

    try {
      storage.setCookie(key, value, expiration, null, '.' + domain);

      if (stopOnSuccess) {
        // Try to read the cookie to check if we wrote it
        const ck = storage.getCookie(key);
        if (ck && ck === value) {
          break;
        }
      }
    } catch (error) {

    }
  }
}

function deleteFromAllStorages(key, hostname) {
  setCookieOnAllDomains(key, '', pastDateString, hostname, true);
  storage.removeDataFromLocalStorage(key);
}

function getCriteoDataFromStorage(submoduleConfig) {
  return {
    bundle: getFromStorage(submoduleConfig, bundleStorageKey),
    dnaBundle: getFromStorage(submoduleConfig, dnaBundleStorageKey),
    bidId: getFromStorage(submoduleConfig, bididStorageKey),
  }
}

function buildCriteoUsersyncUrl(topUrl, domain, bundle, dnaBundle, areCookiesWriteable, isLocalStorageWritable, isPublishertagPresent) {
  let url = 'https://gum.criteo.com/sid/json?origin=prebid' +
    `${topUrl ? '&topUrl=' + encodeURIComponent(topUrl) : ''}` +
    `${domain ? '&domain=' + encodeURIComponent(domain) : ''}` +
    `${bundle ? '&bundle=' + encodeURIComponent(bundle) : ''}` +
    `${dnaBundle ? '&info=' + encodeURIComponent(dnaBundle) : ''}` +
    `${areCookiesWriteable ? '&cw=1' : ''}` +
    `${isPublishertagPresent ? '&pbt=1' : ''}` +
    `${isLocalStorageWritable ? '&lsw=1' : ''}`;

  const usPrivacyString = uspDataHandler.getConsentData();
  if (usPrivacyString) {
    url = url + `&us_privacy=${encodeURIComponent(usPrivacyString)}`;
  }

  const gdprConsent = gdprDataHandler.getConsentData()
  if (gdprConsent) {
    url = url + `${gdprConsent.consentString ? '&gdprString=' + encodeURIComponent(gdprConsent.consentString) : ''}`;
    url = url + `&gdpr=${gdprConsent.gdprApplies === true ? 1 : 0}`;
  }

  const gppConsent = gppDataHandler.getConsentData();
  if (gppConsent) {
    url = url + `${gppConsent.gppString ? '&gpp=' + encodeURIComponent(gppConsent.gppString) : ''}`;
    url = url + `${gppConsent.applicableSections ? '&gpp_sid=' + encodeURIComponent(gppConsent.applicableSections) : ''}`;
  }

  return url;
}

function callSyncPixel(submoduleConfig, domain, pixel) {
  if (pixel.writeBundleInStorage && pixel.bundlePropertyName && pixel.storageKeyName) {
    ajax(
      pixel.pixelUrl,
      {
        success: response => {
          if (response) {
            const jsonResponse = JSON.parse(response);
            if (jsonResponse && jsonResponse[pixel.bundlePropertyName]) {
              saveOnStorage(submoduleConfig, pixel.storageKeyName, jsonResponse[pixel.bundlePropertyName], domain);
            }
          }
        },
        error: error => {
          logError(`criteoIdSystem: unable to sync user id`, error);
        }
      },
      undefined,
      { method: 'GET', withCredentials: true }
    );
  } else {
    triggerPixel(pixel.pixelUrl);
  }
}

function callCriteoUserSync(submoduleConfig, parsedCriteoData, callback) {
  const cw = (submoduleConfig?.storage?.type === undefined || submoduleConfig?.storage?.type === STORAGE_TYPE_COOKIES) && storage.cookiesAreEnabled();
  const lsw = (submoduleConfig?.storage?.type === undefined || submoduleConfig?.storage?.type === STORAGE_TYPE_LOCALSTORAGE) && storage.localStorageIsEnabled();
  const topUrl = extractProtocolHost(getRefererInfo().page);
  // TODO: should domain really be extracted from the current frame?
  const domain = extractProtocolHost(document.location.href, true);
  const isPublishertagPresent = typeof criteo_pubtag !== 'undefined'; // eslint-disable-line camelcase

  const url = buildCriteoUsersyncUrl(
    topUrl,
    domain,
    parsedCriteoData.bundle,
    parsedCriteoData.dnaBundle,
    cw,
    lsw,
    isPublishertagPresent
  );

  const callbacks = {
    success: response => {
      const jsonResponse = JSON.parse(response);

      if (jsonResponse.pixels) {
        jsonResponse.pixels.forEach(pixel => callSyncPixel(submoduleConfig, domain, pixel));
      }

      if (jsonResponse.acwsUrl) {
        const urlsToCall = typeof jsonResponse.acwsUrl === 'string' ? [jsonResponse.acwsUrl] : jsonResponse.acwsUrl;
        urlsToCall.forEach(url => triggerPixel(url));
      } else if (jsonResponse.bundle) {
        saveOnStorage(submoduleConfig, bundleStorageKey, jsonResponse.bundle, domain);
      }

      if (jsonResponse.bidId) {
        saveOnStorage(submoduleConfig, bididStorageKey, jsonResponse.bidId, domain);
        const criteoId = { criteoId: jsonResponse.bidId };
        callback(criteoId);
      } else {
        deleteFromAllStorages(bididStorageKey, domain);
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
  getId(submoduleConfig) {
    let localData = getCriteoDataFromStorage(submoduleConfig);

    const result = (callback) => callCriteoUserSync(submoduleConfig, localData, callback);

    return {
      id: localData.bidId ? { criteoId: localData.bidId } : undefined,
      callback: result
    }
  },
  eids: {
    'criteoId': {
      source: 'criteo.com',
      atype: 1
    },
  }
};

submodule('userId', criteoIdSubmodule);
