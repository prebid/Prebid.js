export interface SrchbidBidderParams {
  /** Zone ID assigned by Srchbid. */
  zone: string | number;
  /** Set false to disable optional win/render diagnostics. Auctions still run. Default true. */
  lifecycleSignals?: boolean;
}

declare module '../src/adUnits' {
  interface BidderParams {
    srchbid: SrchbidBidderParams;
  }
}
