/** Parameters accepted by the InMobi bidder adapter. All params are also sent in `imp.ext.params`. */
export interface InmobiBidParams {
  /** InMobi placement ID, sent as `imp.ext.bidder.plc`. */
  plc: string;
  /** Bid floor in USD; used when the price floors module gives none. */
  bidfloor?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    inmobi: InmobiBidParams;
  }
}
