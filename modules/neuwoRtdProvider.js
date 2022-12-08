import { deepAccess, deepSetValue, logError, mergeDeep } from '../src/utils.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';

export const DATA_PROVIDER = 'neuwo.ai';
const SEGTAX_IAB = 2 // IAB - Content Taxonomy version 2
const RESPONSE_IAB_TIER_1 = 'marketing_categories.iab_tier_1'
const RESPONSE_IAB_TIER_2 = 'marketing_categories.iab_tier_2'

function init(config = {}, userConsent = '') {
  config.params = config.params || {}
  // ignore module if publicToken is missing (module setup failure)
  if (!config.params.publicToken) {
    logError('publicToken missing', 'NeuwoRTDModule', 'config.params.publicToken')
    return false;
  }
  return true;
}

export function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  config.params = config.params || {};

  const wrappedArgUrl = encodeURIComponent(config.params.argUrl || getRefererInfo().page);
  const url = 'https://m1apidev.neuwo.ai/edge/GetAiTopics?' + [
    'token=' + config.params.publicToken,
    'lang=en',
    'url=' + wrappedArgUrl
  ].join('&')

  ajax(url, (responseContent) => {
    try {
      var jsonContent = JSON.parse(responseContent);
      injectTopics(jsonContent, reqBidsConfigObj, callback)
    } catch (ex) {
      logError('json parsery error', 'neuwoRTDModule', ex)
    }
  }, null, {
    // could assume Origin header is set, or
    // customHeaders: { 'Origin': 'Origin' }
  })
}

export function addFragment(base, path, addition) {
  let container = {}
  deepSetValue(container, path, addition)
  mergeDeep(base, container)
}

/**
 * Concatenate a base array and an array within an object
 * non-array bases will be arrays, non-arrays at object key will be discarded
 * @param {array} base base array to add to
 * @param {object} source object to get an array from
 * @param {string} key dot-notated path to array within object
 * @returns base + source[key] if that's an array
 */
function combineArray(base, source, key) {
  if (Array.isArray(base) === false) base = []
  let addition = deepAccess(source, key, [])
  if (Array.isArray(addition)) return base.concat(addition)
  else return base
}

export function injectTopics(topics, bidsConfig, callback) {
  topics = topics || {}

  // join arrays of IAB category details to single array
  let combinedTiers = combineArray(
    combineArray([], topics, RESPONSE_IAB_TIER_1),
    topics, RESPONSE_IAB_TIER_2)

  let segment = pickSegments(combinedTiers)
  // effectively gets topics.marketing_categories.iab_tier_1, topics.marketing_categories.iab_tier_2
  // used as FPD segments content

  let IABSegments = {
    name: DATA_PROVIDER,
    ext: { segtax: SEGTAX_IAB },
    segment
  }

  addFragment(bidsConfig.ortb2Fragments.global, 'site.content.data', [IABSegments])
  callback()
}

/**
 * map array of objects to segments
 * @param {Array[{ID: string}]} normalizable
 * @returns array of IAB "segments"
 */
export function pickSegments(normalizable) {
  if (Array.isArray(normalizable) === false) return []
  return normalizable.map(t => ({
    id: t ? (t.id || t.ID || '') : ''
  })).filter(t => t.id)
}

export const neuwoRtdModule = {
  name: 'NeuwoRTDModule',
  init,
  getBidRequestData
}

submodule('realTimeData', neuwoRtdModule)
