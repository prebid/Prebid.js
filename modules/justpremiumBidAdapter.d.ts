/** Parameters accepted by the Justpremium bidder adapter. */
export interface JustpremiumBidParams {
  /** Zone ID provided by Justpremium; parsed with `parseInt`. */
  zone: number | string;
  /** Formats (product codes, e.g. `'wp'`) allowed to run in this ad unit; takes precedence over `exclude`. */
  allow?: string[];
  /** @deprecated Use `allow`. */
  formats?: string[];
  /** Formats (product codes, e.g. `'is'`) that must not run in this ad unit. */
  exclude?: string[];
}

declare module '../src/adUnits' {
  interface BidderParams {
    justpremium: JustpremiumBidParams;
  }
}
