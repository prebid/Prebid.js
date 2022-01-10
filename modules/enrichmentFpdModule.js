/**
 * This module sets default values and validates ortb2 first part data
 * @module modules/firstPartyData
 */
import * as utils from '../src/utils.js';
import { submodule } from '../src/hook.js'
import { getRefererInfo } from '../src/refererDetection.js'

let ortb2 = {};
let win = (window === window.top) ? window : window.top;

/**
 * Checks for referer and if exists merges into ortb2 global data
 */
function setReferer() {
  if (getRefererInfo().referer) utils.mergeDeep(ortb2, { site: { ref: getRefererInfo().referer } });
}

/**
 * Checks for canonical url and if exists merges into ortb2 global data
 */
function setPage() {
  if (getRefererInfo().canonicalUrl) utils.mergeDeep(ortb2, { site: { page: getRefererInfo().canonicalUrl } });
}

/**
 * Checks for canonical url and if exists retrieves domain and merges into ortb2 global data
 */
function setDomain() {
  let parseDomain = function(url) {
    if (!url || typeof url !== 'string' || url.length === 0) return;

    var match = url.match(/^(?:https?:\/\/)?(?:www\.)?(.*?(?=(\?|\#|\/|$)))/i);

    return match && match[1];
  };

  let domain = parseDomain(getRefererInfo().canonicalUrl)

  if (domain) utils.mergeDeep(ortb2, { site: { domain: domain } });
}

/**
 * Checks for screen/device width and height and sets dimensions
 */
function setDimensions() {
  let width;
  let height;

  try {
    width = win.innerWidth || win.document.documentElement.clientWidth || win.document.body.clientWidth;
    height = win.innerHeight || win.document.documentElement.clientHeight || win.document.body.clientHeight;
  } catch (e) {
    width = window.innerWidth || window.document.documentElement.clientWidth || window.document.body.clientWidth;
    height = window.innerHeight || window.document.documentElement.clientHeight || window.document.body.clientHeight;
  }

  utils.mergeDeep(ortb2, { device: { w: width, h: height } });
}

/**
 * Scans page for meta keywords, and if exists, merges into site.keywords
 */
function setKeywords() {
  let keywords;

  try {
    keywords = win.document.querySelector("meta[name='keywords']");
  } catch (e) {
    keywords = window.document.querySelector("meta[name='keywords']");
  }

  if (keywords && keywords.content) utils.mergeDeep(ortb2, { site: { keywords: keywords.content.replace(/\s/g, '') } });
}

/**
 * Resets modules global ortb2 data
 */
const resetOrtb2 = () => { ortb2 = {} };

function runEnrichments() {
  setReferer();
  setPage();
  setDomain();
  setDimensions();
  setKeywords();

  return ortb2;
}

/**
 * Sets default values to ortb2 if exists and adds currency and ortb2 setConfig callbacks on init
 */
export function initSubmodule(fpdConf, data) {
  resetOrtb2();

  return (!fpdConf.skipEnrichments) ? utils.mergeDeep(runEnrichments(), data) : data;
}

/** @type {firstPartyDataSubmodule} */
export const enrichmentsSubmodule = {
  name: 'enrichments',
  queue: 2,
  init: initSubmodule
}

submodule('firstPartyData', enrichmentsSubmodule)
