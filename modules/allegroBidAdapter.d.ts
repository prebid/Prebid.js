export interface AllegroBidRequestParams {
  /**
   * Publisher inventory identifier sent to Allegro DSP.
   */
  publisherId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    allegro: AllegroBidRequestParams;
  }
}
