export interface AceexBidderParams {
  /**
   * Publisher ID on platform.
   */
  publisherId: number;
  /**
   * Configures the media type used for the placement.
   */
  trafficType: 'banner' | 'native' | 'video';
  /**
   * Publisher hash on platform.
   */
  internalKey: string;
  /**
   * Bid floor value.
   */
  bidfloor: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    aceex: AceexBidderParams;
  }
}
