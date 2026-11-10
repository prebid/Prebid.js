/** Site details that override what Prebid detects; meant for testing. */
export interface MedianetSiteParams {
  /** Page domain. */
  domain?: string;
  /** Page URL. */
  page?: string;
  /** Referrer URL. */
  ref?: string;
  /** Whether the page is the top window. */
  isTop?: boolean;
}

/** Parameters accepted by the Media.net bidder adapter. */
export interface MedianetBidParams {
  /** Customer ID provided by Media.net. */
  cid: string;
  /** Placement ID provided by Media.net; defaults to the ad unit code. */
  crid?: string | number;
  /** Bid floor for the impression. */
  bidfloor?: number | string;
  /** Alias of `bidfloor`. */
  bidFloor?: number | string;
  /** Video targeting parameters, merged under `mediaTypes.video`. */
  video?: Record<string, unknown>;
  /** Site details; only read from the first bid of a request. */
  site?: MedianetSiteParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    medianet: MedianetBidParams;
    trustedstack: MedianetBidParams;
  }
}
