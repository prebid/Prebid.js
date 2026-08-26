/** Parameters accepted by the OpenX bidder adapter. Added by a Codex bot. */
export interface OpenxBidderParams {
  /** OpenX ad unit identifier. Required for video and native requests. */
  unit?: string;
  /** OpenX delivery domain. Required unless `platform` is provided. */
  delDomain?: string;
  /** OpenX platform hash. Required unless `delDomain` is provided. */
  platform?: string;
  customParams?: Record<string, string | string[]>;
  customFloor?: number;
  coppa?: boolean;
  test?: boolean;
  response_template_name?: string;
  /** Overrides corresponding fields from `mediaTypes.video`. */
  video?: Record<string, unknown>;
}

declare module '../src/adUnits' {
  interface BidderParams {
    openx: OpenxBidderParams;
  }
}
