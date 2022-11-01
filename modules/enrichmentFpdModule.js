/**
 * This module sets default values and validates ortb2 first part data
 * @module modules/firstPartyData
 */
import {mergeDeep} from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {getRefererInfo, parseDomain} from '../src/refererDetection.js';
import {GreedyPromise} from '../src/utils/promise.js';
import {getHighEntropySUA, getLowEntropySUA} from '../libraries/fpd/sua.js';
import {findRootDomain} from '../src/fpd/rootDomain.js';

export {coreStorage} from '../src/fpd/rootDomain.js';

let ortb2;
let win = (window === window.top) ? window : window.top;

export const sua = {he: getHighEntropySUA, le: getLowEntropySUA};

/**
 * Checks for referer and if exists merges into ortb2 global data
 */
function setReferer() {
  if (getRefererInfo().ref) mergeDeep(ortb2, { site: { ref: getRefererInfo().ref } });
}

/**
 * Checks for canonical url and if exists merges into ortb2 global data
 */
function setPage() {
  if (getRefererInfo().page) mergeDeep(ortb2, { site: { page: getRefererInfo().page } });
}

/**
 * Checks for canonical url and if exists retrieves domain and merges into ortb2 global data
 */
function setDomain() {
  const domain = parseDomain(getRefererInfo().page, {noLeadingWww: true});
  if (domain) {
    mergeDeep(ortb2, { site: { domain: domain } });
    mergeDeep(ortb2, { site: { publisher: { domain: findRootDomain(domain) } } });
  };
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

  mergeDeep(ortb2, { device: { w: width, h: height } });
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

  if (keywords && keywords.content) mergeDeep(ortb2, { site: { keywords: keywords.content.replace(/\s/g, '') } });
}

function setDeviceSua(hints) {
  let data = Array.isArray(hints) && hints.length === 0
    ? GreedyPromise.resolve(sua.le())
    : sua.he(hints);
  return data.then((sua) => {
    if (sua != null) {
      mergeDeep(ortb2, {device: {sua}});
    }
  })
}

/**
 * Checks the Global Privacy Control status, and if exists and is true, merges into regs.ext.gpc
 */
function setGpc() {
  const gpcValue = navigator.globalPrivacyControl;
  if (gpcValue) {
    mergeDeep(ortb2, { regs: { ext: { gpc: 1 } } })
  }
}

/**
 * Resets modules global ortb2 data
 */
export const resetEnrichments = () => { ortb2 = null };

function runEnrichments(fpdConf) {
  setReferer();
  setPage();
  setDomain();
  setDimensions();
  setKeywords();
  setGpc();
  return setDeviceSua(fpdConf.uaHints).then(() => ortb2);
}

export function processFpd(fpdConf, {global}) {
  if (fpdConf.skipEnrichments) {
    return {global};
  } else {
    let ready;
    if (ortb2 == null) {
      ortb2 = {};
      ready = runEnrichments(fpdConf);
    } else {
      ready = GreedyPromise.resolve();
    }
    return ready.then(() => ({
      global: mergeDeep({}, ortb2, global)
    }))
  }
}
/** @type {firstPartyDataSubmodule} */
export const enrichmentsSubmodule = {
  name: 'enrichments',
  queue: 2,
  processFpd
}

submodule('firstPartyData', enrichmentsSubmodule)
