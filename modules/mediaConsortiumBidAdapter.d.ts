export interface MediaConsortiumBidderParams {
  /**
   * Identifier of the placement. If absent, the ad unit code is used to identify the placement instead.
   */
  placementCode?: string;
  /**
   * Outstream video player configuration.
   */
  video?: Record<string, unknown>;
}

declare module '../src/adUnits' {
  interface BidderParams {
    mediaConsortium: MediaConsortiumBidderParams;
  }
}
