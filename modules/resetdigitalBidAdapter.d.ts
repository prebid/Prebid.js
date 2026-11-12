import type { RequireAtLeastOne } from '../src/types/objects.d.ts';

/** Extra zone settings, sent as `zone_id`. */
export interface ResetdigitalZone {
  /** ID used for reporting. */
  placementId?: string;
  /** Comma separated deal IDs. */
  deals?: string;
  /** Set to `1` to force the bidder to respond with a creative. */
  test?: number;
}

/** Parameters accepted by the ResetDigital bidder adapter: `pubId` or `zoneId` is required. */
export type ResetdigitalBidParams = RequireAtLeastOne<{
  /** Publisher account ID provided by ResetDigital. */
  pubId?: string;
  /** Extra zone settings. */
  zoneId?: ResetdigitalZone;
  /** Publisher site ID. */
  siteID?: string;
  /** Placement ID, sent as `placement_id`. */
  placement?: string;
  /** Page position, e.g. `'atf'` or `'btf'`. */
  position?: string;
  /** Bid floor; used when the price floors module gives none. */
  bidFloor?: number;
  /** Currency of `bidFloor`. */
  bidFloorCur?: string;
  /** Visitor `[latitude, longitude]`. */
  latLong?: number[];
  /** Page key-values for targeting; values are arrays of strings. */
  inventory?: Record<string, string[]>;
  /** Visitor key-values for targeting; values are arrays of strings. */
  visitor?: Record<string, string[]>;
  /** Keywords, as a comma separated string or an array. */
  keywords?: string | string[];
  /** Ask for a test bid. */
  forceBid?: boolean;
  /** Endpoint URL to use instead of `//ads.resetsrv.com`; read from the first bid of the request. */
  endpoint?: string;
}, 'pubId' | 'zoneId'>;

declare module '../src/adUnits' {
  interface BidderParams {
    resetdigital: ResetdigitalBidParams;
  }
}
