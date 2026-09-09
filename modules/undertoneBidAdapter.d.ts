export interface UndertoneVideoParams {
  /** OpenRTB playback method (1–4). */
  playbackMethod?: number;
  /** Maximum video ad duration in seconds. */
  maxDuration?: number;
  /** Whether the inventory must be skippable. */
  skippable?: boolean;
}

/** Parameters accepted by the Undertone bidder adapter; typed by the codex bot. */
export interface UndertoneBidderParams {
  placementId?: number | string;
  publisherId: number | string;
  video?: UndertoneVideoParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    undertone: UndertoneBidderParams;
  }
}
