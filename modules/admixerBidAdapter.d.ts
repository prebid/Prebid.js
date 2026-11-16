/**
 * Params for the RTB-stack aliases of the Admixer adapter. Their endpoint is not fixed: the
 * publisher sets it with `setBidderConfig({ bidders: [...], config: { bidderURL } })`.
 */
export interface AdmixerRtbBidderParams {
  /**
   * Placement (tag) ID on the RTB stack.
   */
  tagId: string | number;
  /**
   * Static CPM floor in USD, used only when the Prebid floors module is not loaded.
   */
  bidFloor?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    aditgen: AdmixerRtbBidderParams;
  }
}
