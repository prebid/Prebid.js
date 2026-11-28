/** Parameters accepted by the Improve Digital bidder adapter. */
export interface ImprovedigitalBidParams {
  /** Improve Digital placement ID. */
  placementId: number;
  /** Improve Digital publisher ID; must be the same for all placements in single request mode. */
  publisherId: number;
  /** Key-value targeting, e.g. `{ testKey: ['testValue'] }`. */
  keyValues?: Record<string, string[]>;
  /** Bid floor, used when the price floors module provides none. */
  bidFloor?: number;
  /** Currency of `bidFloor` (default USD). */
  bidFloorCur?: string;
  /** Send this placement to the Extend (Prebid Server) endpoint; overrides `improvedigital.extend` config. */
  extend?: boolean;
  /** ORTB video fields merged over `mediaTypes.video`. */
  video?: Record<string, unknown>;
}

declare module '../src/adUnits' {
  interface BidderParams {
    improvedigital: ImprovedigitalBidParams;
    id: ImprovedigitalBidParams;
  }
}
