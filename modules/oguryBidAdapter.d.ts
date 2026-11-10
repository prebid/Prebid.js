/**
 * Parameters accepted by the Ogury bidder adapter. All params are copied into `imp.ext`.
 * `assetKey` and `adUnitId` are required together unless `ortb2.site.publisher.id` is set.
 */
export interface OguryBidParams {
  /** Asset key provided by Ogury, also sent as `site.id`. */
  assetKey?: string;
  /** Ad unit ID configured with Ogury. */
  adUnitId?: string;
  /** Horizontal margin of the ad, in pixels. */
  xMargin?: number;
  /** Vertical margin of the ad, in pixels. */
  yMargin?: number;
  /** Position of the ad on screen. */
  gravity?: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' | 'BOTTOM_CENTER' | 'TOP_CENTER' | 'CENTER';
}

declare module '../src/adUnits' {
  interface BidderParams {
    ogury: OguryBidParams;
  }
}
