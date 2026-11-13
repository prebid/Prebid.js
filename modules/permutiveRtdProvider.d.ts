// the augmentation in this file only applies where the spec is part of the program
import type {} from './rtdModule/spec.js';

/**
 * Source for custom cohorts.
 *
 * Currently only `ls` (localStorage) is supported.
 */
export type PermutiveCustomCohortsSource = 'ls';

export interface PermutiveCustomCohortsConfig {
  /**
   * Where to read the custom cohorts from. Currently only `ls` (localStorage) is supported.
   */
  source: PermutiveCustomCohortsSource;
  /**
   * The localStorage key to read the custom cohort IDs from.
   * The value must be a JSON-encoded array of cohort IDs.
   */
  key: string;
}

export interface PermutiveBidderConfig {
  /**
   * Custom cohort source for this bidder. When set, the module will read cohort
   * IDs from the configured source and attach them to the bidder's ortb2 payload.
   */
  customCohorts?: PermutiveCustomCohortsConfig;
}

export interface PermutiveIabTransformationConfig {
  /**
   * IAB audience taxonomy version (e.g. `4` for v1.1).
   */
  segtax: number;
  /**
   * Mapping of Permutive segment IDs (keys) to IAB taxonomy IDs (values).
   */
  iabIds: Record<string, string>;
}

export interface PermutiveTransformationConfig {
  /**
   * Transformation identifier. Currently only `iab` is supported.
   */
  id: 'iab';
  /**
   * Transformation-specific configuration.
   */
  config: PermutiveIabTransformationConfig;
}

export interface PermutiveRtdProviderParams {
  /**
   * Bidder codes to share Permutive cohorts with via the Audience Connector
   * (`p_standard` / `ac` segments).
   */
  acBidders?: string[];
  /**
   * Maximum number of cohorts to include in either the `permutive` or
   * `p_standard` key-value. Defaults to `500`.
   */
  maxSegs?: number;
  /**
   * When `true`, require TCF vendor consent for Permutive (vendor 361).
   * Defaults to `false`.
   */
  enforceVendorConsent?: boolean;
  /**
   * Per-bidder configuration for custom cohort sources. Keys are bidder codes.
   * Listing a bidder here also causes the module to write ortb2 data for that
   * bidder, even if it is not in `acBidders` or on Permutive's SSP list.
   */
  bidders?: Record<string, PermutiveBidderConfig>;
  /**
   * Transformations to apply to `user.data` entries before they are written
   * to the ortb2 payload.
   */
  transformations?: PermutiveTransformationConfig[];
  /**
   * Legacy per-bidder custom functions, keyed by bidder code. For every bid of a matching bidder
   * the function is called with the bid, the Permutive segment data, whether the Audience
   * Connector is enabled for that bidder, a set of Prebid utilities and an identity function.
   */
  overwrites?: Record<string, PermutiveOverwriteFn>;
}

/**
 * Custom per-bidder function configured under `params.overwrites`.
 */
export type PermutiveOverwriteFn = (
  bid: Record<string, unknown>,
  segmentData: Record<string, unknown>,
  acEnabled: boolean,
  utils: Record<string, (...args: unknown[]) => unknown>,
  bidIdentity: <T>(bid: T) => T
) => void;

export interface PermutiveRtdProviderConfig {
  /**
   * When `true`, the auction waits for the Permutive SDK to reach real-time
   * before completing the bid request data callback. Defaults to `false`.
   */
  waitForIt?: boolean;
  /**
   * Module-specific parameters.
   */
  params?: PermutiveRtdProviderParams;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    permutive: {
      /**
       * Permutive RTD parameters. All are optional; defaults are merged in by the module.
       */
      params?: PermutiveRtdProviderParams;
    }
  }
}
