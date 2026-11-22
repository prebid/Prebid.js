import type { Ext } from "../src/types/ortb/common";

export interface HyperbrainzBidderParams {
  /**
   * Unique placement identifier, sent as `imp.tagid`. Required.
   */
  placementId: string;
  /**
   * Publisher identifier, sent as `site.publisher.id`. Taken from the first bid of the request.
   */
  publisherId?: string;
  /**
   * Hard floor in USD. Takes precedence over the priceFloors module.
   */
  bidFloor?: number;
  /**
   * User ID to send as `user.id`. Used instead of the local storage value.
   */
  userId?: string;
  /**
   * Custom bidder extension fields, passed through as `imp.ext`.
   */
  ext?: Ext;
}

declare module "../src/adUnits" {
  interface BidderParams {
    hyperbrainz: HyperbrainzBidderParams;
  }
}
