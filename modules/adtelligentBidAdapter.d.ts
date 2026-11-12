/** Parameters accepted by the Adtelligent bidder adapter. */
export interface AdtelligentBidParams {
  /** Source ID from Adtelligent, sent as `Aid`. */
  aid: number;
  /** When truthy, asks for an iframe creative (`AdmType: 'iframe'`). */
  iframe?: boolean;
  /** Placement ID sent instead of the ad unit code. */
  vpb_placement_id?: number | string;
  /** Configuration passed to the outstream renderer (`VOutstreamAPI`). */
  outstream?: Record<string, unknown>;
}

declare module '../src/adUnits' {
  interface BidderParams {
    adtelligent: AdtelligentBidParams;
    indicue: AdtelligentBidParams;
  }
}
