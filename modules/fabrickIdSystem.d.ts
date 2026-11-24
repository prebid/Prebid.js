// the augmentation in this file only applies where the spec is part of the program
import type {} from './userId/spec.js';

/**
 * A value appended to the Fabrick ID request query string. Arrays add one query parameter per entry.
 */
export type FabrickIdParamValue = string | number | (string | number)[];

export interface FabrickIdParams {
  /**
   * API key provided by Neustar. Must be a string; the module requests no ID otherwise.
   */
  apiKey: string;
  /**
   * Hashed email address used to link a user to their Fabrick ID.
   */
  e?: FabrickIdParamValue;
  /**
   * Hashed phone number used to link a user to their Fabrick ID.
   */
  p?: FabrickIdParamValue;
  /**
   * IPv4 address used to link a user to their Fabrick ID.
   */
  i4?: FabrickIdParamValue;
  /**
   * IPv6 address used to link a user to their Fabrick ID.
   */
  i6?: FabrickIdParamValue;
  /**
   * Mobile advertising ID (IDFA/AAID).
   */
  m?: FabrickIdParamValue;
  /**
   * Identifier for advertising (IFA).
   */
  ia?: FabrickIdParamValue;
  /**
   * Identifier for vendors (IFV).
   */
  iv?: FabrickIdParamValue;
  /**
   * Partner or advertiser first-party user ID (other than a first-party cookie ID). Up to 255 characters.
   */
  '1pd'?: FabrickIdParamValue;
  /**
   * Partner or advertiser first-party cookie ID. Up to 255 characters.
   */
  '1pc'?: FabrickIdParamValue;
  /**
   * URL-encoded page URL.
   */
  u?: FabrickIdParamValue;
  /**
   * URL-encoded referrer URL.
   */
  f?: FabrickIdParamValue;
  /**
   * Source of the IFA, per the IAB IFA guidelines.
   */
  ifa_type?: FabrickIdParamValue;
  /**
   * Limit ad tracking: `1` (or `true`) when the user has opted out of ad tracking and measurement.
   * Booleans are sent as `1`/`0`.
   */
  lmt?: boolean | 0 | 1 | '0' | '1';
  /**
   * IAB Tech Lab Content Taxonomy v3.0 tier 1 category (URL-encoded).
   */
  iab1?: FabrickIdParamValue;
  /**
   * IAB Tech Lab Content Taxonomy v3.0 tier 2 category (URL-encoded).
   */
  iab2?: FabrickIdParamValue;
  /**
   * IAB Tech Lab Content Taxonomy v3.0 tier 3 category (URL-encoded).
   */
  iab3?: FabrickIdParamValue;
  /**
   * IAB Tech Lab Content Taxonomy v3.0 tier 4 category (URL-encoded).
   */
  iab4?: FabrickIdParamValue;
  /**
   * Overrides the Fabrick ID endpoint (including the trailing `?`). Defaults to `https://fid.agkn.com/f?`.
   */
  url?: string;
  /**
   * Overrides the referer information Prebid detects for the page.
   */
  refererInfo?: {
    topmostLocation?: string | null;
    stack?: (string | null)[];
    canonicalUrl?: string | null;
  };
  /**
   * Maximum request URL length. Defaults to `2000`.
   */
  maxUrlLen?: number;
  /**
   * Maximum length of each appended referrer. Defaults to `1000`.
   */
  maxRefLen?: number;
  /**
   * Minimum remaining URL space required to append another referrer. Defaults to `50`.
   */
  maxSpaceAvailable?: number;
}

declare module './userId/spec' {
  interface ProviderParams {
    fabrickId: FabrickIdParams;
  }
}
