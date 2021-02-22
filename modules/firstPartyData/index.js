/**
 * This module adds User ID support to prebid.js
 * @module modules/userId
 */


import find from 'core-js-pure/features/array/find.js';
import { config } from '../../src/config.js';
import events from '../../src/events.js';
import * as utils from '../../src/utils.js';
import { getRefererInfo } from '../../src/refererDetection.js'
import CONSTANTS from '../../src/constants.json';

const MODULE_NAME = 'First Party Data';
let ortb2 = {};
let shouldRun = true;


function setReferer() {
  if (getRefererInfo().referer) utils.mergeDeep(ortb2, {site: { ref: getRefererInfo().referer}});
}

function setPage() {
  if (getRefererInfo().canonicalUrl) utils.mergeDeep(ortb2, {site: { page: getRefererInfo().canonicalUrl}});
}

function setDomain() {
  let parseDomain = function(url) {
    if (!url || typeof url !== 'string' || url.length === 0) return;

    var match = url.match(/^(?:https?:\/\/)?(?:www\.)?(.*?(?=(\?|\#|\/|$)))/i);

    return match && match[1];
  };

  let domain = parseDomain(getRefererInfo().canonicalUrl)

  if (domain) utils.mergeDeep(ortb2, {site: { domain: domain}});
}

function setDimensions() {
  const width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  const height = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;

  utils.mergeDeep(ortb2, {device: { width: width, height: height}});
}

function setKeywords() {
  let keywords = document.querySelector('meta[name="keywords"]');

  if (keywords && keywords.content) utils.mergeDeep(ortb2, {site: { keywords: keywords.content.replace(/\s/g, '')}});
}

function validateFpd(obj) {
  let validObject =  Object.assign({}, Object.keys(obj).filter(key => {
    if (key !== 'imp') return key;

    utils.logWarn('Filtered imp property in ortb2 data');
  }).reduce((result, key) => {
    result[key] = obj[key];
    
    return result;
  }, {}));
  

  console.log(validObject);

  return validObject;
}

function hasChanged(config) {
  Object.keys(ortb2).forEach(key => {
    if (!utils.deepEqual(ortb2[key], config[key])) return false
  });

  return true;
}

function storeValue(config) {
  Object.keys(ortb2).forEach(key => {
    if (!utils.deepEqual(ortb2[key],config)) ortb2[key] = config[key];
  });
}


/**
 * test browser support for storage config types (local storage or cookie), initializes submodules but consentManagement is required,
 * so a callback is added to fire after the consentManagement module.
 * @param {{getConfig:function}} config
 */
export function init() {
  setReferer();
  setPage();
  setDomain();
  setDimensions();
  setKeywords();

  config.getConfig('currency', conf => {
    if (!conf.currency.adServerCurrency) return;

    utils.mergeDeep(ortb2, {cur: conf.currency.adServerCurrency});
    shouldRun = true;
    config.setConfig(config.getConfig('ortb2') || {ortb2: {}});
  });

  config.getConfig('ortb2', conf => {
    if (!shouldRun || !hasChanged(conf.ortb2)) {
      shouldRun = true;
      return;
    }

    conf.ortb2 = validateFpd(utils.mergeDeep(ortb2, conf.ortb2));
    //ortb2 = {...conf.ortb2}
    shouldRun = false;
    config.setConfig({ortb2: conf.ortb2});
  });
}

// init config update listener to start the application

init();
