export interface ShopnomixBidderParams {
  /**
   * Shopnomix publisher ID, issued in the Shopnomix publisher portal.
   * `pub_` followed by 26 characters.
   */
  publisherId: string;
  /**
   * Shopnomix native placement ID, issued in the Shopnomix publisher portal.
   * `plc_` followed by 26 characters. Sent as `imp.tagid`.
   *
   * Required unless the publisher's Shopnomix account is set up to detect
   * placements, in which case the slot is matched on the site and the ad unit
   * code instead.
   */
  placementId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    shopnomix: ShopnomixBidderParams;
  }
}
