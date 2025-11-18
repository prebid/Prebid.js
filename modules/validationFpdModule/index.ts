/**
 * This module sets default values and validates ortb2 first part data
 * @module modules/firstPartyData
 */
import {deepAccess, isEmpty, isNumber, logWarn} from '../../src/utils.js';
import {ORTB_MAP} from './config.js';
import {submodule} from '../../src/hook.js';
import {getCoreStorageManager} from '../../src/storageManager.js';

// TODO: do FPD modules need their own namespace?
const STORAGE = getCoreStorageManager('FPDValidation');
let optout;

/**
 * Check if data passed is empty
 * @param {*} data to test against
 * @returns {Boolean} is data empty
 */
function isEmptyData(data) {
  let check = true;

  if (typeof data === 'object' && !isEmpty(data)) {
    check = false;
  } else if (typeof data !== 'object' && (isNumber(data) || data)) {
    check = false;
  }

  return check;
}

/**
 * Check if required keys exist in data object
 * @param {Object} obj data object
 * @param {Array} required array of required keys
 * @param {String} parent object path (for printing warning)
 * @param {Number} i index of object value in the data array (for printing warning)
 * @returns {Boolean} is requirements fulfilled
 */
function getRequiredData(obj, required, parent, i) {
  let check = true;

  required.forEach(key => {
    if (!obj[key] || isEmptyData(obj[key])) {
      check = false;
      logWarn(`Filtered ${parent}[] value at index ${i} in ortb2 data: missing required property ${key}`);
    }
  });

  return check;
}

/**
 * Check if data type is valid
 * @param {*} data value to test against
 * @param {Object} mapping object containing type definition and if should be array bool
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
 * @param {Array} arr ortb2 data array
 * @param {Object} child object defining child type and if array
 * @param {String} path config path of data array
 * @param {String} parent parent path for logging warnings
 * @returns {Array} validated/filtered data
 */
export function filterArrayData(arr, child, path, parent) {
  arr = arr.filter((index, i) => {
    const check = typeValidation(index, {type: child.type, isArray: child.isArray});

    if (check && Array.isArray(index) === Boolean(child.isArray)) {
      return true;
    }

    logWarn(`Filtered ${parent}[] value at index ${i} in ortb2 data: expected type ${child.type}`);
    return false;
  }).filter((index, i) => {
    let requiredCheck = true;
    const mapping = deepAccess(ORTB_MAP, path);

    if (mapping && mapping.required) requiredCheck = getRequiredData(index, mapping.required, parent, i);

    if (requiredCheck) return true;
    return false;
  }).reduce((result, value, i) => {
    let typeBool = false;
    const mapping = deepAccess(ORTB_MAP, path);

    switch (child.type) {
      case 'string':
        result.push(value);
        typeBool = true;
        break;
      case 'object':
        if (mapping && mapping.children) {
          const validObject = validateFpd(value, path + '.children.', parent + '.');
          if (Object.keys(validObject).length) {
            const requiredCheck = getRequiredData(validObject, mapping.required, parent, i);

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

    if (!typeBool) logWarn(`Filtered ${parent}[] value at index ${i}  in ortb2 data: expected type ${child.type}`);

    return result;
  }, []);

  return arr;
}

/**
 * Validates ortb2 object and filters out invalid data
 * @param {Object} fpd ortb2 object
 * @param {String} path config path of data array
 * @param {String} parent parent path for logging warnings
 * @returns {Object} validated/filtered data
 */
export function validateFpd(fpd, path = '', parent = '') {
  if (!fpd) return {};

  // Filter out imp property if exists
  const validObject = Object.assign({}, Object.keys(fpd).filter(key => {
    const mapping = deepAccess(ORTB_MAP, path + key);

    if (!mapping || !mapping.invalid) return key;

    logWarn(`Filtered ${parent}${key} property in ortb2 data: invalid property`);
    return false;
  }).filter(key => {
    const mapping = deepAccess(ORTB_MAP, path + key);
    // let typeBool = false;
    const typeBool = (mapping) ? typeValidation(fpd[key], {type: mapping.type, isArray: mapping.isArray}) : true;

    if (typeBool || !mapping) return key;

    logWarn(`Filtered ${parent}${key} property in ortb2 data: expected type ${(mapping.isArray) ? 'array' : mapping.type}`);
    return false;
  }).reduce((result, key) => {
    const mapping = deepAccess(ORTB_MAP, path + key);
    let modified = {};

    if (mapping) {
      if (mapping.optoutApplies && optout) {
        logWarn(`Filtered ${parent}${key} data: pubcid optout found`);
        return result;
      }

      modified = (mapping.type === 'object' && !mapping.isArray)
        ? validateFpd(fpd[key], path + key + '.children.', parent + key + '.')
        : (mapping.isArray && mapping.childType)
            ? filterArrayData(fpd[key], { type: mapping.childType, isArray: mapping.childisArray }, path + key, parent + key) : fpd[key];

      // Check if modified data has data and return
      (!isEmptyData(modified)) ? result[key] = modified
        : logWarn(`Filtered ${parent}${key} property in ortb2 data: empty data found`);
    } else {
      result[key] = fpd[key];
    }

    return result;
  }, {}));

  // Return validated data
  return validObject;
}

/**
 * Run validation on global and bidder config data for ortb2
 * @param {Object} data global and bidder config data
 * @returns {Object} validated data
 */
function runValidations(data) {
  return {
    global: validateFpd(data.global),
    bidder: Object.fromEntries(Object.entries(data.bidder).map(([bidder, conf]) => [bidder, validateFpd(conf)]))
  }
}

declare module '../../src/fpd/enrichment' {
  interface FirstPartyDataConfig {
    skipValidations?: boolean;
  }
}

/**
 * Sets default values to ortb2 if exists and adds currency and ortb2 setConfig callbacks on init
 * @param {Object} fpdConf configuration object
 * @param {Object} data ortb2 data
 * @returns {Object} processed data
 */
export function processFpd(fpdConf, data) {
  // Checks for existsnece of pubcid optout cookie/storage
  // if exists, filters user data out
  optout = (STORAGE.cookiesAreEnabled() && STORAGE.getCookie('_pubcid_optout')) ||
    (STORAGE.hasLocalStorage() && STORAGE.getDataFromLocalStorage('_pubcid_optout'));

  return (!fpdConf.skipValidations) ? runValidations(data) : data;
}

/** @type {{name: string, queue: number, processFpd: function}} */
export const validationSubmodule = {
  name: 'validation',
  queue: 1,
  processFpd
}

submodule('firstPartyData', validationSubmodule);
