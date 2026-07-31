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
   * User ID to send as `user.id`. Used as a fallback when no ID is found
   * in local storage.
   */
  userId?: string;
  /**
   * Custom bidder extension fields, passed through as `imp.ext`.
   */
  ext?: Ext;
  /**
   * Per-placement bid endpoint override. Bids with different endpoint
   * values are sent as separate requests. Defaults to
   * `config.hyperbrainz.endpoint`, then the production endpoint.
   */
  endpoint?: string;
}

export interface HyperbrainzConfig {
  /**
   * Overrides the bid endpoint URL for all hyperbrainz bids, e.g. to target a QA or
   * staging environment. Individual bids can override this with `params.endpoint`.
   */
  endpoint?: string;
}

declare module "../src/adUnits" {
  interface BidderParams {
    hyperbrainz: HyperbrainzBidderParams;
  }
}

declare module "../src/config" {
  interface Config {
    hyperbrainz?: HyperbrainzConfig;
  }
}
