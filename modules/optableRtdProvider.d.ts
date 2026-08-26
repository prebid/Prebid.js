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

export interface OptableRtdProviderParams {
  /**
   * HTTPS URL of the Optable SDK bundle. When omitted, the module assumes the
   * bundle is already present on the page (`window.optable`).
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
  instance?: string;
  /**
   * Optional custom handler that enriches the bid request with Optable data.
   * When omitted, the module waits for the `optable-targeting:change` event
   * (or cached targeting) and merges `ortb2` into the global fragment.
   */
  handleRtd?: OptableHandleRtd | null;
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
