/**
 * superEdge Bid Adapter — type definitions.
 *
 * Describes the bidder parameters accepted by the superEdge adapter,
 * so that publisher TypeScript code gets proper inference on `params`
 * and Prebid.js core can validate them statically.
 */

/** Bidder params accepted from publisher ad unit configs. */
export interface SuperEdgeBidParams {
  /** Secret key identifying the publisher account (required). */
  sk: string;
  /** Optional publisher identifier. */
  publisher?: string;
  /** Server region: US, EU, or APAC (defaults to US). */
  region?: string;
  /** Test mode: truthy values are sent as 1. */
  test?: boolean | number;
  /** Legacy placement ID (fallback for GPID). */
  placementId?: string;
  /** Ad slot tag ID. */
  tagid?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    superedge: SuperEdgeBidParams;
  }
}
