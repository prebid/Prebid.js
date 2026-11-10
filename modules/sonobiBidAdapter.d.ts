import type { Size } from '../src/types/common.d.ts';

/** Parameters shared by both Sonobi slot identifiers. */
export interface SonobiCommonParams {
  /** Ad unit sizes; required for banner when `mediaTypes.banner.sizes` is not set. */
  sizes?: Size | Size[];
  /** Bid floor in USD, used when the price floors module is not installed. */
  floor?: number;
  /** Publisher unique identifier. */
  hfa?: string;
  /** Overrides the `ref` sent in the request. */
  referrer?: string;
  /** Keywords about the site, as a comma separated string or an array. */
  keywords?: string | string[];
  /** Overrides the bid request URL. */
  bid_request_url?: string;
}

/** Slot identified by GAM ad unit path; takes precedence over `placement_id`. */
export interface SonobiAdUnitParams extends SonobiCommonParams {
  /** GAM ad unit path, e.g. `'/1234567/example/adUnit/code'`. */
  ad_unit: string;
  placement_id?: string;
}

/** Slot identified by Sonobi placement ID. */
export interface SonobiPlacementParams extends SonobiCommonParams {
  /** 20-character hex Sonobi placement ID. */
  placement_id: string;
  ad_unit?: string;
}

/** Parameters accepted by the Sonobi bidder adapter: `ad_unit` or `placement_id` is required. */
export type SonobiBidParams = SonobiAdUnitParams | SonobiPlacementParams;

declare module '../src/adUnits' {
  interface BidderParams {
    sonobi: SonobiBidParams;
  }
}
