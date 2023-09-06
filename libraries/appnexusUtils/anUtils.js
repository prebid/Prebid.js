/**
 * Converts a string value in camel-case to underscore eg 'placementId' becomes 'placement_id'
 * @param {string} value string value to convert
 */
import {deepClone, isPlainObject} from '../../src/utils.js';

export function convertCamelToUnderscore(value) {
  return value.replace(/(?:^|\.?)([A-Z])/g, function (x, y) {
    return '_' + y.toLowerCase();
  }).replace(/^_/, '');
}

/**
 * Creates an array of n length and fills each item with the given value
 */
export function fill(value, length) {
  let newArray = [];

  for (let i = 0; i < length; i++) {
    let valueToPush = isPlainObject(value) ? deepClone(value) : value;
    newArray.push(valueToPush);
  }

  return newArray;
}
