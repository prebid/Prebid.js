export interface MonetsiteBidderParams {
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

export interface MonetsiteConfig {
  /**
   * Endpoint override, e.g. `https://rtb.example.com/ssp?z=`; the zone id is appended.
   * A per-bid `params.mirror` takes precedence.
   */
  endpoint?: string;
  /**
   * Bid TTL in seconds, `0 < ttl <= 5000`. Defaults to 500.
   */
  ttl?: number;
}

declare module '../src/config' {
  interface Config {
    monetsite?: MonetsiteConfig;
  }
}

declare module '../src/adUnits' {
  interface BidderParams {
    monetsite: MonetsiteBidderParams;
  }
}
