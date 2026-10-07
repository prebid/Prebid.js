/**
 * Zeta Global SSP Bid Adapter — type definitions.
 *
 * Describes the bidder parameters accepted by the zeta_global_ssp adapter,
 * so that publisher TypeScript code gets proper inference on `params`
 * and Prebid.js core can validate them statically.
 */

/** Bidder params accepted from publisher ad unit configs. */
export interface ZetaGlobalSspBidderParams {
  /** Zeta site/account identifier. Required. */
  sid: string;
  /** Optional ad slot tag ID, forwarded as `imp.tagid`. */
  tagid?: string;
  /** Optional Zeta-specific key/value tags, forwarded as `request.ext.tags`. */
  tags?: Record<string, unknown>;
  /** Test mode flag, forwarded as `request.test`. */
  test?: boolean | number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    zeta_global_ssp: ZetaGlobalSspBidderParams;
  }
}
