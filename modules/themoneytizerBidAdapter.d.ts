/** Parameters accepted by The Moneytizer bidder adapter. The whole object is sent to the server as `params`. */
export interface ThemoneytizerBidParams {
  /** The Moneytizer publisher token. */
  pid: number;
  /** Set to `1` to receive a test bid response. */
  test?: number;
  /** Endpoint URL to use instead of `https://ads.biddertmz.com/m/`. */
  baseUrl?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    themoneytizer: ThemoneytizerBidParams;
  }
}
