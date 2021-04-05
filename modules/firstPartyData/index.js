/**
 * This module sets default values and validates ortb2 first part data
 * @module modules/firstPartyData
 */
import { config } from '../../src/config.js';
import * as utils from '../../src/utils.js';
import { ORTB_MAP } from './config.js';
import { getHook } from '../../src/hook.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import { addBidderRequests } from '../../src/auction.js';
import { getRefererInfo } from '../../src/refererDetection.js'
import { getStorageManager } from '../../src/storageManager.js';

const STORAGE = getStorageManager();

let ortb2 = {};
let win = (window === window.top) ? window : window.top;
let optout;

/**
 * Checks for referer and if exists merges into ortb2 global data
 */
function setReferer() {
  if (getRefererInfo().referer) utils.mergeDeep(ortb2, { site: { ref: getRefererInfo().referer } });
}

/**
 * Checks for canonical url and if exists merges into ortb2 global data
 */
function setPage() {
  if (getRefererInfo().canonicalUrl) utils.mergeDeep(ortb2, { site: { page: getRefererInfo().canonicalUrl } });
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

  if (domain) utils.mergeDeep(ortb2, { site: { domain: domain } });
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

  utils.mergeDeep(ortb2, { device: { w: width, h: height } });
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

  if (keywords && keywords.content) utils.mergeDeep(ortb2, { site: { keywords: keywords.content.replace(/\s/g, '') } });
}

/**
 * Checks for currency and if exists merges into ortb2 global data
 * Sets listener for currency if changes occur or doesnt exist when run
 */
function setCurrency() {
  let cur = { ...config.getConfig('currency') };

  if (cur.adServerCurrency) {
    utils.mergeDeep(ortb2, { cur: cur.adServerCurrency });
  }

}

/**
 * Check if data passed is empty
 * @param {*} value to test against
 * @returns {Boolean} is value empty
 */
function isEmptyData(data) {
  let check = true;

  if (typeof data === 'object' && !utils.isEmpty(data)) {
    check = false;
  } else if (typeof data !== 'object' && (utils.isNumber(data) || data)) {
    check = false;
  }

  return check;
}

/**
 * Check if required keys exist in data object
 * @param {Object} data object
 * @param {Array} array of required keys
 * @param {String} object path (for printing warning)
 * @param {Number} index of object value in the data array (for printing warning)
 * @returns {Boolean} is requirements fulfilled
 */
function getRequiredData(obj, required, parent, i) {
  let check = true;

  required.forEach(key => {
    if (!obj[key] || isEmptyData(obj[key])) {
      check = false;
      utils.logWarn(`Filtered ${parent}[] value at index ${i} in ortb2 data: missing required property ${key}`);
    }
  });

  return check;
}

/**
 * Check if data type is valid
 * @param {*} value to test against
 * @param {Object} object containing type definition and if should be array bool
 * @returns {Boolean} is type fulfilled
 */
function typeValidation(data, mapping) {
  let check = false;

  switch (mapping.type) {
    case 'string':
      if (typeof data === 'string') check = true;
      break;
    case 'number':
      if (typeof data === 'number' && isFinite(data)) check = true;
      break;
    case 'object':
      if (typeof data === 'object') {
        if ((Array.isArray(data) && mapping.isArray) || (!Array.isArray(data) && !mapping.isArray)) check = true;
      }
      break;
  }

  return check;
}

/**
 * Validates ortb2 data arrays and filters out invalid data
 * @param {Array} ortb2 data array
 * @param {Object} object defining child type and if array
 * @param {String} config path of data array
 * @param {String} parent path for logging warnings
 * @returns {Array} validated/filtered data
 */
export function filterArrayData(arr, child, path, parent) {
  arr = arr.filter((index, i) => {
    let check = typeValidation(index, {type: child.type, isArray: child.isArray});

    if (check && Array.isArray(index) === Boolean(child.isArray)) {
      return true;
    }

    utils.logWarn(`Filtered ${parent}[] value at index ${i} in ortb2 data: expected type ${child.type}`);
  }).filter((index, i) => {
    let requiredCheck = true;
    let mapping = utils.deepAccess(ORTB_MAP, path);

    if (mapping && mapping.required) requiredCheck = getRequiredData(index, mapping.required, parent, i);

    if (requiredCheck) return true;
  }).reduce((result, value, i) => {
    let typeBool = false;
    let mapping = utils.deepAccess(ORTB_MAP, path);

    switch (child.type) {
      case 'string':
        result.push(value);
        break;
      case 'object':
        if (mapping && mapping.children) {
          let validObject = validateFpd(value, path + '.children.', parent + '.');
          if (Object.keys(validObject).length) {
            let requiredCheck = getRequiredData(validObject, mapping.required, parent, i);

            if (requiredCheck) {
              result.push(validObject);
              typeBool = true;
            }
          }
        } else {
          result.push(value);
          typeBool = true;
        }
        break;
    }

    if (!typeBool) utils.logWarn(`Filtered ${parent}[] value at index ${i}  in ortb2 data: expected type ${child.type}`);

    return result;
  }, []);

  return arr;
}

