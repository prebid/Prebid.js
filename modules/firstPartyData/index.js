/**
 * This module sets default values and validates ortb2 first part data
 * @module modules/firstPartyData
 */

import { config } from '../../src/config.js';
import * as utils from '../../src/utils.js';
import { getRefererInfo } from '../../src/refererDetection.js'
import { getStorageManager } from '../../src/storageManager.js';

const storage = getStorageManager();
let ortb2 = {};
let shouldRun = true;
let win = (window === window.top) ? window : window.top;

/**
 * Checks for referer and if exists merges into ortb2 global data
 */
function setReferer() {
  if (getRefererInfo().referer) utils.mergeDeep(ortb2, {site: {ref: getRefererInfo().referer}});
}

/**
 * Checks for canonical url and if exists merges into ortb2 global data
 */
function setPage() {
  if (getRefererInfo().canonicalUrl) utils.mergeDeep(ortb2, {site: {page: getRefererInfo().canonicalUrl}});
}

/**
 * Checks for canonical url and if exists retrieves domain and merges into ortb2 global data
 */
function setDomain() {
  let parseDomain = function(url) {
    if (!url || typeof url !== 'string' || url.length === 0) return;

    var match = url.match(/^(?:https?:\/\/)?(?:www\.)?(.*?(?=(\?|\#|\/|$)))/i);

    return match && match[1];
  };

  let domain = parseDomain(getRefererInfo().canonicalUrl)

  if (domain) utils.mergeDeep(ortb2, {site: {domain: domain}});
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

  utils.mergeDeep(ortb2, {device: {width: width, height: height}});
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

  if (keywords && keywords.content) utils.mergeDeep(ortb2, {site: {keywords: keywords.content.replace(/\s/g, '')}});
}

/**
 * Filters data based on predefined requirements
 * @param {Object} data object from user.data or site.content.data
 * @param {String} name of data parent - user/site.content
 * @returns {Object} filtered data
 */
export function filterData(data, key) {
  // If data is not an array or does not exist, return null
  if (!Array.isArray(data) || !data.length) {
    utils.logWarn(`Filtered ${key}.data[]: Must be an array of objects`);
    return null;
  }

  let duplicate = data.filter(index => {
    // If index not an object, name does not exist, segment does not exist, or segment is not an array
    // log warning and filter data index
    if (typeof index !== 'object' || !index.name || !index.segment || !Array.isArray(index.segment)) {
      utils.logWarn(`Filtered ${key}.data[]: must be an object containing name and segment`, index);
      return false;
    }

    return true;
  }).reduce((result, value) => {
    // If ext exists and is not an object, log warning and filter data index
    if (value.ext && (typeof value.ext !== 'object' || Array.isArray(value.ext))) {
      utils.logWarn(`Filtered ext attribute from ${key}.data[]: must be an object`, value);
      delete value.ext;
    }

    value.segment = value.segment.filter(el => {
      // For each segment index, check that id exists and is string, otherwise filter index
      if (!el.id || typeof el.id !== 'string') {
        utils.logWarn(`Filtered ${key}.data[].segment: id is required and must be a string`, el);
        return false;
      }
      return true;
    });

    // Check that segment data had not all been filtered out, else log warning and filter data index
    if (value.segment.length) {
      result.push(value);
    } else {
      utils.logWarn(`Filtered ${key}.data: must contain segment data`);
    }

    return result;
  }, []);

  return (duplicate.length) ? duplicate : null;
}

/**
 * Validates ortb2 object and filters out invalid data
 * @param {Object} ortb2 object
 * @returns {Object} validated/filtered data
 */
export function validateFpd(obj) {
  // Filter out imp property if exists
  let validObject = Object.assign({}, Object.keys(obj).filter(key => {
    if (key !== 'imp') return key;

    utils.logWarn('Filtered imp property in ortb2 data');
  }).reduce((result, key) => {
    let modified = {};

    // Checks for existsnece of pubcid optout cookie/storage
    // if exists, filters user data out
    let optout = (storage.cookiesAreEnabled() && storage.getCookie('_pubcid_optout')) ||
      (storage.hasLocalStorage() && storage.getDataFromLocalStorage('_pubcid_optout'));

    if (key === 'user' && optout) {
      utils.logWarn(`Filtered ${key} data: pubcid optout found`);
      return result;
    }

    // Create validated object by looping through ortb2 properties
    modified = (typeof obj[key] === 'object' && !Array.isArray(obj[key]))
      ? Object.keys(obj[key]).reduce((combined, keyData) => {
        let data;

        // If key is user.data, pass into filterData to remove invalid data and return
        // Else if key is site.content.data, pass into filterData to remove invalid data and return
        // Else return data unfiltered
        if (key === 'user' && keyData === 'data') {
          data = filterData(obj[key][keyData], key);

          if (data) combined[keyData] = data;
        } else if (key === 'site' && keyData === 'content' && obj[key][keyData].data) {
          let content = Object.keys(obj[key][keyData]).reduce((merged, contentData) => {
            if (contentData === 'data') {
              data = filterData(obj[key][keyData][contentData], key + '.content');

              if (data) merged[contentData] = data;
            } else {
              merged[contentData] = obj[key][keyData][contentData];
            }

            return merged;
          }, {});

          if (Object.keys(content).length) combined[keyData] = content;
        } else {
          combined[keyData] = obj[key][keyData];
        }

        return combined;
      }, {}) : obj[key];

    // Check if modified data has data and return
    if (Object.keys(modified).length) result[key] = modified;

    return result;
  }, {}));

  // Return validated data
  return validObject;
}

/**
* Resets global ortb2 data
*/
export const resetOrtb2 = () => { ortb2 = {} };

/**
* Sets default values to ortb2 if exists and adds currency and ortb2 setConfig callbacks on init
*/
export function init() {
  // Set defaults if applicable
  setReferer();
  setPage();
  setDomain();
  setDimensions();
  setKeywords();

  config.setConfig({ortb2: utils.mergeDeep({}, validateFpd(ortb2), config.getConfig('ortb2'))});
}

// Set currency setConfig callback
const curListener = config.getConfig('currency', conf => {
  if (!conf.currency.adServerCurrency) return;

  utils.mergeDeep(ortb2, {cur: conf.currency.adServerCurrency});
  shouldRun = true;
  config.setConfig({ortb2: utils.mergeDeep({}, validateFpd(ortb2), config.getConfig('ortb2'))});
});

// Set ortb2 setConfig callback to pass data through validator
const ortb2Listener = config.getConfig('ortb2', conf => {
  if (!shouldRun) {
    shouldRun = true;
  } else {
    conf.ortb2 = validateFpd(utils.mergeDeep({}, ortb2, conf.ortb2));
    shouldRun = false;
    config.setConfig({ortb2: conf.ortb2});
  }
});

/**
* Removes listener
*/
export const unsubscribe = () => { curListener(); ortb2Listener(); };

init();
