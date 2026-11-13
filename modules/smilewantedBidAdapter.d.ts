/** Parameters accepted by the SmileWanted bidder adapter. */
export interface SmilewantedBidParams {
  /** SmileWanted placement zone ID. */
  zoneId: number | string;
  /** Bid floor; overrides the price floors module. */
  bidfloor?: number;
  /** Undocumented position type, sent as-is. */
  positionType?: string;
  /** Video settings merged over `mediaTypes.video` when validating the bid. */
  video?: {
    /** Video context; required (here or in `mediaTypes.video`) for video bids. */
    context?: 'instream' | 'outstream';
  };
}

declare module '../src/adUnits' {
  interface BidderParams {
    smilewanted: SmilewantedBidParams;
    smile: SmilewantedBidParams;
    sw: SmilewantedBidParams;
  }
}
