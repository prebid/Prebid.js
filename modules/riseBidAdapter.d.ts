/** Parameters accepted by the Rise bidder adapter. */
export interface RiseBidParams {
  /** Rise publisher ID. */
  org: string;
  /** Minimum price in USD; the higher of this and the price floors module floor is sent. */
  floorPrice?: number;
  /** Placement identifier; defaults to the GPT slot name. */
  placementId?: string;
  /** Send requests to the test endpoint. */
  testMode?: boolean;
  /** Overrides the endpoint host (e.g. `'www.test.com'`). */
  rtbDomain?: string;
  /** Whether Prebid runs inside a wrapper. */
  isWrapper?: boolean;
  /** Session ID; defaults to the bidder request ID. */
  sessionId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    rise: RiseBidParams;
    risexchange: RiseBidParams;
    openwebxchange: RiseBidParams;
  }
}
