// the augmentation in this file only applies where the spec is part of the program
import type {} from './rtdModule/spec.js';
import type { StartAuctionOptions } from '../src/prebid.ts';

/**
 * Extra publisher data passed to `handleRtd` via `pbjs.setConfig({ optableRtdConfig })`.
 * Used for enrichment that should not be shared with other RTD providers or bidders.
 */
export interface OptableRtdConfig {
  /**
   * SHA-256 hashed email address.
   */
  email?: string;
  /**
   * SHA-256 hashed phone number.
   */
  phone?: string;
  /**
   * Postal / ZIP code.
   */
  postal_code?: string;
}

/**
 * Merge helper passed to `handleRtd`. Matches Prebid's `mergeDeep`: fields from
 * each source are merged into `target`.
 */
export type OptableMergeFn = (target: object, ...sources: object[]) => object;

/**
 * Custom RTD handler. May be sync or async. Responsible for enriching
 * `reqBidsConfigObj` (typically `ortb2Fragments.global`) with Optable data.
 */
export type OptableHandleRtd = (
  reqBidsConfigObj: StartAuctionOptions,
  optableExtraData: OptableRtdConfig,
  mergeFn: OptableMergeFn,
) => void | Promise<void>;

/**
 * Targeting data handed to `handleRtd` when `enableTargeting` is set: the targeting
 * API response, or the `optable-targeting:change` event detail when the SDK is on the page.
 */
export interface OptableTargetingData {
  ortb2?: {
    user?: {
      eids?: object[];
      data?: object[];
    };
  };
  /**
   * Split test arm assigned by the DCN, stamped on `ortb2Imp.ext.optable.splitTestAssignment`.
   */
  split_test_assignment?: string;
  [key: string]: unknown;
}

/**
 * Options passed to `handleRtd` as its fourth argument when `enableTargeting` is set.
 */
export interface OptableTargetingHandleRtdOptions {
  skipMergeIfUid2Exists?: boolean;
}

/**
 * Custom RTD handler used when `enableTargeting` is set. May be sync or async.
 */
export type OptableTargetingHandleRtd = (
  reqBidsConfigObj: StartAuctionOptions,
  targetingData: OptableTargetingData,
  mergeFn: OptableMergeFn,
  options: OptableTargetingHandleRtdOptions,
) => void | Promise<void>;

export interface OptableRtdProviderParams {
  /**
   * HTTPS URL of the Optable SDK bundle. When omitted, the module assumes the
   * bundle is already present on the page (`window.optable`). Ignored when `enableTargeting` is set.
   */
  bundleUrl?: string | null;
  /**
   * When `true`, Optable targeting key-values are applied to ad units for the
   * ad server. Defaults to `true`.
   */
  adserverTargeting?: boolean;
  /**
   * Property name on `window.optable` for the SDK instance used for ad-server
   * targeting. Defaults to `'instance'` (`window.optable.instance`).
   */
  instance?: string | null;
  /**
   * Optional custom handler that enriches the bid request with Optable data.
   * When omitted, the module waits for the `optable-targeting:change` event
   * (or cached targeting) and merges `ortb2` into the global fragment.
   * Receives `OptableTargetingHandleRtd` arguments when `enableTargeting` is set.
   */
  handleRtd?: OptableHandleRtd | OptableTargetingHandleRtd | null;
  /**
   * When `true`, the module fetches targeting itself: from the Web SDK's targeting
   * event when the SDK is on the page, otherwise from the targeting API using
   * `host`, `node` and `site`. Defaults to `false`.
   */
  enableTargeting?: boolean;
  /**
   * DCN host, e.g. `'dcn.example.com'`. `enableTargeting` only.
   */
  host?: string | null;
  /**
   * DCN node identifier. `enableTargeting` only.
   */
  node?: string | null;
  /**
   * Site slug configured on the DCN. `enableTargeting` only.
   */
  site?: string | null;
  /**
   * When `false`, the visitor passport is sent as a query parameter instead of
   * relying on cookies. Defaults to `true`. `enableTargeting` only.
   */
  cookies?: boolean;
  /**
   * Targeting API timeout hint, e.g. `'500ms'`. Overridden by `auctionDelay` minus 100ms
   * when the auction is delayed. `enableTargeting` only.
   */
  timeout?: number | string | null;
  /**
   * Optable identifiers sent as `id` (e.g. `'e:<sha256>'`, `'c:<ppid>'`). Defaults to
   * `['__passport__']`. `enableTargeting` only.
   */
  ids?: string[];
  /**
   * Hint identifiers sent as `hid`. `enableTargeting` only.
   */
  hids?: string[];
  /**
   * When `true`, UID2 EIDs from Optable are not merged if the bid request already
   * carries one. `enableTargeting` only.
   */
  skipMergeIfUid2Exists?: boolean;
}

export interface OptableRtdProviderConfig {
  /**
   * Must be `'optable'`.
   */
  name?: 'optable';
  /**
   * When `true`, delay the auction up to `auctionDelay` milliseconds for this module.
   */
  waitForIt?: boolean;
  /**
   * Module-specific parameters.
   */
  params?: OptableRtdProviderParams;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    optable: {
      params?: OptableRtdProviderParams;
    };
  }
}

declare module '../src/config' {
  interface Config {
    /**
     * Optional extra data for the Optable RTD handler (`handleRtd` /
     * `optableExtraData`). Not shared with other providers or bidders.
     */
    optableRtdConfig?: OptableRtdConfig;
  }
}

export {};
