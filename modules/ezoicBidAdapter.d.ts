export interface EzoicBidderParams {
  /**
   * Publisher-declared placement context.
   */
  placementType?: string;
  /**
   * Explicit CPM floor (USD unless `bidfloorcur` is set).
   */
  bidfloor?: number;
  /**
   * Currency of `bidfloor`.
   */
  bidfloorcur?: string;
  /**
   * Publisher-supplied identifier echoed back on the impression.
   */
  publisherProvidedId?: string;
  /**
   * Ezoic ad position type identifier.
   */
  adPositionType?: number;
  /**
   * Ezoic ad position identifier.
   */
  adPositionId?: number;
  /**
   * Ezoic sub-ad-position identifier.
   */
  subAdPositionId?: number;
  /**
   * Client impression identifier.
   */
  impressionId?: string;
  /**
   * Tap / slot targeting string forwarded to the endpoint.
   */
  tap?: string;
  /**
   * Google Publisher Tag page-level targeting key/value map.
   */
  googlePageTargeting?: Record<string, string | string[]>;
  /**
   * Alias of `bidfloor`.
   */
  floor?: number;
  /**
   * Alias of `placementType`.
   */
  placement_type?: string;
  /**
   * Alias of `placementType`.
   */
  pt?: string;
  /**
   * Alias of `impressionId`.
   */
  impression_id?: string;
  [key: string]: unknown;
}

declare module '../src/adUnits' {
  interface BidderParams {
    ezoic: EzoicBidderParams;
  }
}
