export interface YieldlabBidderParams {
  /**
   * Yieldlab adslot id. Sent as `imp.tagid`, always as a string.
   */
  adslotId: string | number;
  /**
   * Yieldlab supply id.
   */
  supplyId: string | number;
  /**
   * Key/values the adserver matches campaigns against. Merged across all
   * ad units in the request - later ad units win on a shared key - and sent as
   * `ext.vm.targeting` in the form `k1=v1&k2=v2`.
   */
  targeting?: Record<string, string | number>;
  /**
   * External id used in reporting. The first one found across the request's
   * ad units is sent as `ext.vm.externalid`.
   */
  extId?: string;
  /**
   * Content the ad unit appears next to. The first one found across the
   * request's ad units is copied into `site.content` (or `app.content`).
   */
  iabContent?: YieldlabIabContent;
}

/**
 * IAB content fields, copied into the request's `content` over any first-party
 * content. Values must have the types OpenRTB 2.6 gives them: Yieldlab rejects
 * a request whose content does not. Null values are skipped, `live` is sent as
 * `livestream` unless `livestream` is set too, and a `keywords` array is joined
 * with commas. Prefer setting `ortb2.site.content` (or `ortb2.app.content`).
 */
export interface YieldlabIabContent {
  id?: string;
  episode?: number;
  title?: string;
  series?: string;
  season?: string;
  artist?: string;
  genre?: string;
  isrc?: string;
  url?: string;
  cat?: string[];
  context?: number;
  /** Comma-separated, as in OpenRTB. An array is joined with commas. */
  keywords?: string | string[];
  /** Alias of `livestream`. */
  live?: 0 | 1;
  livestream?: 0 | 1;
  /** Any other OpenRTB content field, passed through unchanged. */
  [field: string]: unknown;
}

declare module '../src/adUnits' {
  interface BidderParams {
    yieldlab: YieldlabBidderParams;
  }
}
