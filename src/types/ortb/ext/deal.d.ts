// https://github.com/prebid/Prebid.js/issues/15602

/**
 * Deal metadata extension (`seatbid[].bid[].ext.prebid.deal`).
 */
export type DealExt = Partial<{
  /**
   * Deal classification: 0 unknown, 1 sponsorship, 2 reservation, 3 non-reservation, 4 house.
   */
  type: number;
  /**
   * Unadjusted contractual or nominal deal CPM, in `cpm_cur`.
   */
  cpm: number;
  /**
   * ISO-4217 currency of `cpm`; defaults to the response currency.
   */
  cpm_cur: string;
  /**
   * CPM-equivalent value after applying the current pacing or delivery adjustment, in `pacing_adjusted_cpm_cur`.
   */
  pacing_adjusted_cpm: number;
  /**
   * ISO-4217 currency of `pacing_adjusted_cpm`; defaults to the response currency.
   */
  pacing_adjusted_cpm_cur: string;
  /**
   * Delivery relative to schedule; e.g. 0.5 means half of the expected impressions have been served.
   */
  on_schedule: number;
  /**
   * Relative precedence among deals.
   */
  priority: number;
}>;
