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

/** The page to classify, without its fragment. */
export function pageUrl(params?: Partial<VanegraphRtdParams>): string {
  const url = params?.url || getRefererInfo().page || window.location.href;
  return String(url).split('#')[0];
}

/** Mirrors the labels as Google Ad Manager key-values for direct-sold line items. */
export function setGptTargeting(targeting?: VanegraphTargeting): void {
  if (!targeting) return;
  const w = window as any;
  const gt = (w.googletag = w.googletag || { cmd: [] });
  gt.cmd = gt.cmd || [];
  gt.cmd.push(() => {
    const pubads = gt.pubads();
    Object.keys(targeting).forEach((k) => pubads.setTargeting(k, targeting[k]));
  });
}

function getBidRequestData(reqBidsConfigObj: StartAuctionOptions, callback: () => void, config: RTDProviderConfig<'vanegraph'>): void {
  const params = config?.params || ({} as VanegraphRtdParams);
  const endpoint = `${params.endpoint || DEFAULT_ENDPOINT}?key=${encodeURIComponent(params.publishableKey)}&url=${encodeURIComponent(pageUrl(params))}`;
  ajax(
    endpoint,
    {
      success(response: string, xhr: { status: number }) {
        try {
          if (xhr && xhr.status !== 200) {
            logInfo(`${MODULE_NAME}: page not classified yet`);
          } else {
            const data = JSON.parse(response) as VanegraphResponse;
            if (data && data.status === 'ready' && data.ortb2) {
              mergeDeep(reqBidsConfigObj.ortb2Fragments.global, data.ortb2);
              if (params.setGptTargeting !== false) setGptTargeting(data.targeting);
            }
          }
        } catch (e) {
          logError(`${MODULE_NAME}: invalid response`, e);
        }
        callback();
      },
      error(err: unknown) {
        logError(`${MODULE_NAME}: request failed`, err);
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
