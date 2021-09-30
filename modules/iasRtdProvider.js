import { isArray, getAdUnitSizes, getKeys, logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { ajaxBuilder } from '../src/ajax.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'ias';

let bidResponses = {};

/**
 * Module init
 * @param {Object} provider
 * @param {Object} userConsent
 * @return {boolean}
 */
export function init(config, userConsent) {
  return true;
}

function stringifySlotSizes(sizes) {
  let result = '';
  if (isArray(sizes)) {
    result = sizes.reduce((acc, size) => {
      acc.push(size.join('.'));
      return acc;
    }, []);
    result = '[' + result.join(',') + ']';
  }
  return result;
}

function stringifySlot(bidRequest, adUnitPath) {
  const sizes = getAdUnitSizes(bidRequest);
  const id = bidRequest.code;
  const ss = stringifySlotSizes(sizes);
  const p = bidRequest.code;
  const slot = { id, ss, p };
  const keyValues = getKeys(slot).map(function (key) {
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

function getPageLevelKeywords(response) {
  let result = {};
  if (response.brandSafety) {
    shallowMerge(result, response.brandSafety);
  }
  result.fr = response.fr;
  result.custom = response.custom;
  return result;
}

function shallowMerge(dest, src) {
  getKeys(src).reduce((dest, srcKey) => {
    dest[srcKey] = src[srcKey];
    return dest;
  }, dest);
}

function getBidRequestData(reqBidsConfigObj, callback, config) {
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  let isFinish = false;

  const IAS_HOST = 'https://pixel.adsafeprotected.com/services/pub';
  const { pubId, adUnitPath } = config.params;
  const anId = pubId;
  let queries = [];
  queries.push(['anId', anId]);

  queries = queries.concat(adUnits.reduce(function (acc, request) {
    acc.push(['slot', stringifySlot(request, adUnitPath)]);
    return acc;
  }, []));

  queries.push(['wr', stringifyWindowSize()]);
  queries.push(['sr', stringifyScreenSize()]);
  queries.push(['url', encodeURIComponent(window.location.href)]);

  const queryString = encodeURI(queries.map(qs => qs.join('=')).join('&'));

  const ajax = ajaxBuilder();

  ajax(`${IAS_HOST}?${queryString}`, {
    success: function (response, request) {
      if (!isFinish) {
        if (request.status === 200) {
          const iasResponse = JSON.parse(response);
          const commonBidResponse = {};
          shallowMerge(commonBidResponse, getPageLevelKeywords(iasResponse));
          commonBidResponse.slots = iasResponse.slots;
          bidResponses = commonBidResponse;
          adUnits.forEach(adUnit => {
            adUnit.bids.forEach(bid => {
              const rtd = bid.rtd || {};
              const iasRtd = {};
              iasRtd[SUBMODULE_NAME] = Object.assign({}, rtd[SUBMODULE_NAME], bidResponses);
              bid.rtd = Object.assign({}, rtd, iasRtd);
            });
          });
        }
        isFinish = true;
      }
      callback();
    },
    error: function () {
      logError('failed to retrieve targeting information');
      callback();
    }
  });
}

function getTargetingData(adUnits, config, userConsent) {
  const targeting = {};
  Object.keys(bidResponses).forEach(key => bidResponses[key] === undefined ? delete bidResponses[key] : {});
  try {
    adUnits.forEach(function(adUnit) {
      targeting[adUnit] = bidResponses;
    });
  } catch (err) {
    logError('error', err);
  }
  return targeting;
}

/** @type {RtdSubmodule} */
export const iasSubModule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: getBidRequestData,
  getTargetingData: getTargetingData
};

submodule(MODULE_NAME, iasSubModule);
