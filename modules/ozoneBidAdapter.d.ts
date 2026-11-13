export interface OzoneCustomData {
  settings?: Record<string, unknown>;
  targeting: Record<string, unknown>;
}

export interface OzoneVideoParams {
  skippable?: boolean;
  playback_method?: string[];
  targetDiv?: string;
  [key: string]: unknown;
}

/** Parameters accepted by the Ozone bidder adapter. Added by the Codex bot. */
export interface OzoneBidderParams {
  publisherId: number | string;
  siteId: number | string;
  placementId: number | string;
  customData?: OzoneCustomData[];
  ozFloor?: number | string;
  video?: OzoneVideoParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    ozone: OzoneBidderParams;
  }
}
