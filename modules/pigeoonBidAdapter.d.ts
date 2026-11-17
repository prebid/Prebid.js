/** Parameters accepted by the Pigeoon bidder adapter. */
export interface PigeoonBidderParams {
  /** Publisher network ID provided by Pigeoon. */
  networkId: string;
  /** Placement ID provided by Pigeoon. */
  placementId: string | number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    pigeoon: PigeoonBidderParams;
  }
}
