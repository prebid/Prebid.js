export interface MonetizeBidderParams {
  /**
   * Zone id provided by Monetize.site. Sent in the endpoint URL (`?z=`) and as `imp.tagid`.
   */
  zoneID: string | number;
  /**
   * Impression floor, used when the Price Floors module provides none. Defaults to 0.
   */
  bidfloor?: number;
  /**
   * ISO 4217 currency of `bidfloor`. Defaults to `USD`.
   */
  cur?: string;
  /**
   * Hostname to send the bid request to instead of the default `rtb.monetize.site`, e.g. `rtb.example.com`.
   * Always called over https; takes precedence over the `endpoint` config.
   */
  mirror?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    monetize: MonetizeBidderParams;
  }
}
