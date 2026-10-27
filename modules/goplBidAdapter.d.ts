export interface GoplBidRequestParams {
  /**
   * Slot id, sent as `imp.id` (zero-padded to 3 digits).
   */
  id?: string;
  /**
   * Site id, sent as `site.id`.
   */
  siteId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    gopl: GoplBidRequestParams;
    sspBC: GoplBidRequestParams;
  }
}
