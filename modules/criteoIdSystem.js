/**
 * This module adds Criteo Real Time User Sync to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/criteoIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils'
import * as ajax from '../src/ajax'
import * as urlLib from '../src/url'
import { getRefererInfo } from '../src/refererDetection'
import { submodule } from '../src/hook';

const bididStorageKey = 'cto_bidid';
const bundleStorageKey = 'cto_bundle';
const cookieWriteableKey = 'cto_test_cookie';
const cookiesMaxAge = 13 * 30 * 24 * 60 * 60 * 1000;

const pastDateString = new Date(0).toString();
const expirationString = new Date(utils.timestamp() + cookiesMaxAge).toString();

function areCookiesWriteable() {
  utils.setCookie(cookieWriteableKey, '1');
  const canWrite = utils.getCookie(cookieWriteableKey) === '1';
  utils.setCookie(cookieWriteableKey, '', pastDateString);
  return canWrite;
}

function extractProtocolHost (url, returnOnlyHost = false) {
  const parsedUrl = urlLib.parse(url)
  return returnOnlyHost
    ? `${parsedUrl.hostname}`
    : `${parsedUrl.protocol}://${parsedUrl.hostname}${parsedUrl.port ? ':' + parsedUrl.port : ''}/`;
}

function getFromAllStorages(key) {
  return utils.getCookie(key) || utils.getDataFromLocalStorage(key);
}

function saveOnAllStorages(key, value) {
  if (key && value) {
    utils.setCookie(key, value, expirationString);
    utils.setDataInLocalStorage(key, value);
  }
}

function deleteFromAllStorages(key) {
  utils.setCookie(key, '', pastDateString);
  utils.removeDataFromLocalStorage(key);
}

function getCriteoDataFromAllStorages() {
  return {
    bundle: getFromAllStorages(bundleStorageKey),
    bidId: getFromAllStorages(bididStorageKey),
  }
}

function buildCriteoUsersyncUrl(topUrl, domain, bundle, areCookiesWriteable, isPublishertagPresent) {
  const url = 'https://gum.criteo.com/sid/json?origin=prebid' +
    `${topUrl ? '&topUrl=' + encodeURIComponent(topUrl) : ''}` +
    `${domain ? '&domain=' + encodeURIComponent(domain) : ''}` +
    `${bundle ? '&bundle=' + encodeURIComponent(bundle) : ''}` +
    `${areCookiesWriteable ? '&cw=1' : ''}` +
    `${isPublishertagPresent ? '&pbt=1' : ''}`

  return url;
}

function callCriteoUserSync(parsedCriteoData) {
  const cw = areCookiesWriteable();
  const topUrl = extractProtocolHost(getRefererInfo().referer);
  const domain = extractProtocolHost(document.location.href, true);
  const isPublishertagPresent = typeof criteo_pubtag !== 'undefined'; // eslint-disable-line camelcase

  const url = buildCriteoUsersyncUrl(
    topUrl,
    domain,
    parsedCriteoData.bundle,
    cw,
    isPublishertagPresent
  );

  ajax.ajaxBuilder()(
    url,
    response => {
      const jsonResponse = JSON.parse(response);
      if (jsonResponse.bidId) {
        saveOnAllStorages(bididStorageKey, jsonResponse.bidId);
      } else {
        deleteFromAllStorages(bididStorageKey);
      }

      if (jsonResponse.acwsUrl) {
        const urlsToCall = typeof jsonResponse.acwsUrl === 'string' ? [jsonResponse.acwsUrl] : jsonResponse.acwsUrl;
        urlsToCall.forEach(url => utils.triggerPixel(url));
      } else if (jsonResponse.bundle) {
        saveOnAllStorages(bundleStorageKey, jsonResponse.bundle);
      }
    }
  );
}

/** @type {Submodule} */
export const criteoIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'criteo',
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
   * @returns {{id: {criteoId: string} | undefined}}}
   */
  getId() {
    let localData = getCriteoDataFromAllStorages();
    callCriteoUserSync(localData);

    return { id: localData.bidId ? { criteoId: localData.bidId } : undefined }
  }
};

submodule('userId', criteoIdSubmodule);
