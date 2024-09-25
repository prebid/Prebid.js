import { deepAccess, deepSetValue, generateUUID, logError, logInfo, mergeDeep } from '../src/utils.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';

export const DATA_PROVIDER = 'neuwo.ai';
const SEGTAX_IAB = 6 // IAB - Content Taxonomy version 2
const RESPONSE_IAB_TIER_1 = 'marketing_categories.iab_tier_1'
const RESPONSE_IAB_TIER_2 = 'marketing_categories.iab_tier_2'

function init(config, userConsent) {
  // config.params = config.params || {}
  // ignore module if publicToken is missing (module setup failure)
  if (!config || !config.params || !config.params.publicToken) {
    logError('publicToken missing', 'NeuwoRTDModule', 'config.params.publicToken')
    return false;
  }
  if (!config || !config.params || !config.params.apiUrl) {
    logError('apiUrl missing', 'NeuwoRTDModule', 'config.params.apiUrl')
    return false;
  }
  return true;
}

export function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  const confParams = config.params || {};
  logInfo('NeuwoRTDModule', 'starting getBidRequestData')

  const wrappedArgUrl = encodeURIComponent(confParams.argUrl || getRefererInfo().page);
  /* adjust for pages api.url?prefix=test (to add params with '&') as well as api.url (to add params with '?') */
  const joiner = confParams.apiUrl.indexOf('?') < 0 ? '?' : '&'
  const url = confParams.apiUrl + joiner + [
    'token=' + confParams.publicToken,
    'url=' + wrappedArgUrl
  ].join('&')
  const billingId = generateUUID();

  const success = (responseContent) => {
    logInfo('NeuwoRTDModule', 'GetAiTopics: response', responseContent)
    try {
      const jsonContent = JSON.parse(responseContent);
      if (jsonContent.marketing_categories) {
        events.emit(EVENTS.BILLABLE_EVENT, { type: 'request', billingId, vendor: neuwoRtdModule.name })
      }
      injectTopics(jsonContent, reqBidsConfigObj, billingId)
    } catch (ex) {
      logError('NeuwoRTDModule', 'Response to JSON parse error', ex)
    }
    callback()
  }

  const error = (err) => {
    logError('xhr error', null, err);
    callback()
  }

  ajax(url, {success, error}, null, {
    // could assume Origin header is set, or
    // customHeaders: { 'Origin': 'Origin' }
  })
}

export function addFragment(base, path, addition) {
  const container = {}
  deepSetValue(container, path, addition)
  mergeDeep(base, container)
}

/**
 * Concatenate a base array and an array within an object
 * non-array bases will be arrays, non-arrays at object key will be discarded
 * @param {Array} base base array to add to
 * @param {object} source object to get an array from
 * @param {string} key dot-notated path to array within object
 * @returns base + source[key] if that's an array
 */
function combineArray(base, source, key) {
  if (Array.isArray(base) === false) base = []
  const addition = deepAccess(source, key, [])
  if (Array.isArray(addition)) return base.concat(addition)
  else return base
}

export function injectTopics(topics, bidsConfig) {
  topics = topics || {}

  // join arrays of IAB category details to single array
  const combinedTiers = combineArray(
    combineArray([], topics, RESPONSE_IAB_TIER_1),
    topics, RESPONSE_IAB_TIER_2)

  const segment = pickSegments(combinedTiers)
  // effectively gets topics.marketing_categories.iab_tier_1, topics.marketing_categories.iab_tier_2
  // used as FPD segments content

  const IABSegments = {
    name: DATA_PROVIDER,
    ext: { segtax: SEGTAX_IAB },
    segment
  }

  addFragment(bidsConfig.ortb2Fragments.global, 'site.content.data', [IABSegments])

  // upgrade category taxonomy to IAB 2.2, inject result to page categories
  if (segment.length > 0) {
    addFragment(bidsConfig.ortb2Fragments.global, 'site.pagecat', segment.map(s => s.id))
  }

  logInfo('NeuwoRTDModule', 'injectTopics: post-injection bidsConfig', bidsConfig)
}

