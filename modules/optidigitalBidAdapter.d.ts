/**
 * Parameters accepted by the Optidigital bidder adapter.
 * `publisherId`, `pageTemplate`, `badv`, `bcat` and `bapp` are read from the first bid of the request only.
 */
export interface OptidigitalBidParams {
  /** Unique ID of the publisher. */
  publisherId: string;
  /** Identifier of the ad placement or ad tag, e.g. `'Billboard_Top'`. */
  placementId: string;
  /** ID of the element containing the ad slot; its dimensions are sent with the request. */
  divId?: string;
  /** Page template name of the current page, e.g. `'home'`. */
  pageTemplate?: string;
  /** Blocked advertiser domains; `ortb2.badv` takes precedence. */
  badv?: string[];
  /** Blocked advertiser categories; `ortb2.bcat` takes precedence. */
  bcat?: string[];
  /** Blocked mobile app bundles. */
  bapp?: string[];
  /** Blocked creative attributes (OpenRTB `battr` values); `ortb2.battr` takes precedence. */
  battr?: number[];
  /** Currency used when asking the price floors module for a floor; defaults to `'USD'`. */
  currency?: string;
  /** Bid floor; used when the price floors module gives none. */
  floor?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    optidigital: OptidigitalBidParams;
  }
}
