/**
 * Vanegraph Real-Time Data submodule.
 *
 * Adds contextual signals for the current page to every auction, with no personal data, no cookies
 * and no storage: IAB Content Taxonomy 3.1 categories (site.content.cat, cattax 9), segtax 9 and 6
 * segments, brand-safety tier, reader intent and the publisher's own Vanegraph segments in
 * site.content.data. Pages are classified once and served from cache; an unseen page gets labels on
 * a later view, so the module never waits for a model during an auction.
 *
 * @module modules/vanegraphRtdProvider
 * @requires module:modules/realTimeData
 */

import { qualifiedAjaxBuilder } from '../src/ajax.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { logError, logInfo, mergeDeep } from '../src/utils.js';
import type { StartAuctionOptions } from '../src/prebid.ts';
import type { RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec.ts';

export const MODULE_NAME = 'vanegraph';
export const DEFAULT_ENDPOINT = 'https://api.vanegraph.com/v1/rtd';

export interface VanegraphRtdParams {
  /** Publishable key (pk_…), locked to the publisher's domains. Safe to use in page code. */
  publishableKey: string;
  /** Page URL to look up. Defaults to the current page. */
  url?: string;
  /**
   * Query parameters that identify the content (for example ["id"] for /article?id=123). All other query
   * parameters, and the fragment, are removed before the URL leaves the page. Default: none kept.
   */
  keepParams?: string[];
  /** Also set Google Ad Manager key-values (vg_cat, vg_safety, vg_intent, vg_seg). Default true. */
  setGptTargeting?: boolean;
  /** API endpoint override. */
  endpoint?: string;
}

declare module './rtdModule/spec.ts' {
  interface ProviderConfig {
    vanegraph: {
      params: VanegraphRtdParams;
    };
  }
}

type VanegraphTargeting = Record<string, string | string[]>;

type VanegraphResponse = {
  status: 'ready' | 'pending' | 'quota_exceeded';
  ortb2?: Record<string, unknown>;
  targeting?: VanegraphTargeting;
};

const ajax = qualifiedAjaxBuilder(MODULE_TYPE_RTD, MODULE_NAME);

function init(config: RTDProviderConfig<'vanegraph'>): boolean {
  const key = config?.params?.publishableKey;
  if (typeof key !== 'string' || key.indexOf('pk_') !== 0) {
    logError(`${MODULE_NAME}: params.publishableKey (pk_...) is required`);
    return false;
  }
  return true;
}

/**
 * The page to classify: origin and path only, plus any query parameters the publisher listed in keepParams.
 * Query strings can carry user-specific values (account ids, reset tokens), so they are dropped by default.
 */
export function pageUrl(params?: Partial<VanegraphRtdParams>): string {
  const raw = String(params?.url || getRefererInfo().page || window.location.href);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch (e) {
    return raw.split('#')[0].split('?')[0];
  }
  const keep = Array.isArray(params?.keepParams) ? params.keepParams : [];
  const query = keep
    .filter((name) => parsed.searchParams.has(name))
    .map((name) => `${encodeURIComponent(name)}=${encodeURIComponent(parsed.searchParams.get(name) || '')}`)
    .join('&');
  return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}`;
}

/** GDPR applies but the CMP has given no consent string: make no third-party request. */
export function consentMissing(userConsent?: { gdpr?: { gdprApplies?: boolean; consentString?: string } }): boolean {
  return Boolean(userConsent?.gdpr?.gdprApplies) && !userConsent?.gdpr?.consentString;
}

/**
 * When the publisher already sends site.content.cat in another taxonomy, keep it untouched: Vanegraph's
 * categories then travel only as site.content.data segments (segtax 9), never mixed into the publisher's list.
 */
export function withoutConflictingCategories(existing: any, ortb2: any): any {
  const current = existing?.site?.content;
  const ours = ortb2?.site?.content;
  if (!ours || !Array.isArray(current?.cat) || current.cat.length === 0 || current.cattax === ours.cattax) return ortb2;
  const { cat, cattax, ...rest } = ours;
  return { ...ortb2, site: { ...ortb2.site, content: rest } };
}

/** The Google Ad Manager keys this module owns. Page-level targeting persists across page changes in a single-page app, so they are always cleared before new labels are set, and cleared alone when the new page has none. */
export const GPT_KEYS = ['vg_cat', 'vg_safety', 'vg_intent', 'vg_seg'];

function queueGpt(fn: (pubads: any) => void): void {
  const w = window as any;
  const gt = (w.googletag = w.googletag || { cmd: [] });
  gt.cmd = gt.cmd || [];
  gt.cmd.push(() => fn(gt.pubads()));
}

/** Removes this module's key-values, so a page with no labels yet never keeps the previous page's. */
export function clearGptTargeting(): void {
  queueGpt((pubads) => GPT_KEYS.forEach((k) => pubads.clearTargeting(k)));
}

/** Mirrors the labels as Google Ad Manager key-values for direct-sold line items, replacing the previous page's. */
export function setGptTargeting(targeting?: VanegraphTargeting): void {
  if (!targeting) return;
  queueGpt((pubads) => {
    GPT_KEYS.forEach((k) => pubads.clearTargeting(k));
    Object.keys(targeting).forEach((k) => pubads.setTargeting(k, targeting[k]));
  });
}

function getBidRequestData(reqBidsConfigObj: StartAuctionOptions, callback: () => void, config: RTDProviderConfig<'vanegraph'>, userConsent?: any): void {
  const params = config?.params || ({} as VanegraphRtdParams);
  const gpt = params.setGptTargeting !== false;
  if (consentMissing(userConsent)) {
    logInfo(`${MODULE_NAME}: GDPR applies and no consent string is available; skipping`);
    if (gpt) clearGptTargeting();
    callback();
    return;
  }
  const endpoint = `${params.endpoint || DEFAULT_ENDPOINT}?key=${encodeURIComponent(params.publishableKey)}&url=${encodeURIComponent(pageUrl(params))}`;
  ajax(
    endpoint,
    {
      success(response: string, xhr: { status: number }) {
        let labelled = false;
        try {
          if (xhr && xhr.status !== 200) {
            logInfo(`${MODULE_NAME}: page not classified yet`);
          } else {
            const data = JSON.parse(response) as VanegraphResponse;
            if (data && data.status === 'ready' && data.ortb2) {
              const global = reqBidsConfigObj.ortb2Fragments.global;
              mergeDeep(global, withoutConflictingCategories(global, data.ortb2));
              if (gpt && data.targeting) {
                setGptTargeting(data.targeting);
                labelled = true;
              }
            }
          }
        } catch (e) {
          logError(`${MODULE_NAME}: invalid response`, e);
        }
        // Pending, not classified or invalid: the previous page's key-values must not carry over.
        if (gpt && !labelled) clearGptTargeting();
        callback();
      },
      error(err: unknown) {
        logError(`${MODULE_NAME}: request failed`, err);
        if (gpt) clearGptTargeting();
        callback();
      },
    },
    null,
    { method: 'GET', withCredentials: false }
  );
}

export const vanegraphSubmodule: RtdProviderSpec<'vanegraph'> = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
};

submodule('realTimeData', vanegraphSubmodule);
