interface MgidParams {
  /**
   * Publisher account ID.
   */
  accountId: string | number;
  /**
   * Custom bid endpoint URL (overrides default).
   */
  bidUrl?: string;
  /**
   * Bid floor value.
   */
  bidFloor?: number;
  /**
   * Request currency code. Defaults to `USD`.
   */
  currency?: string;
}

interface MgidLegacyParams {
  /**
   * @deprecated Use `bidFloor` instead.
   */
  bidfloor?: number;
  /**
   * @deprecated Use `currency` instead.
   */
  cur?: string;
  /**
   * @deprecated Use `ortb2.bcat` instead.
   */
  bcat?: string[];
  /**
   * @deprecated Use `ortb2.badv` instead.
   */
  badv?: string[];
  /**
   * @deprecated Use `ortb2.wlang` instead.
   */
  wlang?: string[];
}

export type MgidBidderParams = MgidParams & MgidLegacyParams;

/**
 * Bidder-level options, set via `pbjs.bidderSettings.mgid = {...}`.
 */
export interface MgidBidderSettings {
  /**
   * Opt in to sending MGID usage data (pageview/visit counters, view rates)
   * with bid requests. Defaults to `false`.
   */
  enhancedBidData?: boolean;
}

declare module '../src/adUnits' {
  interface BidderParams {
    mgid: MgidBidderParams;
  }
}
