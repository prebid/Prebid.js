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

export const appnexusAliases = [
  { code: 'appnexusAst', gvlid: 32 },
  { code: 'emxdigital', gvlid: 183 },
  { code: 'emetriq', gvlid: 213 },
  { code: 'pagescience', gvlid: 32 },
  { code: 'gourmetads', gvlid: 32 },
  { code: 'matomy', gvlid: 32 },
  { code: 'featureforward', gvlid: 32 },
  { code: 'oftmedia', gvlid: 32 },
  { code: 'adasta', gvlid: 32 },
  { code: 'beintoo', gvlid: 618 },
  { code: 'projectagora', gvlid: 1032 },
  { code: 'stailamedia', gvlid: 32 },
  { code: 'uol', gvlid: 32 },
  { code: 'adzymic', gvlid: 723 },
];

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
