import { submodule } from '../src/hook.js';
import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'ias';
const IAS_HOST = 'https://pixel.adsafeprotected.com/services/pub';
export let iasTargeting = {};

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
  if (utils.isArray(sizes)) {
    result = sizes.reduce((acc, size) => {
      acc.push(size.join('.'));
      return acc;
    }, []);
    result = '[' + result.join(',') + ']';
  }
  return result;
}

function getAllSlots() {
  return utils.isGptPubadsDefined() && window.googletag.pubads().getSlots();
}

function getSlotByCode(code) {
  const slots = getAllSlots();
  if (!slots || !slots.length) {
    return null;
  }
  return utils.getGptSlotInfoForAdUnitCode(code);
}

function stringifySlot(bidRequest) {
  const sizes = utils.getAdUnitSizes(bidRequest);
  const id = bidRequest.code;
  const ss = stringifySlotSizes(sizes);
  const adSlot = getSlotByCode(bidRequest.code);
  const p = adSlot ? adSlot.gptSlot : bidRequest.code;
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

function getPageLevelKeywords(response) {
  let result = {};
  if (response.brandSafety) {
    shallowMerge(result, response.brandSafety);
  }
  if (response.fr) {
    result.fr = response.fr;
  }
  if (response.custom) {
    result['ias-kw'] = response.custom['ias-kw'];
  }
  return result;
}

function shallowMerge(dest, src) {
  utils.getKeys(src).reduce((dest, srcKey) => {
    dest[srcKey] = src[srcKey];
    return dest;
  }, dest);
}

function constructQueryString(anId, adUnits) {
  let queries = [];
  queries.push(['anId', anId]);

  queries = queries.concat(adUnits.reduce(function (acc, request) {
    acc.push(['slot', stringifySlot(request)]);
    return acc;
  }, []));

  queries.push(['wr', stringifyWindowSize()]);
  queries.push(['sr', stringifyScreenSize()]);
  queries.push(['url', encodeURIComponent(window.location.href)]);

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
    const commonBidResponse = {};
    shallowMerge(commonBidResponse, getPageLevelKeywords(iasTargeting));
    commonBidResponse.slots = iasTargeting.slots;
    Object.keys(commonBidResponse).forEach(key => commonBidResponse[key] === undefined ? delete commonBidResponse[key] : {});
    adUnits.forEach(function (adUnit) {
      targeting[adUnit] = {};
      shallowMerge(targeting[adUnit], commonBidResponse);
    });
  } catch (err) {
    utils.logError('error', err);
  }
  return targeting;
}

export function onAuctionInit(auctionDetails, config, userConsent) {
  const { pubId } = config.params;
  const anId = pubId;
  const queryString = constructQueryString(anId, auctionDetails.adUnits);
  ajax(
    `${IAS_HOST}?${queryString}`,
    getApiCallback(),
    undefined,
    { method: 'GET' }
  );
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

/** @type {RtdSubmodule} */
export const iasSubModule = {
  name: SUBMODULE_NAME,
  init: init,
  onAuctionInitEvent: onAuctionInit,
  getTargetingData: getTargetingData
};

submodule(MODULE_NAME, iasSubModule);
