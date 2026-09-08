/** This public type declaration was added by a Codex bot. */
export interface KargoSocialCanvasParams {
  segments?: string[];
  url?: string;
}

/** Parameters accepted by the Kargo bidder adapter. */
export interface KargoBidderParams {
  placementId: string;
  socialCanvas?: KargoSocialCanvasParams | null;
}

declare module '../src/adUnits' {
  interface BidderParams {
    kargo: KargoBidderParams;
  }
}
