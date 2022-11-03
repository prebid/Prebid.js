import {hook} from '../hook.js';
import {getRefererInfo, parseDomain} from '../refererDetection.js';
import {findRootDomain} from './rootDomain.js';
import {getDefinedParams, getWindowSelf, getWindowTop, mergeDeep} from '../utils.js';
import {config} from '../config.js';
import {getHighEntropySUA, getLowEntropySUA} from '../../libraries/fpd/sua.js';
import {GreedyPromise} from '../utils/promise.js';

export const dep = {
  getRefererInfo,
  findRootDomain,
  getWindowTop,
  getWindowSelf,
  getHighEntropySUA,
  getLowEntropySUA,
};

/**
 * Enrich an ortb2 object with first party data.
 * @param {Promise[{}]} fpd: a promise to an ortb2 object.
 * @returns: {Promise[{}]}: a promise to an enriched ortb2 object.
 */
export const enrichFPD = hook('sync', (fpd) => {
  return GreedyPromise.all([fpd, getSUA().catch(() => null)])
    .then(([ortb2, sua]) => {
      Object.entries(ENRICHMENTS).forEach(([section, getEnrichments]) => {
        const data = getEnrichments();
        if (data) {
          ortb2[section] = mergeDeep({}, data, ortb2[section]);
        }
      });
      if (sua) {
        ortb2.device.sua = mergeDeep({}, sua, ortb2.device.sua);
      }
      return ortb2;
    });
});

function winFallback(fn) {
  try {
    return fn(dep.getWindowTop());
  } catch (e) {
    return fn(dep.getWindowSelf());
  }
}

function getSUA() {
  const hints = config.getConfig('firstPartyData.uaHints');
  return Array.isArray(hints) && hints.length === 0
    ? GreedyPromise.resolve(dep.getLowEntropySUA())
    : dep.getHighEntropySUA(hints);
}

const ENRICHMENTS = {
  site() {
    const ri = dep.getRefererInfo();
    const domain = parseDomain(ri.page, {noLeadingWww: true});
    const keywords = winFallback((win) => win.document.querySelector('meta[name=\'keywords\']'))
      ?.content?.replace?.(/\s/g, '');
    return (site => getDefinedParams(site, Object.keys(site)))({
      page: ri.page,
      ref: ri.ref,
      domain,
      keywords,
      publisher: {
        domain: dep.findRootDomain(domain)
      }
    });
  },
  device() {
    const [w, h] = winFallback((win) => [
      win.innerWidth || win.document.documentElement.clientWidth || win.document.body.clientWidth,
      win.innerHeight || win.document.documentElement.clientHeight || win.document.body.clientHeight
    ]);
    return {
      w,
      h
    };
  },
  regs() {
    if (winFallback((win) => win.navigator.globalPrivacyControl)) {
      return {
        ext: {
          gpc: 1
        }
      };
    }
  }
};
