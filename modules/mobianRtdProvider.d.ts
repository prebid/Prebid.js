// the augmentation in this file only applies where the spec is part of the program
import type {} from './rtdModule/spec.js';

/**
 * Targeting keys that come from the contextual assessment endpoint.
 */
export type MobianContextTargetingKey =
  | 'apValues'
  | 'categories'
  | 'emotions'
  | 'genres'
  | 'risk'
  | 'sentiment'
  | 'tg'
  | 'themes'
  | 'tones';

/**
 * Targeting keys that come from the traffic quality endpoint.
 */
export type MobianTrafficQualityTargetingKey = 'tq';

/**
 * Targeting keys that come from the viewability endpoint.
 */
export type MobianViewabilityTargetingKey = 'vp';

export type MobianTargetingKey = MobianContextTargetingKey | MobianTrafficQualityTargetingKey | MobianViewabilityTargetingKey;

/**
 * `true` enables every contextual key, plus `tq` and `vp` when their respective
 * include flags are also `true`. `false` disables targeting, and an array picks
 * specific keys. Keys that are not in the array are dropped.
 */
export type MobianTargeting = boolean | MobianTargetingKey[];

export interface MobianRtdProviderParams {
  /**
   * Prefix for the targeting keys, e.g. `mobian_risk`. Defaults to `'mobian'`.
   */
  prefix?: string;
  /**
   * Keys set as GAM targeting. Contextual and traffic quality keys are page-level;
   * `vp` is slot-level. Defaults to `false`.
   */
  publisherTargeting?: MobianTargeting;
  /**
   * Keys written to `ortb2Fragments.global.site.ext.data`. Defaults to `false`.
   */
  advertiserTargeting?: MobianTargeting;
  /**
   * Request `tq` from the traffic quality endpoint when either targeting option
   * is `true`. Has no effect when the targeting option is an array. Defaults to
   * `false`.
   */
  includeTrafficQuality?: boolean;
  /**
   * Adds `vp` when `advertiserTargeting` is `true`. Has no effect when
   * `advertiserTargeting` is an array; list `vp` explicitly in that case.
   * Defaults to `false`.
   */
  includeViewabilityTargeting?: boolean;
  /**
   * Placement source sent to the viewability endpoint.
   */
  viewabilityTargetingPlacementSource?: string;
}

export interface MobianRtdProviderConfig {
  /**
   * Must be `'mobianBrandSafety'`.
   */
  name?: 'mobianBrandSafety';
  /**
   * When `true`, delay the auction up to `auctionDelay` milliseconds for this module.
   */
  waitForIt?: boolean;
  /**
   * Module-specific parameters.
   */
  params?: MobianRtdProviderParams;
}

/**
 * What `getConfig` returns: the publisher's params with both targeting options
 * resolved to the list of keys to request.
 */
export interface MobianResolvedConfig {
  prefix: string;
  publisherTargeting: MobianTargetingKey[];
  advertiserTargeting: MobianTargetingKey[];
  viewabilityTargetingPlacementSource?: string;
}

/**
 * Audience Propensity values, keyed by segment. Each is a list of segment IDs.
 */
export interface MobianApValues {
  a0?: Array<string | number>;
  a1?: Array<string | number>;
  p0?: Array<string | number>;
  p1?: Array<string | number>;
}

/**
 * Classifications for the page. Every field is absent when the endpoint returns
 * no results for that key.
 */
export interface MobianContextData {
  apValues?: MobianApValues;
  categories?: string[];
  emotions?: string[];
  genres?: string[];
  risk?: string;
  sentiment?: string;
  tg?: number;
  themes?: string[];
  tones?: string[];
  tq?: number;
}

/**
 * Viewability targeting values returned by the viewability endpoint after
 * conversion to strings for GPT.
 */
export interface MobianViewabilityData {
  likely_viewable?: string;
  probability?: string;
  bucket_percent?: string;
  confidence?: string;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    mobianBrandSafety: {
      params?: MobianRtdProviderParams;
    };
  }
}

export {};
