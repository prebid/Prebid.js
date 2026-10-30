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
   * Unadjusted contractual or nominal deal CPM, in the response currency.
   */
  cpm: number;
  /**
   * CPM-equivalent value the ad server ranks the deal at, after any adjustment to its price (for example for pacing or delivery), in the response currency.
   */
  priority_adjusted_cpm: number;
  /**
   * Delivery relative to schedule; e.g. 0.5 means half of the expected impressions have been served.
   */
  on_schedule: number;
  /**
   * Relative precedence among deals.
   */
  priority: number;
  /**
   * Who validated the deal metadata; Prebid Server sets "adserver" on metadata from bidders listed in `ext.prebid.as.apb`.
   */
  source: string;
}>;
