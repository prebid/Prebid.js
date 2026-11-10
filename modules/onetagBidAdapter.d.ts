/** Parameters accepted by the OneTag bidder adapter. */
export interface OnetagBidParams {
  /** Publisher ID provided by OneTag. */
  pubId: string;
  /** Custom key-value pairs, passed to the endpoint as-is. */
  ext?: Record<string, unknown>;
  /** Click tracking URL. */
  pubClick?: string;
  /** Deal ID. */
  dealId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    onetag: OnetagBidParams;
  }
}
