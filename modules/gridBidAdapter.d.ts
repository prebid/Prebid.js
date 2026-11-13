import type { ORTBImp, ORTBRequest } from '../src/types/ortb/request.d.ts';
import type { Size } from '../src/types/common.d.ts';
import type { RequireAtLeastOne } from '../src/types/objects.d.ts';

type ORTBVideo = NonNullable<ORTBImp['video']>;

/** Video settings; merged over `mediaTypes.video` and sent as `imp.video`. */
export type GridVideoParams = Partial<ORTBVideo> & {
  /** Minimum duration in seconds (overrides `minduration`). */
  mind?: number;
  /** Maximum duration in seconds (overrides `maxduration`). */
  maxd?: number;
  /** Player size as a `'WIDTHxHEIGHT'` string, e.g. `'640x480'`. */
  size?: string;
  /**
   * Player size, overriding `mediaTypes.video.playerSize`; `[width, height]` or a list of them (the first is used).
   * Sets `w`/`h` when they aren't given.
   */
  playerSize?: Size | Size[];
  /** `[minduration, maxduration]` in seconds. */
  durationRangeSec?: number[];
};

/** A keywords entry: `name` plus lists of keyword strings or `{name, value}` segments. */
export type GridKeywordsPublisher = {
  name: string;
  segments?: Array<string | { name: string; value: string }>;
} & Record<string, unknown>;

/** Page-level keywords sent in `ext.keywords`. */
export interface GridKeywords {
  site?: Record<string, GridKeywordsPublisher[]>;
  user?: Record<string, GridKeywordsPublisher[]>;
  [section: string]: unknown;
}

interface GridBidParamsBase {
  /** Publisher ID, sent as `site.publisher.id` (multi-request mode only). */
  pubid?: number | string;
  /** Value of the `sp` query parameter for this request (multi-request mode only). */
  source?: string;
  /** Keywords sent in `ext.keywords` and `imp.ext.bidder.keywords`. */
  keywords?: GridKeywords;
  /** Bidder code (one of the Grid aliases) whose endpoint should be used for the whole request. */
  forceBidder?: string;
  /** Send this ad unit in its own request. */
  multiRequest?: boolean;
  /** OpenRTB `site.content` object (multi-request mode only). */
  content?: NonNullable<ORTBRequest['site']>['content'];
  /** Video settings. */
  video?: GridVideoParams;
  /** Bid floor in USD; used when the price floors module gives none. */
  bidFloor?: number | string;
  /** @deprecated Use `bidFloor`. */
  floorcpm?: number | string;
}

/** Parameters accepted by the Grid bidder adapter: `uid` or `secid` is required. */
export type GridBidParams = RequireAtLeastOne<GridBidParamsBase & {
  /** Grid ad slot ID. */
  uid?: number | string;
  /** Section ID; takes precedence over `uid` as `imp.tagid`. */
  secid?: number | string;
}, 'uid' | 'secid'>;

declare module '../src/adUnits' {
  interface BidderParams {
    grid: GridBidParams;
    playwire: GridBidParams;
    adlivetech: GridBidParams;
    gridNM: GridBidParams;
  }
}
