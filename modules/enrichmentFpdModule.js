
/**
 * This module sets default values and validates ortb2 first part data
 * @module modules/firstPartyData
 */
import { timestamp, mergeDeep } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import {getRefererInfo, parseDomain} from '../src/refererDetection.js';
import { getCoreStorageManager } from '../src/storageManager.js';

let ortb2 = {};
let win = (window === window.top) ? window : window.top;
export const coreStorage = getCoreStorageManager('enrichmentFpd');

/**
  * Find the root domain
  * @param {string|undefined} fullDomain
  * @return {string}
*/
export function findRootDomain(fullDomain = window.location.hostname) {
  if (!coreStorage.cookiesAreEnabled()) {
    return fullDomain;
  }

  const domainParts = fullDomain.split('.');
  if (domainParts.length == 2) {
    return fullDomain;
  }
  let rootDomain;
  let continueSearching;
  let startIndex = -2;
  const TEST_COOKIE_NAME = `_rdc${Date.now()}`;
  const TEST_COOKIE_VALUE = 'writeable';
  do {
    rootDomain = domainParts.slice(startIndex).join('.');
    let expirationDate = new Date(timestamp() + 10 * 1000).toUTCString();

    // Write a test cookie
    coreStorage.setCookie(
      TEST_COOKIE_NAME,
      TEST_COOKIE_VALUE,
      expirationDate,
      'Lax',
      rootDomain,
      undefined
    );

    // See if the write was successful
    const value = coreStorage.getCookie(TEST_COOKIE_NAME, undefined);
    if (value === TEST_COOKIE_VALUE) {
      continueSearching = false;
      // Delete our test cookie
      coreStorage.setCookie(
        TEST_COOKIE_NAME,
        '',
        'Thu, 01 Jan 1970 00:00:01 GMT',
        undefined,
        rootDomain,
        undefined
      );
    } else {
      startIndex += -1;
      continueSearching = Math.abs(startIndex) <= domainParts.length;
    }
  } while (continueSearching);
  return rootDomain;
}

/**
 * Checks for referer and if exists merges into ortb2 global data
 */
function setReferer() {
  if (getRefererInfo().ref) mergeDeep(ortb2, { site: { ref: getRefererInfo().ref } });
}

/**
 * Checks for canonical url and if exists merges into ortb2 global data
 */
function setPage() {
  if (getRefererInfo().page) mergeDeep(ortb2, { site: { page: getRefererInfo().page } });
}

/**
 * Checks for canonical url and if exists retrieves domain and merges into ortb2 global data
 */
function setDomain() {
  const domain = parseDomain(getRefererInfo().page, {noLeadingWww: true});
  if (domain) {
    mergeDeep(ortb2, { site: { domain: domain } });
    mergeDeep(ortb2, { site: { publisher: { domain: findRootDomain(domain) } } });
  };
}

/**
 * Checks for screen/device width and height and sets dimensions
 */
function setDimensions() {
  let width;
  let height;

  try {
    width = win.innerWidth || win.document.documentElement.clientWidth || win.document.body.clientWidth;
    height = win.innerHeight || win.document.documentElement.clientHeight || win.document.body.clientHeight;
  } catch (e) {
    width = window.innerWidth || window.document.documentElement.clientWidth || window.document.body.clientWidth;
    height = window.innerHeight || window.document.documentElement.clientHeight || window.document.body.clientHeight;
  }

  mergeDeep(ortb2, { device: { w: width, h: height } });
}

/**
 * Scans page for meta keywords, and if exists, merges into site.keywords
 */
function setKeywords() {
  let keywords;

  try {
    keywords = win.document.querySelector("meta[name='keywords']");
  } catch (e) {
    keywords = window.document.querySelector("meta[name='keywords']");
  }

  if (keywords && keywords.content) mergeDeep(ortb2, { site: { keywords: keywords.content.replace(/\s/g, '') } });
}

/**
 * Resets modules global ortb2 data
 */
const resetOrtb2 = () => { ortb2 = {} };

function runEnrichments() {
  setReferer();
  setPage();
  setDomain();
  setDimensions();
  setKeywords();

  return ortb2;
}

/**
 * Sets default values to ortb2 if exists and adds currency and ortb2 setConfig callbacks on init
 */
export function processFpd(fpdConf, {global}) {
  resetOrtb2();

  return {
    global: (!fpdConf.skipEnrichments) ? mergeDeep(runEnrichments(), global) : global
  };
}

/** @type {firstPartyDataSubmodule} */
export const enrichmentsSubmodule = {
  name: 'enrichments',
  queue: 2,
  processFpd
}

submodule('firstPartyData', enrichmentsSubmodule)
