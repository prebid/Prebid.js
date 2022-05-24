/**
 * This module adds geoedge provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch creative wrapper from geoedge server
 * The module will place geoedge RUM client on bid responses markup
 * @module modules/geoedgeProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {Object} ModuleParams
 * @property {string} key
 * @property {?Object} bidders
 * @property {?boolean} wap
 * @property {?string} keyName
 */

import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { generateUUID, insertElement, isEmpty, logError } from '../src/utils.js';

/** @type {string} */
const SUBMODULE_NAME = 'geoedge';
/** @type {string} */
export const WRAPPER_URL = 'https://wrappers.geoedge.be/wrapper.html';
/** @type {string} */
/* eslint-disable no-template-curly-in-string */
export const HTML_PLACEHOLDER = '${creative}';
/** @type {string} */
const PV_ID = generateUUID();
/** @type {string} */
const HOST_NAME = 'https://rumcdn.geoedge.be';
/** @type {string} */
const FILE_NAME = 'grumi.js';
/** @type {function} */
export let getClientUrl = (key) => `${HOST_NAME}/${key}/${FILE_NAME}`;
/** @type {string} */
export let wrapper
/** @type {boolean} */;
let wrapperReady;
/** @type {boolean} */;
let preloaded;

/**
 * fetches the creative wrapper
 * @param {function} sucess - success callback
 */
export function fetchWrapper(success) {
  if (wrapperReady) {
    return success(wrapper);
  }
  ajax(WRAPPER_URL, success);
}

/**
 * sets the wrapper and calls preload client
 * @param {string} responseText
 */
export function setWrapper(responseText) {
  wrapperReady = true;
  wrapper = responseText;
}

/**
 * preloads the client
  * @param {string} key
 */
export function preloadClient(key) {
  let link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = getClientUrl(key);
  link.onload = () => { preloaded = true };
  insertElement(link);
}

/**
 * creates identity function for string replace without special replacement patterns
 * @param {string} str
 * @return {function}
 */
function replacer(str) {
  return function () {
    return str;
  }
}

export function wrapHtml(wrapper, html) {
  return wrapper.replace(HTML_PLACEHOLDER, replacer(html));
}

/**
 * generate macros dictionary from bid response
 * @param {Object} bid
 * @param {string} key
 * @return {Object}
 */
function getMacros(bid, key) {
  return {
    '${key}': key,
    '%%ADUNIT%%': bid.adUnitCode,
    '%%WIDTH%%': bid.width,
    '%%HEIGHT%%': bid.height,
    '%%PATTERN:hb_adid%%': bid.adId,
    '%%PATTERN:hb_bidder%%': bid.bidderCode,
    '%_isHb!': true,
    '%_hbcid!': bid.creativeId || '',
    '%%PATTERN:hb_pb%%': bid.pbHg,
    '%%SITE%%': location.hostname,
    '%_pimp%': PV_ID
  };
}

/**
 * replace macro placeholders in a string with values from a dictionary
 * @param {string} wrapper
 * @param {Object} macros
 * @return {string}
 */
function replaceMacros(wrapper, macros) {
  var re = new RegExp('\\' + Object.keys(macros).join('|'), 'gi');

  return wrapper.replace(re, function(matched) {
    return macros[matched];
  });
}

/**
 * build final creative html with creative wrapper
 * @param {Object} bid
 * @param {string} wrapper
 * @param {string} html
 * @return {string}
 */
function buildHtml(bid, wrapper, html, key) {
  let macros = getMacros(bid, key);
  wrapper = replaceMacros(wrapper, macros);
  return wrapHtml(wrapper, html);
}

/**
 * muatates the bid ad property
 * @param {Object} bid
 * @param {string} ad
 */
function mutateBid(bid, ad) {
  bid.ad = ad;
}

/**
 * wraps a bid object with the creative wrapper
 * @param {Object} bid
 * @param {string} key
 */
export function wrapBidResponse(bid, key) {
  let wrapped = buildHtml(bid, wrapper, bid.ad, key);
  mutateBid(bid, wrapped);
}

/**
 * checks if bidder's bids should be monitored
 * @param {string} bidder
 * @return {boolean}
 */
function isSupportedBidder(bidder, paramsBidders) {
  return isEmpty(paramsBidders) || paramsBidders[bidder] === true;
}

/**
 * checks if bid should be monitored
 * @param {Object} bid
 * @return {boolean}
 */
function shouldWrap(bid, params) {
  let supportedBidder = isSupportedBidder(bid.bidderCode, params.bidders);
  let donePreload = params.wap ? preloaded : true;
  return wrapperReady && supportedBidder && donePreload;
}

function conditionallyWrap(bidResponse, config, userConsent) {
  let params = config.params;
  if (shouldWrap(bidResponse, params)) {
    wrapBidResponse(bidResponse, params.key);
  }
}

function init(config, userConsent) {
  let params = config.params;
  if (!params || !params.key) {
    logError('missing key for geoedge RTD module provider');
    return false;
  }
  preloadClient(params.key);
  return true;
}

/** @type {RtdSubmodule} */
export const geoedgeSubmodule = {
  /**
     * used to link submodule with realTimeData
     * @type {string}
     */
  name: SUBMODULE_NAME,
  init,
  onBidResponseEvent: conditionallyWrap
};

export function beforeInit() {
  fetchWrapper(setWrapper);
  submodule('realTimeData', geoedgeSubmodule);
}

beforeInit();
