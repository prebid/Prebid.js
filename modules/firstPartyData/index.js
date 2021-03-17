/**
 * This module adds User ID support to prebid.js
 * @module modules/userId
 */


import find from 'core-js-pure/features/array/find.js';
import { config } from '../../src/config.js';
import events from '../../src/events.js';
import * as utils from '../../src/utils.js';
import { getRefererInfo } from '../../src/refererDetection.js'
import CONSTANTS from '../../src/constants.json';
import { getStorageManager } from '../../src/storageManager.js';

const MODULE_NAME = 'First Party Data';
const storage = getStorageManager();
let ortb2 = {};
let shouldRun = true;


function setReferer() {
  if (getRefererInfo().referer) utils.mergeDeep(ortb2, {site: { ref: getRefererInfo().referer}});
}

function setPage() {
  if (getRefererInfo().canonicalUrl) utils.mergeDeep(ortb2, {site: { page: getRefererInfo().canonicalUrl}});
}

function setDomain() {
  let parseDomain = function(url) {
    if (!url || typeof url !== 'string' || url.length === 0) return;

    var match = url.match(/^(?:https?:\/\/)?(?:www\.)?(.*?(?=(\?|\#|\/|$)))/i);

    return match && match[1];
  };

  let domain = parseDomain(getRefererInfo().canonicalUrl)

  if (domain) utils.mergeDeep(ortb2, {site: { domain: domain}});
}

function setDimensions() {
  const width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  const height = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;

  utils.mergeDeep(ortb2, {device: { width: width, height: height}});
}

function setKeywords() {
  let keywords = document.querySelector('meta[name="keywords"]');

  if (keywords && keywords.content) utils.mergeDeep(ortb2, {site: { keywords: keywords.content.replace(/\s/g, '')}});
}

function filterData(data, key) {
  if (!Array.isArray(data)) {
    utils.logWarn(`Filtered ${key} data: Must be an array of objects`);
    return;
  }

  let duplicate = data.filter(index => {
    if (typeof index !== 'object' || !index.name || !index.segment || !Array.isArray(index.segment)) {
      utils.logWarn(`Filtered ${key}.data: must be an object containing name and segment`, index);
      return false;
    }

    return true;
  }).reduce((result, value) => {
    if (value.ext && (typeof value.ext !== 'object' || Array.isArray(value.ext))) {
      utils.logWarn(`Filtered ext attribute from ${key}.data: must be an object`, value);
      delete value.ext;
    } 

    value.segment = value.segment.filter(el => {
      if (!el.id || typeof el.id !== 'string') { 
        utils.logWarn(`Filtered ${key}.data.segment: id is required and must be a string`, el);
        return false;
      }
      return true;
    });

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
 * Retrieve an item from storage if it exists and hasn't expired.
 * @param {string} key Key of the item.
 * @returns {string|null} Value of the item.
 */
export function getStorageItem(key) {
  let val = null;

  try {
    const expVal = storage.getDataFromLocalStorage(key + '_exp');

    if (!expVal) {
      // If there is no expiry time, then just return the item
      val = storage.getDataFromLocalStorage(key);
    } else {
      // Only return the item if it hasn't expired yet.
      // Otherwise delete the item.
      const expDate = new Date(expVal);
      const isValid = (expDate.getTime() - Date.now()) > 0;
      if (isValid) {
        val = storage.getDataFromLocalStorage(key);
      } else {
        removeStorageItem(key);
      }
    }
  } catch (e) {
    utils.logMessage(e);
  }

  return val;
}

function validateFpd(obj) {
  console.log("FPD", obj);
  let validObject =  Object.assign({}, Object.keys(obj).filter(key => {
    if (key !== 'imp') return key;

    utils.logWarn('Filtered imp property in ortb2 data');
  }).reduce((result, key) => {
    let prop = obj[key];
    let modified = {};

    let optout = (storage.cookiesAreEnabled() && storage.getCookie(name)) ||
      (storage.hasLocalStorage() && getStorageItem(name));console.log(output);

    if (key === 'user' && optout) {
      utils.logWarn(`Filtered ${key} data: pubcid optout found`);
      return result;
    }

    modified = Object.keys(obj[key]).reduce((combined, keyData) => {
      let data; 

      if (key === 'user' && keyData === 'data') {
        data = filterData(obj[key][keyData], key);

        if (data) combined[keyData] = data;
      } else if(key === 'site' && keyData === 'content' && obj[key][keyData].data) {
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
    }, {});

    if (Object.keys(modified).length) result[key] = modified;

    return result; 
  }, {}));
  
  console.log(validObject);

  return validObject;
}

function hasChanged(config) {
  Object.keys(ortb2).forEach(key => {
    if (!utils.deepEqual(ortb2[key], config[key])) return false
  });

  return true;
}

function storeValue(config) {
  Object.keys(ortb2).forEach(key => {
    if (!utils.deepEqual(ortb2[key],config)) ortb2[key] = config[key];
  });
}


/**
 * 
 */
export function init() {
  setReferer();
  setPage();
  setDomain();
  setDimensions();
  setKeywords();

  config.getConfig('currency', conf => {
    if (!conf.currency.adServerCurrency) return;

    utils.mergeDeep(ortb2, {cur: conf.currency.adServerCurrency});
    shouldRun = true;
    config.setConfig(config.getConfig('ortb2') || {ortb2: {}});
  });

  config.getConfig('ortb2', conf => {
    if (!shouldRun || !hasChanged(conf.ortb2)) {
      shouldRun = true;
      return;
    }

    conf.ortb2 = validateFpd(utils.mergeDeep(ortb2, conf.ortb2));
    shouldRun = false;
    config.setConfig({ortb2: conf.ortb2});
  });
}

init();
