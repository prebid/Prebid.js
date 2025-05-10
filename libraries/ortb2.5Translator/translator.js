import {deepAccess, deepSetValue, logError} from '../../src/utils.js';

export const EXT_PROMOTIONS = [
  'device.sua',
  'source.schain',
  'regs.gdpr',
  'regs.us_privacy',
  'regs.gpp',
  'regs.gpp_sid',
  'user.consent',
  'user.eids'
];

export function splitPath(path) {
  const parts = path.split('.');
  const prefix = parts.slice(0, parts.length - 1).join('.');
  const field = parts[parts.length - 1];
  return [prefix, field];
}

/**
 * @param sourcePath a JSON path such as `regs.us_privacy`
 * @param dest {function(String, String): String} a function taking (prefix, field) and returning a destination path;
 *             for example, ('regs', 'us_privacy') => 'regs.ext.us_privacy'
 * @return {(function({}): (function(): void|undefined))|*} a function that takes an object and, if it contains
 *        sourcePath, copies its contents to destinationPath, returning a function that deletes the original sourcePath.
 */
export function moveRule(sourcePath, dest = (prefix, field) => `${prefix}.ext.${field}`) {
  const [prefix, field] = splitPath(sourcePath);
  dest = dest(prefix, field);
  return (ortb2) => {
    const obj = deepAccess(ortb2, prefix);
    if (obj?.[field] != null) {
      deepSetValue(ortb2, dest, obj[field]);
      return () => delete obj[field];
    }
  };
}

function kwarrayRule(section) {
  // move 2.6 `kwarray` into 2.5 comma-separated `keywords`.
  return (ortb2) => {
    const kwarray = ortb2[section]?.kwarray;
    if (kwarray != null) {
      let kw = (ortb2[section].keywords || '').split(',');
      if (Array.isArray(kwarray)) kw.push(...kwarray);
      ortb2[section].keywords = kw.join(',');
      return () => delete ortb2[section].kwarray;
    }
  };
}

export const DEFAULT_RULES = Object.freeze([
  ...EXT_PROMOTIONS.map((f) => moveRule(f)),
  ...['app', 'content', 'site', 'user'].map(kwarrayRule)
]);

/**
 * Factory for ORTB 2.5 translation functions.
 *
 * @param deleteFields if true, the translation function will remove fields that have been translated (transferred somewhere else within the request)
 * @param rules translation rules; an array of functions of the type returned by `moveRule`
 * @return {function({}): {}} a translation function that takes an ORTB object, modifies it in place, and returns it.
 */
export function ortb25Translator(deleteFields = true, rules = DEFAULT_RULES) {
  return function (ortb2) {
    rules.forEach(f => {
      try {
        const deleter = f(ortb2);
        if (typeof deleter === 'function' && deleteFields) deleter();
      } catch (e) {
        logError('Error translating request to ORTB 2.5', e);
      }
    })
    return ortb2;
  }
}

/**
 * Translate an ortb request to version 2.5 by moving 2.6 (and later) fields that have a standardized 2.5 extension.
 *
 * The request is modified in place and returned.
 */
export const toOrtb25 = ortb25Translator();
