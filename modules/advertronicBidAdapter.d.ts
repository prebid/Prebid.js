export interface AdvertronicBidderParams {
  /**
   * Publisher ID issued during onboarding.
   */
  publisherId: string;
  /**
   * Placement token issued during onboarding.
   */
  placementId: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    advertronic: AdvertronicBidderParams;
  }
}
