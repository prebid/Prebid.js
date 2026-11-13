/** Parameters accepted by the Seedtag bidder adapter. */
export interface SeedtagBidParams {
  /** Publisher ID (publisher token). */
  publisherId: string;
  /** Ad unit ID. */
  adUnitId?: string;
  /** Ad unit placement, e.g. `'inScreen'`, `'inArticle'`, `'inBanner'` or `'inStream'`. */
  placement?: string;
  /** Integration type; read from the first bid of a request. */
  integrationType?: 'publisherToken' | 'ronId';
}

declare module '../src/adUnits' {
  interface BidderParams {
    seedtag: SeedtagBidParams;
    st: SeedtagBidParams;
  }
}
