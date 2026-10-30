export interface HolidBidderParams {
  /** Holid stored request and stored impression ID. */
  adUnitID: string | number;
  /** Legacy floor fallback when the floors module/ortb2Imp does not supply one. */
  floor?: number;
  /** Currency of the legacy floor; defaults to USD. */
  floorCurrency?: string;
  /** Optional server timeout cap in milliseconds, never above the publisher timeout. */
  tmax?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    holid: HolidBidderParams;
  }
}
