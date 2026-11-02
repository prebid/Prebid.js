/** Type declarations added by the Codex agent as a follow-up to Prebid.js #15428. */
export interface YieldmoVideoParams {
  mimes?: string[];
  startdelay?: number;
  placement?: number;
  plcmt?: number;
  skipafter?: number;
  protocols?: number[];
  api?: number[];
  playbackmethod?: number[];
  maxduration?: number;
  minduration?: number;
  pos?: number;
  skip?: number;
  skippable?: boolean;
}

export interface YieldmoSiteParams {
  name?: string;
  domain?: string;
  cat?: string[];
  keywords?: string;
}

/** Parameters accepted by the Yieldmo bidder adapter. */
export interface YieldmoBidderParams {
  /** Required for video bids. */
  placementId?: string;
  bidFloor?: number;
  bidfloor?: number;
  /** LiveRamp ATS envelope. */
  lr_env?: string;
  /** Blocked IAB content categories. */
  bcat?: string[];
  /** Blocked advertiser domains (video only). */
  badv?: string[];
  video?: YieldmoVideoParams;
  site?: YieldmoSiteParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    yieldmo: YieldmoBidderParams;
  }
}
