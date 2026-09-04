export interface EzoicBidderParams {
  /**
   * Optional placement identifier assigned during Ezoic onboarding.
   */
  placementId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    ezoic: EzoicBidderParams;
  }
}