/* eslint-disable object-property-newline */
const D_IAB_ID = { // Content Taxonomy version 2.0 final release November 2017 [sic] (Taxonomy ID Mapping, IAB versions 2.0 - 2.2)
  'IAB19-1': '603', 'IAB6-1': '193', 'IAB5-2': '133', 'IAB20-1': '665', 'IAB20-2': '656', 'IAB23-2': '454', 'IAB3-2': '102', 'IAB20-3': '672', 'IAB8-5': '211',
  'IAB8-18': '211', 'IAB7-4': '288', 'IAB7-5': '233', 'IAB17-12': '484', 'IAB19-3': '608', 'IAB21-1': '442', 'IAB9-2': '248', 'IAB15-1': '456', 'IAB9-17': '265', 'IAB20-4': '658',
  'IAB2-3': '30', 'IAB2-1': '32', 'IAB17-1': '518', 'IAB2-2': '34', 'IAB2': '1', 'IAB8-2': '215', 'IAB17-2': '545', 'IAB17-26': '547', 'IAB9-3': '249', 'IAB18-1': '553', 'IAB20-5': '674',
  'IAB15-2': '465', 'IAB3-3': '119', 'IAB16-2': '423', 'IAB9-4': '259', 'IAB9-5': '270', 'IAB18-2': '574', 'IAB17-4': '549', 'IAB7-33': '312', 'IAB1-1': '42', 'IAB17-5': '485', 'IAB23-3': '458',
  'IAB20-6': '675', 'IAB3': '53', 'IAB20-7': '676', 'IAB19-5': '633', 'IAB20-9': '677', 'IAB9-6': '250', 'IAB17-6': '499', 'IAB2-4': '25', 'IAB9-7': '271', 'IAB4-11': '125', 'IAB4-1': '126',
  'IAB4': '123', 'IAB16-3': '424', 'IAB2-5': '18', 'IAB17-7': '486', 'IAB15-3': '466', 'IAB23-5': '459', 'IAB9-9': '260', 'IAB2-22': '19', 'IAB17-8': '500', 'IAB9-10': '261', 'IAB5-5': '137',
  'IAB9-11': '262', 'IAB2-21': '3', 'IAB19-2': '610', 'IAB19-8': '600', 'IAB19-9': '601', 'IAB3-5': '121', 'IAB9-15': '264', 'IAB2-6': '8', 'IAB2-7': '9', 'IAB22-2': '474', 'IAB17-9': '491',
  'IAB2-8': '10', 'IAB20-12': '678', 'IAB17-3': '492', 'IAB19-12': '611', 'IAB14-1': '188', 'IAB6-3': '194', 'IAB7-17': '316', 'IAB19-13': '612', 'IAB8-8': '217', 'IAB9-1': '205', 'IAB19-22': '613',
  'IAB8-9': '218', 'IAB14-2': '189', 'IAB16-4': '425', 'IAB9-12': '251', 'IAB5': '132', 'IAB6-9': '190', 'IAB19-15': '623', 'IAB17-17': '496', 'IAB20-14': '659', 'IAB6': '186', 'IAB20-26': '666',
  'IAB17-10': '510', 'IAB13-4': '396', 'IAB1-3': '201', 'IAB16-1': '426', 'IAB17-11': '511', 'IAB17-13': '511', 'IAB17-32': '511', 'IAB7-1': '225', 'IAB8': '210', 'IAB8-10': '219', 'IAB9-13': '266',
  'IAB10-4': '275', 'IAB9-14': '273', 'IAB15-8': '469', 'IAB15-4': '470', 'IAB17-15': '512', 'IAB3-7': '77', 'IAB19-16': '614', 'IAB3-8': '78', 'IAB2-10': '22', 'IAB2-12': '22', 'IAB2-11': '11',
  'IAB8-12': '221', 'IAB7-35': '223', 'IAB7-38': '223', 'IAB7-24': '296', 'IAB13-5': '411', 'IAB7-25': '234', 'IAB23-6': '460', 'IAB9': '239', 'IAB7-26': '235', 'IAB10': '274', 'IAB10-1': '278',
  'IAB10-2': '279', 'IAB19-17': '634', 'IAB10-5': '280', 'IAB5-10': '145', 'IAB5-11': '146', 'IAB20-17': '667', 'IAB17-16': '497', 'IAB20-18': '668', 'IAB3-9': '55', 'IAB1-4': '440', 'IAB17-18': '514',
  'IAB17-27': '515', 'IAB10-3': '282', 'IAB19-25': '618', 'IAB17-19': '516', 'IAB13-6': '398', 'IAB10-7': '283', 'IAB12-1': '382', 'IAB19-24': '624', 'IAB6-4': '195', 'IAB23-7': '461', 'IAB9-19': '252',
  'IAB4-4': '128', 'IAB4-5': '127', 'IAB23-8': '462', 'IAB10-8': '284', 'IAB5-8': '147', 'IAB16-5': '427', 'IAB11-2': '383', 'IAB12-3': '384', 'IAB3-10': '57', 'IAB2-13': '23', 'IAB9-20': '241',
  'IAB3-1': '58', 'IAB3-11': '58', 'IAB14-4': '191', 'IAB17-20': '520', 'IAB7-31': '228', 'IAB7-37': '301', 'IAB3-12': '107', 'IAB2-14': '13', 'IAB17-25': '519', 'IAB2-15': '27', 'IAB1-5': '324',
  'IAB1-6': '338', 'IAB9-16': '243', 'IAB13-8': '412', 'IAB12-2': '385', 'IAB9-21': '253', 'IAB8-6': '222', 'IAB7-32': '229', 'IAB2-16': '14', 'IAB17-23': '521', 'IAB13-9': '413', 'IAB17-24': '501',
  'IAB9-22': '254', 'IAB15-5': '244', 'IAB6-2': '196', 'IAB6-5': '197', 'IAB6-6': '198', 'IAB2-17': '24', 'IAB13-2': '405', 'IAB13': '391', 'IAB13-7': '410', 'IAB13-12': '415', 'IAB16': '422',
  'IAB9-23': '255', 'IAB7-36': '236', 'IAB15-6': '471', 'IAB2-18': '15', 'IAB11-4': '386', 'IAB1-2': '432', 'IAB5-9': '139', 'IAB6-7': '305', 'IAB5-12': '149', 'IAB5-13': '134', 'IAB19-4': '631',
  'IAB19-19': '631', 'IAB19-20': '631', 'IAB19-32': '631', 'IAB9-24': '245', 'IAB21': '441', 'IAB21-3': '451', 'IAB23': '453', 'IAB10-9': '276', 'IAB4-9': '130', 'IAB16-6': '429', 'IAB4-6': '129',
  'IAB13-10': '416', 'IAB2-19': '28', 'IAB17-28': '525', 'IAB9-25': '272', 'IAB17-29': '527', 'IAB17-30': '227', 'IAB17-31': '530', 'IAB22-1': '481', 'IAB15': '464', 'IAB9-26': '246', 'IAB9-27': '256',
  'IAB9-28': '267', 'IAB17-33': '502', 'IAB19-35': '627', 'IAB2-20': '4', 'IAB7-39': '307', 'IAB19-30': '605', 'IAB22': '473', 'IAB17-34': '503', 'IAB17-35': '531', 'IAB7-19': '309', 'IAB7-40': '310',
  'IAB19-6': '635', 'IAB7-41': '237', 'IAB17-36': '504', 'IAB17-44': '533', 'IAB20-23': '662', 'IAB15-7': '472', 'IAB20-24': '671', 'IAB5-14': '136', 'IAB6-8': '199', 'IAB17': '483', 'IAB9-29': '263',
  'IAB2-23': '5', 'IAB13-11': '414', 'IAB4-3': '395', 'IAB18': '552', 'IAB7-42': '311', 'IAB17-37': '505', 'IAB17-38': '537', 'IAB17-39': '538', 'IAB19-26': '636', 'IAB19': '596', 'IAB1-7': '640',
  'IAB17-40': '539', 'IAB7-43': '293', 'IAB20': '653', 'IAB8-16': '212', 'IAB8-17': '213', 'IAB16-7': '430', 'IAB9-30': '680', 'IAB17-41': '541', 'IAB17-42': '542', 'IAB17-43': '506', 'IAB15-10': '390',
  'IAB19-23': '607', 'IAB19-34': '629', 'IAB14-7': '165', 'IAB7-44': '231', 'IAB7-45': '238', 'IAB9-31': '257', 'IAB5-1': '135', 'IAB7-2': '301', 'IAB18-6': '580', 'IAB7-3': '297', 'IAB23-1': '453',
  'IAB8-1': '214', 'IAB7-6': '312', 'IAB7-7': '300', 'IAB7-8': '301', 'IAB13-1': '410', 'IAB7-9': '301', 'IAB15-9': '465', 'IAB7-10': '313', 'IAB3-4': '602', 'IAB20-8': '660', 'IAB8-3': '214',
  'IAB20-10': '660', 'IAB7-11': '314', 'IAB20-11': '660', 'IAB23-4': '459', 'IAB9-8': '270', 'IAB8-4': '214', 'IAB7-12': '306', 'IAB7-13': '313', 'IAB7-14': '287', 'IAB18-5': '575', 'IAB7-15': '315',
  'IAB8-7': '214', 'IAB19-11': '616', 'IAB7-16': '289', 'IAB7-18': '301', 'IAB7-20': '290', 'IAB20-13': '659', 'IAB7-21': '313', 'IAB18-3': '579', 'IAB13-3': '52', 'IAB20-15': '659', 'IAB8-11': '214',
  'IAB7-22': '318', 'IAB20-16': '659', 'IAB7-23': '313', 'IAB7': '223', 'IAB10-6': '634', 'IAB7-27': '318', 'IAB11-1': '388', 'IAB7-29': '318', 'IAB7-30': '304', 'IAB19-18': '619', 'IAB8-13': '214',
  'IAB20-19': '659', 'IAB20-20': '657', 'IAB8-14': '214', 'IAB18-4': '565', 'IAB23-9': '459', 'IAB11': '379', 'IAB8-15': '214', 'IAB20-21': '662', 'IAB17-21': '492', 'IAB17-22': '518', 'IAB12': '379',
  'IAB23-10': '453', 'IAB7-34': '301', 'IAB4-8': '395', 'IAB26-3': '608', 'IAB20-25': '151', 'IAB20-27': '659'
}

export function convertSegment(segment) {
  if (!segment) return {}
  return {
    id: D_IAB_ID[segment.id || segment.ID]
  }
}

/**
 * map array of objects to segments
 * @param {Array[{ID: string}]} normalizable
 * @returns array of IAB "segments"
 */
export function pickSegments(normalizable) {
  if (Array.isArray(normalizable) === false) return []
  return normalizable.map(convertSegment)
    .filter(t => t.id)
}

export const neuwoRtdModule = {
  name: 'NeuwoRTDModule',
  init,
  getBidRequestData
}

submodule('realTimeData', neuwoRtdModule)
