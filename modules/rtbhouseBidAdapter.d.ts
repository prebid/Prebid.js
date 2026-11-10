/** Parameters accepted by the RTB House bidder adapter. */
export interface RtbhouseBidParams {
  /** Unique publisher ID assigned by RTB House. Sent as a string. */
  publisherId: string | number;
  /** Region of the endpoint to send the request to. */
  region: 'prebid-eu' | 'prebid-us' | 'prebid-asia';
  /** Minimal CPM value; used when the price floors module provides no floor. */
  bidfloor?: number | string;
  /** Inventory channel identifier; truncated to 50 characters. */
  channel?: string | number;
  /** Sets the `test` flag of the request (1 for test traffic). */
  test?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    rtbhouse: RtbhouseBidParams;
  }
}
