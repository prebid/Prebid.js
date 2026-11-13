/** Parameters accepted by the AMX RTB bidder adapter. */
export interface AmxBidParams {
  /** Tag ID. */
  tagId?: string;
  /** Request every ad (100% fill); intended for testing. */
  testMode?: boolean | 0 | 1 | 'true';
  /** Ad unit ID used in reporting; defaults to the ad unit code. */
  adUnitId?: string;
  /** Static CPM floor in USD, used when the floors module is not installed. */
  floor?: number;
  /** Alternative bid endpoint URL. */
  endpoint?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    amx: AmxBidParams;
  }
}
