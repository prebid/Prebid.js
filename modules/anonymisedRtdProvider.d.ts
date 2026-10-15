// the augmentation in this file only applies where the spec is part of the program
import type {} from './rtdModule/spec.js';

/**
 * Configuration for the Anonymised Marketing Tag, when the publisher lets this module load the
 * tag rather than installing it separately.
 */
export interface AnonymisedTagConfig {
  /**
   * The publisher's Anonymised client ID, provided by Anonymised. Mandatory: without it the
   * Marketing Tag is not loaded at all.
   */
  clientId: string;
  /**
   * Any other Anonymised Marketing Tag parameter. These are passed through to the tag script as
   * attributes, so the set of accepted keys is owned by the tag and can change independently of
   * this module.
   */
  [param: string]: unknown;
}

/**
 * Publisher configuration for the Anonymised RTD provider.
 *
 * Every field is optional. The Seller-Defined Audiences segment is configured entirely by the
 * Marketing Tag, so a publisher who wants only that can supply no params at all.
 */
export interface AnonymisedRtdProviderParams {
  /**
   * The `localStorage` key under which the Marketing Tag stores the Anonymised cohort IDs. Must be
   * `'cohort_ids'`; any other value is reported as a misconfiguration and no cohort segment is
   * written. Omit it entirely when the integration does not use cohorts.
   */
  cohortStorageKey?: 'cohort_ids';
  /**
   * Bidders with which to share cohort information. Currently only `'appnexus'` changes anything:
   * listing it also writes the cohort IDs to `user.keywords` as `perid=<id>`. The `user.data`
   * segments are not filtered by this list.
   */
  bidders?: string[];
  /**
   * The taxonomy reported as `ext.segtax` on the Anonymised cohort segment. Should be `1000`.
   * There is no default: when omitted, the segment carries `segtax: undefined`.
   *
   * This applies only to the cohort segment. The Seller-Defined Audiences segment always reports
   * `segtax: 4` (IAB Audience Taxonomy 1.1) and cannot be configured.
   */
  segtax?: number;
  /**
   * Configuration for the Anonymised Marketing Tag. Supply it to have this module load the tag;
   * omit it when the tag is already installed on the page by other means.
   */
  tagConfig?: AnonymisedTagConfig;
  /**
   * Overrides the URL the Marketing Tag is loaded from.
   *
   * @deprecated Will be removed in a future release. Defaults to
   * `https://static.anonymised.io/light/loader.js`.
   */
  tagUrl?: string;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    anonymised: {
      params?: AnonymisedRtdProviderParams;
    };
  }
}

export {};
