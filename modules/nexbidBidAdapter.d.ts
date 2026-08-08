export interface NexBidBidderParams {
  /** NexBid publisher account identifier. */
  publisherId: string;
  /** NexBid placement identifier. */
  placementId: string;
  /** Optional NexBid demand configuration identifier. */
  configId?: string;
  /** Enables the dedicated NexBid test publisher and placement only. */
  test?: boolean;
}

declare module '../src/adUnits' {
  interface BidderParams {
    nexbid: NexBidBidderParams;
  }
}
