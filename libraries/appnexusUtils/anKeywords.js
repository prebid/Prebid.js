import {_each, deepAccess, isArray, isNumber, isStr, mergeDeep, logWarn} from '../../src/utils.js';
import {getAllOrtbKeywords} from '../keywords/keywords.js';
import {CLIENT_SECTIONS} from '../../src/fpd/oneClient.js';

const ORTB_SEGTAX_KEY_MAP = {
  526: '1plusX',
  527: '1plusX',
  541: 'captify_segments',
  540: 'perid'
};
const ORTB_SEG_PATHS = ['user.data'].concat(
  CLIENT_SECTIONS.map((prefix) => `${prefix}.content.data`)
);

function getValueString(param, val, defaultValue) {
  if (val === undefined || val === null) {
    return defaultValue;
  }
  if (isStr(val)) {
    return val;
  }
  if (isNumber(val)) {
    return val.toString();
  }
  logWarn('Unsuported type for param: ' + param + ' required type: String');
}

/**
 * Converts an object of arrays (either strings or numbers) into an array of objects containing key and value properties
 * normally read from bidder params
 * eg { foo: ['bar', 'baz'], fizz: ['buzz'] }
 * becomes [{ key: 'foo', value: ['bar', 'baz']}, {key: 'fizz', value: ['buzz']}]
 * @param {Object} keywords object of arrays representing keyvalue pairs
 * @param {string} paramName name of parent object (eg 'keywords') containing keyword data, used in error handling
 * @returns {Array<{key, value}>}
 */
export function transformBidderParamKeywords(keywords, paramName = 'keywords') {
  const arrs = [];

  _each(keywords, (v, k) => {
    if (isArray(v)) {
      let values = [];
      _each(v, (val) => {
        val = getValueString(paramName + '.' + k, val);
        if (val || val === '') {
          values.push(val);
        }
      });
      v = values;
    } else {
      v = getValueString(paramName + '.' + k, v);
      if (isStr(v)) {
        v = [v];
      } else {
        return;
      } // unsuported types - don't send a key
    }
    v = v.filter(kw => kw !== '')
    const entry = {key: k}
    if (v.length > 0) {
      entry.value = v;
    }
    arrs.push(entry);
  });

  return arrs;
}

// converts a comma separated list of keywords into the standard keyword object format used in appnexus bid params
// 'genre=rock,genre=pop,pets=dog,music' goes to { 'genre': ['rock', 'pop'], 'pets': ['dog'], 'music': [''] }
export function convertKeywordStringToANMap(keyStr) {
  if (isStr(keyStr) && keyStr !== '') {
    // will split based on commas and will eat white space before/after the comma
    return convertKeywordsToANMap(keyStr.split(/\s*(?:,)\s*/));
  } else {
    return {}
  }
}

/**
 * @param {Array<String>} kwarray keywords as an array of strings
 * @return {{}} appnexus-style keyword map
 */
function convertKeywordsToANMap(kwarray) {
  const result = {};
  kwarray.forEach(kw => {
    // if = exists, then split
    if (kw.indexOf('=') !== -1) {
      let kwPair = kw.split('=');
      let key = kwPair[0];
      let val = kwPair[1];

      // then check for existing key in result > if so add value to the array > if not, add new key and create value array
      if (result.hasOwnProperty(key)) {
        result[key].push(val);
      } else {
        result[key] = [val];
      }
    } else {
      if (!result.hasOwnProperty(kw)) {
        result[kw] = [];
      }
    }
  })
  return result;
}

/**
 * @param ortb2
 * @return {{}} appnexus-style keyword map using all keywords contained in ortb2
 */
export function getANMapFromOrtbKeywords(ortb2) {
  return convertKeywordsToANMap(getAllOrtbKeywords(ortb2));
}

export function getANKewyordParamFromMaps(...anKeywordMaps) {
  return transformBidderParamKeywords(
    mergeDeep(...anKeywordMaps.map(kwMap => Object.fromEntries(
      Object.entries(kwMap || {})
        .map(([k, v]) => [k, (isNumber(v) || isStr(v)) ? [v] : v])
    )))
  )
}

export function getANKeywordParam(ortb2, ...anKeywordsMaps) {
  return getANKewyordParamFromMaps(
    getANMapFromOrtbKeywords(ortb2),
    getANMapFromOrtbSegments(ortb2),
    ...anKeywordsMaps
  )
}

export function getANMapFromOrtbSegments(ortb2) {
  let ortbSegData = {};
  ORTB_SEG_PATHS.forEach(path => {
    let ortbSegsArrObj = deepAccess(ortb2, path) || [];
    ortbSegsArrObj.forEach(segObj => {
      // only read segment data from known sources
      const segtax = ORTB_SEGTAX_KEY_MAP[deepAccess(segObj, 'ext.segtax')];
      if (segtax) {
        segObj.segment.forEach(seg => {
          // if source was in multiple locations of ortb or had multiple segments in same area, stack them together into an array
          if (ortbSegData[segtax]) {
            ortbSegData[segtax].push(seg.id);
          } else {
            ortbSegData[segtax] = [seg.id]
          }
        });
      }
    });
  });
  return ortbSegData;
}
