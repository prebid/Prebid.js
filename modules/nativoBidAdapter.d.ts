/** Parameters accepted by the Nativo bidder adapter; none are required. */
export interface NativoBidParams {
  /** Nativo placement ID. */
  placementId?: number | string;
  /** Page URL associated with the placement; overrides the detected location. */
  url?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    nativo: NativoBidParams;
    ntv: NativoBidParams;
  }
}
