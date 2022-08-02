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
export const storage = getStorageManager({ gvlid: gvlid, moduleName: bidderCode });

const bididStorageKey = 'cto_bidid';
const bundleStorageKey = 'cto_bundle';
const dnaBundleStorageKey = 'cto_dna_bundle';
const cookiesMaxAge = 13 * 30 * 24 * 60 * 60 * 1000;

const pastDateString = new Date(0).toString();
const expirationString = new Date(timestamp() + cookiesMaxAge).toString();

function extractProtocolHost(url, returnOnlyHost = false) {
  const parsedUrl = parseUrl(url, { noDecodeWholeURL: true })
  return returnOnlyHost
    ? `${parsedUrl.hostname}`
    : `${parsedUrl.protocol}://${parsedUrl.hostname}${parsedUrl.port ? ':' + parsedUrl.port : ''}/`;
}

function getFromAllStorages(key) {
  return storage.getCookie(key) || storage.getDataFromLocalStorage(key);
}

function saveOnAllStorages(key, value, hostname) {
  if (key && value) {
    storage.setDataInLocalStorage(key, value);
    setCookieOnAllDomains(key, value, expirationString, hostname, true);
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

function getCriteoDataFromAllStorages() {
  return {
    bundle: getFromAllStorages(bundleStorageKey),
    dnaBundle: getFromAllStorages(dnaBundleStorageKey),
    bidId: getFromAllStorages(bididStorageKey),
  }
}

function buildCriteoUsersyncUrl(topUrl, domain, bundle, dnaBundle, areCookiesWriteable, isLocalStorageWritable, isPublishertagPresent, gdprString) {
  const url = 'https://gum.criteo.com/sid/json?origin=prebid' +
    `${topUrl ? '&topUrl=' + encodeURIComponent(topUrl) : ''}` +
    `${domain ? '&domain=' + encodeURIComponent(domain) : ''}` +
    `${bundle ? '&bundle=' + encodeURIComponent(bundle) : ''}` +
    `${dnaBundle ? '&info=' + encodeURIComponent(dnaBundle) : ''}` +
    `${gdprString ? '&gdprString=' + encodeURIComponent(gdprString) : ''}` +
    `${areCookiesWriteable ? '&cw=1' : ''}` +
    `${isPublishertagPresent ? '&pbt=1' : ''}` +
    `${isLocalStorageWritable ? '&lsw=1' : ''}`;

  return url;
}

function callSyncPixel(domain, pixel) {
  if (pixel.writeBundleInStorage && pixel.bundlePropertyName && pixel.storageKeyName) {
    ajax(
      pixel.pixelUrl,
      {
        success: response => {
          if (response) {
            const jsonResponse = JSON.parse(response);
            if (jsonResponse && jsonResponse[pixel.bundlePropertyName]) {
              saveOnAllStorages(pixel.storageKeyName, jsonResponse[pixel.bundlePropertyName], domain);
            }
          }
        }
      },
      undefined,
      { method: 'GET', withCredentials: true }
    );
  } else {
    triggerPixel(pixel.pixelUrl);
  }
}

function callCriteoUserSync(parsedCriteoData, gdprString, callback) {
  const cw = storage.cookiesAreEnabled();
  const lsw = storage.localStorageIsEnabled();
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
    isPublishertagPresent,
    gdprString
  );

  const callbacks = {
    success: response => {
      const jsonResponse = JSON.parse(response);

      if (jsonResponse.pixels) {
        jsonResponse.pixels.forEach(pixel => callSyncPixel(domain, pixel));
      }

      if (jsonResponse.acwsUrl) {
        const urlsToCall = typeof jsonResponse.acwsUrl === 'string' ? [jsonResponse.acwsUrl] : jsonResponse.acwsUrl;
        urlsToCall.forEach(url => triggerPixel(url));
      } else if (jsonResponse.bundle) {
        saveOnAllStorages(bundleStorageKey, jsonResponse.bundle, domain);
      }

      if (jsonResponse.bidId) {
        saveOnAllStorages(bididStorageKey, jsonResponse.bidId, domain);
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
