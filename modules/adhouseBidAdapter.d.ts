export interface AdhouseBidderParams {
  /**
   * Adhouse ad unit id. Sent as OpenRTB imp.tagid.
   */
  placementId: string | number;
  /**
   * Static CPM floor used only when the Prebid floors module is not loaded.
   * Expressed in `currency` (USD when omitted).
   */
  bidfloor?: number;
  /**
   * Currency of the static `bidfloor`. Defaults to USD, which is the currency
   * bidMotor bids in.
   */
  currency?: string;
  /**
   * Limits the bid to one video player. The spelling `standart_video` matches
   * the ad unit field. Omit the param to accept either player.
   */
  videoType?: 'standart_video' | 'sticky_video';
}

declare module '../src/adUnits' {
  interface BidderParams {
    adhouse: AdhouseBidderParams;
  }
}
