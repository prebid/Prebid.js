import type { Video } from 'iab-openrtb/v26';

/**
 * ORTB video fields, merged over `mediaTypes.video`.
 *
 * `playerSize` is accepted for convenience and is translated into `w`/`h`
 * before the request is sent; it is not part of the ORTB video object.
 */
export type TripleliftVideoParams = Partial<Video> & {
  playerSize?: [number, number] | [number, number][];
};

export interface TripleliftBidRequestParams {
  /**
   * Triplelift inventory code for the placement.
   */
  inventoryCode: string;
  /**
   * Identifies the parent account the inventory belongs to.
   * Required as of Prebid.js 11.37.0 - bids without it fail validation.
   */
  parentId: string;
  /**
   * Identifies the publisher the inventory belongs to. Recommended.
   */
  publisherId?: string;
  /**
   * Bid floor in USD. Used only when the Price Floors module does not supply one.
   */
  floor?: number;
  /**
   * ORTB video fields, merged over `mediaTypes.video`.
   */
  video?: TripleliftVideoParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    triplelift: TripleliftBidRequestParams;
  }
}
