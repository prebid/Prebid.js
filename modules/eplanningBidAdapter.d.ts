import type { RequireAtLeastOne } from '../src/types/objects.d.ts';

/** Parameters accepted by the E-Planning bidder adapter: `ci` or `t` is required. */
export type EplanningBidParams = RequireAtLeastOne<{
  /** Partner ID provided by E-Planning, e.g. `'18f66'`. */
  ci?: string;
  /** Test mode: when truthy on any bid, the request goes to the test endpoint and `ci` is not needed. */
  t?: number | boolean;
  /** Bidder host to use instead of the default `pbjs.e-planning.net`. */
  sv?: string;
  /** CDN host used in test mode instead of the default `i.e-planning.net`. */
  isv?: string;
  /** When truthy, ad unit codes are used as space names instead of sizes. */
  ml?: number | boolean;
  /** Space name to use instead of the size-based name. */
  sn?: string;
}, 'ci' | 't'>;

declare module '../src/adUnits' {
  interface BidderParams {
    eplanning: EplanningBidParams;
  }
}
