export interface UnrulyFeatureOverrides {
  canRunUnmissable?: boolean;
  [key: string]: unknown;
}

/** Parameters accepted by the Unruly bidder adapter. */
export interface UnrulyBidderParams {
  siteId: number;
  featureOverrides?: UnrulyFeatureOverrides;
  floor?: number;
  endpoint?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    unruly: UnrulyBidderParams;
  }
}
