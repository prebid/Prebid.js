import {deepAccess, mergeDeep} from '../utils.js';

/**
 * Returns backwards compatible FPD data for modules
 */
export function getLegacyFpd(ortb2) {
  if (typeof ortb2 !== 'object') return;

  let duplicate = {};

  Object.keys(ortb2).forEach((type) => {
    let prop = (type === 'site') ? 'context' : type;
    duplicate[prop] = (prop === 'context' || prop === 'user') ? Object.keys(ortb2[type]).filter(key => key !== 'data').reduce((result, key) => {
      if (key === 'ext') {
        mergeDeep(result, ortb2[type][key]);
      } else {
        mergeDeep(result, {[key]: ortb2[type][key]});
      }

      return result;
    }, {}) : ortb2[type];
  });

  return duplicate;
}

/**
 * Returns backwards compatible FPD data for modules
 */
export function getLegacyImpFpd(ortb2Imp) {
  if (typeof ortb2Imp !== 'object') return;

  let duplicate = {};

  if (deepAccess(ortb2Imp, 'ext.data')) {
    Object.keys(ortb2Imp.ext.data).forEach((key) => {
      if (key === 'pbadslot') {
        mergeDeep(duplicate, {context: {pbAdSlot: ortb2Imp.ext.data[key]}});
      } else if (key === 'adserver') {
        mergeDeep(duplicate, {context: {adServer: ortb2Imp.ext.data[key]}});
      } else {
        mergeDeep(duplicate, {context: {data: {[key]: ortb2Imp.ext.data[key]}}});
      }
    });
  }

  return duplicate;
}
