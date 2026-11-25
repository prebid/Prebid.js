import { hook } from '../hook.js';
import { getRefererInfo, parseDomain } from '../refererDetection.js';
import { findRootDomain } from './rootDomain.js';
import {
  deepSetValue,
  deepAccess,
  getDefinedParams,
  getWinDimensions,
  getDocument,
  getWindowSelf,
  getWindowTop,
  mergeDeep,
  memoize
} from '../utils.js';
import { config } from '../config.js';
import { getHighEntropySUA, getLowEntropySUA } from './sua.js';
import { PbPromise } from '../utils/promise.js';
import { CLIENT_SECTIONS, clientSectionChecker, hasSection } from './oneClient.js';
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

const oneClient = clientSectionChecker('FPD');

export interface FirstPartyDataConfig {
  /**
   * High entropy UA client hints to request.
   * https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData#returning_high_entropy_values
   */
  uaHints?: string[]
  /**
   * If true, a bidder-specific schain (`ortb2.source.ext.schain` in `setBidderConfig`)
   * replaces the global schain for that bidder. By default (false), bidder-specific FPD is deep-merged into global
   * FPD, so the bidder's schain nodes are appended to the global schain's nodes.
   */
  replaceGlobalSchain?: boolean
  /**
   * Control keyword enrichment - `site.keywords`, `dooh.keywords` and/or `app.keywords`.
   */
  keywords?: {
    /**
     * If true (the default), add keywords from every <meta name="keywords">, <meta name="news_keywords">
     * and <meta property="article:tag"> to first party data.
     */
    meta?: boolean,
    /**
     * If true (the default), add keywords from JSON-LD tags (<script type="application/ld+json">) to first party data.
     * `keywords` are collected at any nesting level (including `@graph`), as comma-separated strings, arrays of strings,
     * or arrays of objects with a `name` (schema.org DefinedTerm).
     */
    json?: boolean
  }
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
  const promArr = [fpd, getSUA().catch(() => null)];

  return PbPromise.all(promArr)
    .then(([ortb2, sua]) => {
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
  return getDefinedParams(obj, Object.keys(obj));
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
      const { width: vpw, height: vph } = getViewportSize();

      const device = {
        w,
        h,
        ua: win.navigator.userAgent,
        language: win.navigator.language.split('-').shift(),
        ext: {
          vpw,
          vph,
        },
      };

      return device;
    });
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

const JSON_LD_MAX_DEPTH = 10;

function collectJsonLdKeywords(node, keywords: string[], depth = 0) {
  if (depth > JSON_LD_MAX_DEPTH || node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(item => collectJsonLdKeywords(item, keywords, depth + 1));
    return;
  }
  Object.entries(node).forEach(([key, value]) => {
    if (key === 'keywords') {
      (Array.isArray(value) ? value : [value]).forEach(kw => {
        if (typeof kw === 'string') {
          keywords.push(...kw.split(','));
        } else if (typeof kw?.name === 'string') {
          keywords.push(...kw.name.split(','));
        }
      });
    } else {
      collectJsonLdKeywords(value, keywords, depth + 1);
    }
  });
}

export const getJsonLdKeywords = memoize(() => {
  return winFallback((win) => {
    const keywords: string[] = [];
    Array.from(win.document.querySelectorAll('script[type="application/ld+json"]')).forEach((scriptTag: HTMLScriptElement) => {
      try {
        collectJsonLdKeywords(JSON.parse(scriptTag.textContent), keywords);
      } catch (e) {
        // silent
      }
    });
    return keywords;
  });
});

export const getMetaTagKeywords = memoize(() => {
  return winFallback((win) => {
    const keywords: string[] = [];
    Array.from(win.document.querySelectorAll('meta[name="keywords"], meta[name="news_keywords"], meta[property="article:tag"]'))
      .forEach((tag: HTMLMetaElement) => keywords.push(...tag.content.split(',')));
    return keywords;
  });
});

const HTML_ENTITY = /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi;

function filterKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  return keywords
    .map(kw => kw.trim())
    .filter(kw => {
      if (kw.length <= 1 || kw.length > 60 || /[:;|]/.test(kw.replace(HTML_ENTITY, '')) || kw.startsWith('_')) return false;
      const key = kw.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// Enrichment of properties common across dooh, app and site - will be dropped into whatever
// section is appropriate
function clientEnrichment(ortb2, ri) {
  const domain = parseDomain(ri.page, { noLeadingWww: true });
  let keywords: string[] = [];
  if (config.getConfig('firstPartyData.keywords.meta') ?? true) {
    keywords.push(...getMetaTagKeywords());
  }
  if (config.getConfig('firstPartyData.keywords.json') ?? true) {
    keywords.push(...getJsonLdKeywords());
  }
  keywords = filterKeywords(keywords);
  return removeUndef({
    domain,
    keywords: keywords.length > 0 ? keywords.join(',') : undefined,
    publisher: removeUndef({
      domain: dep.findRootDomain(domain)
    })
  });
}
