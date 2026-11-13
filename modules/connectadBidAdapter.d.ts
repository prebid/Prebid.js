/** Parameters accepted by the ConnectAd bidder adapter. */
export interface ConnectadBidParams {
  /** ConnectAd site ID, sent as `imp.ext.siteId`. */
  siteId: number;
  /** ConnectAd network ID, sent as `imp.ext.networkId`. */
  networkId: number;
  /** Bid floor in USD; used when the price floors module gives none. */
  bidfloor?: number;
  /** @deprecated Use `bidfloor`. */
  floorprice?: number;
  /** Overrides the bid endpoint URL; read from the first bid of the request. For testing or a custom datacenter. */
  endpointUrl?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    connectad: ConnectadBidParams;
    connectadrealtime: ConnectadBidParams;
  }
}
