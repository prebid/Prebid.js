export interface AdtrgtmeBidderParams {
  /**
   * Adtarget site/app id provided by the SSP. Sent as `site.id`.
   */
  sid: string;
  /**
   * Strict placement id, forwarded as `imp.tagid`.
   */
  zid?: string | number;
  /**
   * Manual impression bidfloor override, used as a fallback when the
   * Price Floors module is not available.
   */
  bidOverride?: {
    imp?: {
      /**
       * Impression bid floor.
       */
      bidfloor?: number;
      /**
       * Currency of the impression bid floor (ISO 4217).
       */
      bidfloorcur?: string;
    };
  };
}

declare module '../src/adUnits' {
  interface BidderParams {
    adtrgtme: AdtrgtmeBidderParams;
  }
}
