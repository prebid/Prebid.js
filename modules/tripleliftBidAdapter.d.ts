import type { VideoMediaType } from '../src/video.ts';

/** Parameters accepted by the TripleLift bidder adapter. */
export interface TripleliftBidderParams {
  /** TripleLift inventory code for the placement. */
  inventoryCode: string;
  /** Bid floor in USD. */
  floor?: number;
  /** Video parameters that override the ad unit's video media type. */
  video?: VideoMediaType;
}

declare module '../src/adUnits' {
  interface BidderParams {
    triplelift: TripleliftBidderParams;
  }
}
