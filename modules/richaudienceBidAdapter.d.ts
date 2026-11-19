/** Parameters accepted by the Rich Audience bidder adapter. */
export interface RichaudienceBidParams {
  /** Rich Audience placement ID. */
  pid: string;
  /** Identifier for advertisers (in-app). */
  ifa?: string;
  /** Bid floor; used when the price floors module gives none. */
  bidfloor?: number | string;
  /** Key-values for this bid, separated by semicolons, e.g. `'key1=value1;key2=value2'`. */
  keywords?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    richaudience: RichaudienceBidParams;
    ra: RichaudienceBidParams;
  }
}