/**
 * Validates ortb2 object and filters out invalid data
 * @param {Object} ortb2 object
 * @param {String} config path of data array
 * @param {String} parent path for logging warnings
 * @returns {Object} validated/filtered data
 */
export function validateFpd(fpd, path = '', parent = '') {
  if (!fpd) return {};

  // Filter out imp property if exists
  let validObject = Object.assign({}, Object.keys(fpd).filter(key => {
    let mapping = utils.deepAccess(ORTB_MAP, path + key);

    if (!mapping || !mapping.invalid) return key;

    utils.logWarn(`Filtered ${parent}${key} property in ortb2 data: invalid property`);
  }).filter(key => {
    let mapping = utils.deepAccess(ORTB_MAP, path + key);
    // let typeBool = false;
    let typeBool = (mapping) ? typeValidation(fpd[key], {type: mapping.type, isArray: mapping.isArray}) : true;

    if (typeBool || !mapping) return key;

    utils.logWarn(`Filtered ${parent}${key} property in ortb2 data: expected type ${(mapping.isArray) ? 'array' : mapping.type}`);
  }).reduce((result, key) => {
    let mapping = utils.deepAccess(ORTB_MAP, path + key);
    let modified = {};

    if (mapping) {
      if (mapping.optoutApplies && optout) {
        utils.logWarn(`Filtered ${parent}${key} data: pubcid optout found`);
        return result;
      }

      modified = (mapping && mapping.type === 'object' && !mapping.isArray)
        ? validateFpd(fpd[key], path + key + '.children.', parent + key + '.')
        : (mapping && mapping.isArray && mapping.childType)
          ? filterArrayData(fpd[key], { type: mapping.childType, isArray: mapping.childisArray }, path + key, parent + key) : fpd[key];

      // Check if modified data has data and return
      (!isEmptyData(modified)) ? result[key] = modified
        : utils.logWarn(`Filtered ${parent}${key} property in ortb2 data: empty data found`);
    } else {
      result[key] = fpd[key];
    }

    return result;
  }, {}));

  // Return validated data
  return validObject;
}

/**
 * Resets global ortb2 data
 */
export const resetOrtb2 = () => { ortb2 = {} };

function runEnrichments(shouldSkipValidate) {
  setReferer();
  setPage();
  setDomain();
  setDimensions();
  setKeywords();
  setCurrency();

  if (shouldSkipValidate) config.setConfig({ ortb2: utils.mergeDeep({}, ortb2, config.getConfig('ortb2') || {}) });
}

function runValidations() {
  let conf = utils.mergeDeep({}, ortb2, validateFpd(config.getConfig('ortb2')));

  config.setConfig({ ortb2: conf });

  let bidderDuplicate = { ...config.getBidderConfig() };

  Object.keys(bidderDuplicate).forEach(bidder => {
    let modConf = Object.keys(bidderDuplicate[bidder]).reduce((res, key) => {
      let valid = (key !== 'ortb2') ? bidderDuplicate[bidder][key] : validateFpd(bidderDuplicate[bidder][key]);

      if (valid) res[key] = valid;

      return res;
    }, {});

    if (Object.keys(modConf).length) config.setBidderConfig({ bidders: [bidder], config: modConf });
  });
}

/**
 * Sets default values to ortb2 if exists and adds currency and ortb2 setConfig callbacks on init
 */
export function init() {
  // Checks for existsnece of pubcid optout cookie/storage
  // if exists, filters user data out
  optout = (STORAGE.cookiesAreEnabled() && STORAGE.getCookie('_pubcid_optout')) ||
    (STORAGE.hasLocalStorage() && STORAGE.getDataFromLocalStorage('_pubcid_optout'));
  let conf = config.getConfig('firstPartyData');
  let skipValidations = (conf && conf.skipValidations) || false;
  let skipEnrichments = (conf && conf.skipEnrichments) || false;

  if (!skipEnrichments) runEnrichments(skipValidations);
  if (!skipValidations) runValidations();
}

function addBidderRequestHook(fn, bidderRequests) {
  init();
  resetOrtb2();
  fn.call(this, bidderRequests);
  addBidderRequests.getHooks({ hook: addBidderRequestHook }).remove();
}

function initModule() {
  getHook('addBidderRequests').before(addBidderRequestHook);
}

initModule();

/**
 * Global function to reinitiate module
 */
(getGlobal()).refreshFPD = initModule;
