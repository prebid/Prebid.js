import {hook} from '../hook.js';
import {getRefererInfo, parseDomain} from '../refererDetection.js';
import {findRootDomain} from './rootDomain.js';
import {deepSetValue, getDefinedParams, getDNT, getWindowSelf, getWindowTop, mergeDeep} from '../utils.js';
import {config} from '../config.js';
import {getHighEntropySUA, getLowEntropySUA} from './sua.js';
import {GreedyPromise} from '../utils/promise.js';
import {CLIENT_SECTIONS, clientSectionChecker, hasSection} from './oneClient.js';

export const dep = {
  getRefererInfo,
  findRootDomain,
  getWindowTop,
  getWindowSelf,
  getHighEntropySUA,
  getLowEntropySUA,
};

const oneClient = clientSectionChecker('FPD')

/**
 * Enrich an ortb2 object with first party data.
 * @param {Promise[{}]} fpd: a promise to an ortb2 object.
 * @returns: {Promise[{}]}: a promise to an enriched ortb2 object.
 */
export const enrichFPD = hook('sync', (fpd) => {
  return GreedyPromise.all([fpd, getSUA().catch(() => null)])
    .then(([ortb2, sua]) => {
      const ri = dep.getRefererInfo();
      mergeLegacySetConfigs(ortb2);
      Object.entries(ENRICHMENTS).forEach(([section, getEnrichments]) => {
        const data = getEnrichments(ortb2, ri);
        if (data && Object.keys(data).length > 0) {
          ortb2[section] = mergeDeep({}, data, ortb2[section]);
        }
      });
      if (sua) {
        deepSetValue(ortb2, 'device.sua', Object.assign({}, sua, ortb2.device.sua));
      }
      ortb2 = oneClient(ortb2);
      for (let section of CLIENT_SECTIONS) {
        if (hasSection(ortb2, section)) {
          ortb2[section] = mergeDeep({}, clientEnrichment(ortb2, ri), ortb2[section]);
          break;
        }
      }
      return ortb2;
    });
});

function mergeLegacySetConfigs(ortb2) {
  // merge in values from "legacy" setConfig({app, site, device})
  // TODO: deprecate these eventually
  ['app', 'site', 'device'].forEach(prop => {
    const cfg = config.getConfig(prop);
    if (cfg != null) {
      ortb2[prop] = mergeDeep({}, cfg, ortb2[prop]);
    }
  })
}

function winFallback(fn) {
  try {
    return fn(dep.getWindowTop());
  } catch (e) {
    return fn(dep.getWindowSelf());
  }
}

function getSUA() {
  const hints = config.getConfig('firstPartyData.uaHints');
  return !Array.isArray(hints) || hints.length === 0
    ? GreedyPromise.resolve(dep.getLowEntropySUA())
    : dep.getHighEntropySUA(hints);
}

function removeUndef(obj) {
  return getDefinedParams(obj, Object.keys(obj))
}

const ENRICHMENTS = {
  site(ortb2, ri) {
    if (CLIENT_SECTIONS.filter(p => p !== 'site').some(hasSection.bind(null, ortb2))) {
      // do not enrich site if dooh or app are set
      return;
    }
    return removeUndef({
      page: ri.page,
      ref: ri.ref,
    });
  },
  device() {
    return winFallback((win) => {
      const w = win.innerWidth || win.document.documentElement.clientWidth || win.document.body.clientWidth;
      const h = win.innerHeight || win.document.documentElement.clientHeight || win.document.body.clientHeight;
      return {
        w,
        h,
        dnt: getDNT() ? 1 : 0,
        ua: win.navigator.userAgent,
        language: win.navigator.language.split('-').shift(),
      };
    })
  },
  regs() {
    const regs = {};
    if (winFallback((win) => win.navigator.globalPrivacyControl)) {
      deepSetValue(regs, 'ext.gpc', 1);
    }
    const coppa = config.getConfig('coppa');
    if (typeof coppa === 'boolean') {
      regs.coppa = coppa ? 1 : 0;
    }
    return regs;
  }
};

// Enrichment of properties common across dooh, app and site - will be dropped into whatever
// section is appropriate
function clientEnrichment(ortb2, ri) {
  const domain = parseDomain(ri.page, {noLeadingWww: true});
  const keywords = winFallback((win) => win.document.querySelector('meta[name=\'keywords\']'))
    ?.content?.replace?.(/\s/g, '');
  return removeUndef({
    domain,
    keywords,
    publisher: removeUndef({
      domain: dep.findRootDomain(domain)
    })
  })
}
