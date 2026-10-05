export interface MotorikBidderParams {
  /**
   * Account ID on platform.
   */
  accountId: string;
  /**
   * Placement ID on platform.
   */
  placementId: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    motorik: MotorikBidderParams;
  }
}
