/** Parameters accepted by the StackAdapt bidder adapter. */
export interface StackadaptBidParams {
  /** StackAdapt publisher ID, sent as `site.publisher.id`. */
  publisherId: string;
  /** StackAdapt placement ID, sent as `imp.tagid`. */
  placementId?: string;
  /** Banner settings. */
  banner?: {
    /** Directions the banner may expand (OpenRTB `banner.expdir`). */
    expdir?: number[];
  };
  /** Bid floor in USD (parsed with `parseFloat`); takes precedence over the price floors module. */
  bidfloor?: number | string;
  /** Sent as the OpenRTB `test` flag (`1` for test requests). Read from the first bid of the request. */
  testMode?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    stackadapt: StackadaptBidParams;
  }
}
