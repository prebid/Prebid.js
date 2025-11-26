import {hook} from '../hook.js';
import {getRefererInfo, parseDomain} from '../refererDetection.js';
import {findRootDomain} from './rootDomain.js';
import {deepSetValue, deepAccess, getDefinedParams, getWinDimensions, getDocument, getWindowSelf, getWindowTop, mergeDeep} from '../utils.js';
import { getDNT } from '../../libraries/dnt/index.js';
import {config} from '../config.js';
import {getHighEntropySUA, getLowEntropySUA} from './sua.js';
import {PbPromise} from '../utils/promise.js';
import {CLIENT_SECTIONS, clientSectionChecker, hasSection} from './oneClient.js';
import {isActivityAllowed} from '../activities/rules.js';
import {activityParams} from '../activities/activityParams.js';
import {ACTIVITY_ACCESS_DEVICE} from '../activities/activities.js';
import {MODULE_TYPE_PREBID} from '../activities/modules.js';
import { getViewportSize } from '../../libraries/viewport/viewport.js';

export const dep = {
  getRefererInfo,
  findRootDomain,
  getWindowTop,
  getWindowSelf,
  getHighEntropySUA,
  getLowEntropySUA,
  getDocument
};

const oneClient = clientSectionChecker('FPD')

export interface FirstPartyDataConfig {
  /**
   * High entropy UA client hints to request.
   * https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData#returning_high_entropy_values
   */
  uaHints?: string[]
}

declare module '../config' {
  interface Config {
    firstPartyData?: FirstPartyDataConfig;
  }
}

/**
 * Enrich an ortb2 object with first-party data.
 * @param {Promise<Object>} fpd - A promise that resolves to an ortb2 object.
 * @returns {Promise<Object>} - A promise that resolves to an enriched ortb2 object.
 */
export const enrichFPD = hook('sync', (fpd) => {
  const promArr = [fpd, getSUA().catch(() => null), tryToGetCdepLabel().catch(() => null)];

  return PbPromise.all(promArr)
    .then(([ortb2, sua, cdep]) => {
      const ri = dep.getRefererInfo();
      Object.entries(ENRICHMENTS).forEach(([section, getEnrichments]) => {
        const data = getEnrichments(ortb2, ri);
        if (data && Object.keys(data).length > 0) {
          ortb2[section] = mergeDeep({}, data, ortb2[section]);
        }
      });

      if (sua) {
        deepSetValue(ortb2, 'device.sua', Object.assign({}, sua, ortb2.device.sua));
      }

      if (cdep) {
        const ext = {
          cdep
        }
        deepSetValue(ortb2, 'device.ext', Object.assign({}, ext, ortb2.device.ext));
      }

      const documentLang = dep.getDocument().documentElement.lang;
      if (documentLang) {
        deepSetValue(ortb2, 'site.ext.data.documentLang', documentLang);
        if (!deepAccess(ortb2, 'site.content.language')) {
          const langCode = documentLang.split('-')[0];
          deepSetValue(ortb2, 'site.content.language', langCode);
        }
      }

      ortb2 = oneClient(ortb2);
      for (const section of CLIENT_SECTIONS) {
        if (hasSection(ortb2, section)) {
          ortb2[section] = mergeDeep({}, clientEnrichment(ortb2, ri), ortb2[section]);
          break;
        }
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
  return !Array.isArray(hints) || hints.length === 0
    ? PbPromise.resolve(dep.getLowEntropySUA())
    : dep.getHighEntropySUA(hints);
}

function removeUndef(obj) {
  return getDefinedParams(obj, Object.keys(obj))
}

function tryToGetCdepLabel() {
  return PbPromise.resolve('cookieDeprecationLabel' in navigator && isActivityAllowed(ACTIVITY_ACCESS_DEVICE, activityParams(MODULE_TYPE_PREBID, 'cdep')) && (navigator.cookieDeprecationLabel as any).getValue());
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
      // screen.width and screen.height are the physical dimensions of the screen
      const w = getWinDimensions().screen.width;
      const h = getWinDimensions().screen.height;

      // vpw and vph are the viewport dimensions of the browser window
      const {width: vpw, height: vph} = getViewportSize();

      const device = {
        w,
        h,
        dnt: getDNT() ? 1 : 0,
        ua: win.navigator.userAgent,
        language: win.navigator.language.split('-').shift(),
        ext: {
          vpw,
          vph,
        },
      };

      return device;
    })
  },
  regs() {
    const regs = {} as any;
    if (winFallback((win) => win.navigator.globalPrivacyControl)) {
      deepSetValue(regs, 'ext.gpc', '1');
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
