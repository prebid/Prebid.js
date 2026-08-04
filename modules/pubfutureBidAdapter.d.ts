/**
 * PubFuture bidder-specific parameters, supplied on each ad unit's `bids[].params`. These are the
 * adapter's public interface; everything else (sizes, video config, consent, first-party data) is
 * read from standard ad-unit / ORTB2 fields by the ORTB converter rather than from params.
 */
export interface PubfutureBidParamsBase {
  /** PubFuture publisher account id; mapped to `site.publisher.id`. */
  publisherId?: string;
  /** CPM floor, USD; mapped to `imp.bidfloor`/`imp.bidfloorcur` (used only when the priceFloors
   *  module hasn't already set a dynamic floor). */
  bidfloor?: number;
}

/** Real ad unit: `adUnitId` is required, `test` is absent or explicitly `false`. */
export interface PubfutureLiveBidParams extends PubfutureBidParamsBase {
  /** PubFuture ad unit / placement id; mapped to `imp.tagid`. */
  adUnitId: string;
  test?: false;
}

/** Test/demo ad: `test: true` swaps in the well-known test ad unit — `adUnitId` is ignored/omitted. */
export interface PubfutureTestBidParams extends PubfutureBidParamsBase {
  test: true;
  adUnitId?: never;
}

export type PubfutureBidParams = PubfutureLiveBidParams | PubfutureTestBidParams;

declare module '../src/adUnits' {
  interface BidderParams {
    pubfuture: PubfutureBidParams;
  }
}
