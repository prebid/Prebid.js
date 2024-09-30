import {CLIENT_SECTIONS} from '../../src/fpd/oneClient.js';
import {deepAccess} from '../../src/utils.js';

const ORTB_KEYWORDS_PATHS = ['user.keywords'].concat(
  CLIENT_SECTIONS.flatMap((prefix) => ['keywords', 'content.keywords'].map(suffix => `${prefix}.${suffix}`))
);

/**
 * @param commaSeparatedKeywords any number of either keyword arrays, or comma-separated keyword strings
 * @returns an array with all unique keywords contained across all inputs
 */
export function mergeKeywords(...commaSeparatedKeywords) {
  const keywords = new Set();
  commaSeparatedKeywords
    .filter(kwds => kwds)
    .flatMap(kwds => Array.isArray(kwds) ? kwds : kwds.split(','))
    .map(kw => kw.replace(/^\s*/, '').replace(/\s*$/, ''))
    .filter(kw => kw)
    .forEach(kw => keywords.add(kw));
  return Array.from(keywords.keys());
}

/**
 * Get an array with all keywords contained in an ortb2 object.
 */
export function getAllOrtbKeywords(ortb2, ...extraCommaSeparatedKeywords) {
  return mergeKeywords(
    ...ORTB_KEYWORDS_PATHS.map(path => deepAccess(ortb2, path)),
    ...extraCommaSeparatedKeywords
  )
}
