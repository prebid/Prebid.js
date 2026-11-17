export interface OneBidTechBidderParams {
  /**
   * One Bid Tech placement identifier. Selects which
   * partner backend and configuration handle this impression; required.
   */
  placementId: string;
  /**
   * Optional static price floor, denominated in `currency`. Used only as a
   * fallback when the Price Floors module is not configured for this ad
   * unit -- see getBidFloor() in buildAndInterpret.js.
   */
  bidFloor?: number;
  /**
   * ISO 4217 currency code that `bidFloor` is denominated in. Defaults to USD.
   */
  currency?: string;
}
