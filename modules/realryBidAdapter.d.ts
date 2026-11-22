export interface RealryBidderParams {
  /**
   * Publisher-side identifier for the slot. Forwarded to Realry as
   * `imp.tagid` so realry-side reporting can dice traffic per publisher
   * placement. Required.
   */
  placementId: string;
  /**
   * Realry-side advertiser id, only when explicitly assigned by the
   * Realry partnerships team. Forwarded inline so the matcher can
   * pre-filter candidates. Optional.
   */
  sellerId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    realry: RealryBidderParams;
  }
}
