/** Parameters accepted by the Sharethrough bidder adapter. */
export interface SharethroughBidderParams {
  /** Sharethrough placement key. */
  pkey: string | number;
  /** Advertiser domains to block. */
  badv?: string[];
  /** IAB content categories to block. */
  bcat?: string[];
  /** Default bid floor in USD. */
  floor?: number;
  /** Equativ network ID used when routing the request through Equativ. */
  equativNetworkId?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    sharethrough: SharethroughBidderParams;
  }
}
