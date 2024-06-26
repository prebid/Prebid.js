import { CLIENT_SECTIONS } from './fpd/oneClient.js';
import { deepAccess, uniques } from './utils.js';

export function getSegments(fpd, sections, segtax) {
  return sections
    .flatMap(section => deepAccess(fpd, section) || [])
    .filter(datum => datum.ext?.segtax === segtax)
    .flatMap(datum => datum.segment?.map(seg => seg.id))
    .filter(ob => ob)
    .filter(uniques)
}

export function getSignals(fpd) {
  const signals = Object.entries({
    IAB_AUDIENCE_1_1: getSegments(fpd, ['user.data'], 4),
    IAB_CONTENT_2_2: getSegments(fpd, CLIENT_SECTIONS.map(section => `${section}.content.data`), 6)
  }).map(([taxonomy, values]) => values.length ? {taxonomy, values} : null)
    .filter(ob => ob);

  return signals;
}

export function getFpdIntersection(fpdArray) {
  if (fpdArray.length === 0) {
    return {};
  }

  let common = fpdArray[0];

  for (let i = 1; i < fpdArray.length; i++) {
    common = getCommonObject(common, fpdArray[i]);
  }

  return common;
}

function getCommonObject(obj1, obj2) {
  let common = {};

  for (let key in obj1) {
    if (obj1.hasOwnProperty(key) && obj2.hasOwnProperty(key)) {
      if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
        let commonArray = getCommonArray(obj1[key], obj2[key]);
        if (commonArray.length > 0) {
          common[key] = commonArray;
        }
      } else if (typeof obj1[key] === 'object' && obj1[key] !== null && typeof obj2[key] === 'object' && obj2[key] !== null) {
        let commonPart = getCommonObject(obj1[key], obj2[key]);
        if (Object.keys(commonPart).length > 0) {
          common[key] = commonPart;
        }
      } else if (obj1[key] === obj2[key]) {
        common[key] = obj1[key];
      }
    }
  }

  return common;
}

function getCommonArray(arr1, arr2) {
  let commonArray = [];
  let minLength = Math.min(arr1.length, arr2.length);

  for (let i = 0; i < minLength; i++) {
    if (typeof arr1[i] === 'object' && arr1[i] !== null && typeof arr2[i] === 'object' && arr2[i] !== null) {
      let commonElement = getCommonObject(arr1[i], arr2[i]);
      if (Object.keys(commonElement).length > 0) {
        commonArray.push(commonElement);
      }
    } else if (arr1[i] === arr2[i]) {
      commonArray.push(arr1[i]);
    }
  }

  return commonArray;
}
