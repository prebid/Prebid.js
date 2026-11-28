/** Parameters accepted by the Teads bidder adapter. */
export interface TeadsBidParams {
  /** Teads placement ID; must parse to a positive integer. */
  placementId: number | string;
  /** Teads page ID; must parse to a positive integer. */
  pageId: number | string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    teads: TeadsBidParams;
  }
}
