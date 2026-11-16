/** Parameters accepted by the Between bidder adapter. */
export interface BetweenBidParams {
  /** Section ID from the Between SSP control panel. */
  s: number | string;
  /** Currency (3-letter ISO 4217 code) the SSP should bid in; defaults to `'USD'`. */
  cur?: string;
  /** Impression tracking URL, passed through as `itu`. */
  itu?: string;
  /** Publisher sub-ID, passed through as `subid`. */
  subid?: number | string;
  /** Third-party click tracking URL, passed through as `click3rd`. */
  click3rd?: string;
  /** Publisher macros; each entry is sent URL-encoded as `pubside_macro[<key>]`. */
  pubdata?: Record<string, string | number | boolean>;
}

declare module '../src/adUnits' {
  interface BidderParams {
    between: BetweenBidParams;
    btw: BetweenBidParams;
  }
}
