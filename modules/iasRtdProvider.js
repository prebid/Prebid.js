import { submodule } from '../src/hook.js';
import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { getGlobal } from '../src/prebidGlobal.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'ias';
const IAS_HOST = 'https://pixel.adsafeprotected.com/services/pub';
export let iasTargeting = {};
const BRAND_SAFETY_OBJECT_FIELD_NAME = 'brandSafety';
const FRAUD_FIELD_NAME = 'fr';
const SLOTS_OBJECT_FIELD_NAME = 'slots';
const CUSTOM_FIELD_NAME = 'custom';
const IAS_KW = 'ias-kw';
const IAS_KEY_MAPPINGS = {
  adt: 'adt',
  alc: 'alc',
  dlm: 'dlm',
  hat: 'hat',
  off: 'off',
  vio: 'vio',
  drg: 'drg',
  'ias-kw': 'ias-kw',
  fr: 'fr',
  vw: 'vw',
  grm: 'grm',
  pub: 'pub',
  vw05: 'vw05',
  vw10: 'vw10',
  vw15: 'vw15',
  vw30: 'vw30',
  vw_vv: 'vw_vv',
  grm_vv: 'grm_vv',
  pub_vv: 'pub_vv',
  id: 'id'
};

/**
 * Module init
 * @param {Object} config
 * @param {Object} userConsent
 * @return {boolean}
 */
export function init(config, userConsent) {
  const params = config.params;
  if (!params || !params.pubId) {
    utils.logError('missing pubId param for IAS provider');
    return false;
  }
  if (params.hasOwnProperty('keyMappings')) {
    const keyMappings = params.keyMappings;
    for (let prop in keyMappings) {
      if (IAS_KEY_MAPPINGS.hasOwnProperty(prop)) {
        IAS_KEY_MAPPINGS[prop] = keyMappings[prop]
      }
    }
  }
  return true;
}

function stringifySlotSizes(sizes) {
  let result = '';
  if (utils.isArray(sizes)) {
    result = sizes.reduce((acc, size) => {
      acc.push(size.join('.'));
      return acc;
    }, []);
    result = '[' + result.join(',') + ']';
  }
  return result;
}

function getAdUnitPath(adSlot, bidRequest, adUnitPath) {
  let p = bidRequest.code;
  if (!utils.isEmpty(adSlot)) {
    p = adSlot.gptSlot;
  } else {
    if (!utils.isEmpty(adUnitPath) && utils.hasOwn(adUnitPath, bidRequest.code)) {
      if (utils.isStr(adUnitPath[bidRequest.code]) && !utils.isEmpty(adUnitPath[bidRequest.code])) {
        p = adUnitPath[bidRequest.code];
      }
    }
  }
  return p;
}

function stringifySlot(bidRequest, adUnitPath) {
  const sizes = utils.getAdUnitSizes(bidRequest);
  const id = bidRequest.code;
  const ss = stringifySlotSizes(sizes);
  const adSlot = utils.getGptSlotInfoForAdUnitCode(bidRequest.code);
  const p = getAdUnitPath(adSlot, bidRequest, adUnitPath);
  const slot = { id, ss, p };
  const keyValues = utils.getKeys(slot).map(function (key) {
    return [key, slot[key]].join(':');
  });
  return '{' + keyValues.join(',') + '}';
}

function stringifyWindowSize() {
  return [window.innerWidth || -1, window.innerHeight || -1].join('.');
}

function stringifyScreenSize() {
  return [(window.screen && window.screen.width) || -1, (window.screen && window.screen.height) || -1].join('.');
}

function renameKeyValues(source) {
  let result = {};
  for (let prop in IAS_KEY_MAPPINGS) {
    if (source.hasOwnProperty(prop)) {
      result[IAS_KEY_MAPPINGS[prop]] = source[prop];
    }
  }
  return result;
}

function formatTargetingData(adUnit) {
  let result = {};
  if (iasTargeting[BRAND_SAFETY_OBJECT_FIELD_NAME]) {
    utils.mergeDeep(result, iasTargeting[BRAND_SAFETY_OBJECT_FIELD_NAME]);
  }
  if (iasTargeting[FRAUD_FIELD_NAME]) {
    result[FRAUD_FIELD_NAME] = iasTargeting[FRAUD_FIELD_NAME];
  }
  if (iasTargeting[CUSTOM_FIELD_NAME] && IAS_KW in iasTargeting[CUSTOM_FIELD_NAME]) {
    result[IAS_KW] = iasTargeting[CUSTOM_FIELD_NAME][IAS_KW];
  }
  if (iasTargeting[SLOTS_OBJECT_FIELD_NAME] && adUnit in iasTargeting[SLOTS_OBJECT_FIELD_NAME]) {
    utils.mergeDeep(result, iasTargeting[SLOTS_OBJECT_FIELD_NAME][adUnit]);
  }
  return renameKeyValues(result);
}

function constructQueryString(anId, adUnits, pageUrl, adUnitPath) {
  let queries = [];
  queries.push(['anId', anId]);

  queries = queries.concat(adUnits.reduce(function (acc, request) {
    acc.push(['slot', stringifySlot(request, adUnitPath)]);
    return acc;
  }, []));

  queries.push(['wr', stringifyWindowSize()]);
  queries.push(['sr', stringifyScreenSize()]);
  queries.push(['url', encodeURIComponent(pageUrl)]);

  return encodeURI(queries.map(qs => qs.join('=')).join('&'));
}

function parseResponse(result) {
  let iasResponse = {};
  try {
    iasResponse = JSON.parse(result);
  } catch (err) {
    utils.logError('error', err);
  }
  iasTargeting = iasResponse;
}

function getTargetingData(adUnits, config, userConsent) {
  const targeting = {};
  try {
    if (!utils.isEmpty(iasTargeting)) {
      adUnits.forEach(function (adUnit) {
        targeting[adUnit] = formatTargetingData(adUnit);
      });
    }
  } catch (err) {
    utils.logError('error', err);
  }
  utils.logInfo('IAS targeting', targeting);
  return targeting;
}

function isValidHttpUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
}

export function getApiCallback() {
  return {
    success: function (response, req) {
      if (req.status === 200) {
        try {
          parseResponse(response);
        } catch (e) {
          utils.logError('Unable to parse IAS response.', e);
        }
      }
    },
    error: function () {
      utils.logError('failed to retrieve IAS data');
    }
  }
}

function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  const { pubId } = config.params;
  let { pageUrl } = config.params;
  const { adUnitPath } = config.params;
  if (!isValidHttpUrl(pageUrl)) {
    pageUrl = document.location.href;
  }
  const queryString = constructQueryString(pubId, adUnits, pageUrl, adUnitPath);
  ajax(
    `${IAS_HOST}?${queryString}`,
    getApiCallback(),
    undefined,
    { method: 'GET' }
  );
  callback()
}

/** @type {RtdSubmodule} */
export const iasSubModule = {
  name: SUBMODULE_NAME,
  init: init,
  getTargetingData: getTargetingData,
  getBidRequestData: getBidRequestData
};

submodule(MODULE_NAME, iasSubModule);
