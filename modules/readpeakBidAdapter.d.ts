/** App-context parameters for in-app inventory, mapped onto the ORTB `app` object. */
export interface ReadpeakAppParams {
  /** App bundle ID, mapped to ORTB `app.bundle`. */
  bundle?: string;
  /** App store URL, mapped to ORTB `app.storeurl`. */
  storeUrl?: string;
  /** App domain, mapped to ORTB `app.domain`. */
  domain?: string;
}

/** Parameters accepted by the Readpeak bidder adapter. */
export interface ReadpeakBidderParams {
  /** Readpeak publisher ID. Required. */
  publisherId: string | number;
  /** Site ID; falls back to `publisherId` when omitted. */
  siteId?: string | number;
  /** Tag/placement ID, mapped to `imp.tagid`. */
  tagId?: string;
  /** Bid floor. Only used when the floors module provides no value. */
  bidfloor?: number;
  /** Bid floor currency. Defaults to USD. */
  bidfloorcur?: string;
  /** App-context parameters; their presence switches the request to app inventory. */
  app?: ReadpeakAppParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    readpeak: ReadpeakBidderParams;
  }
}
