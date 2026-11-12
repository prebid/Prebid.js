/** Parameters accepted by the Taboola bidder adapter. */
export interface TaboolaBidParams {
  /** Tag ID / placement name, sent as `imp.tagid`. */
  tagId: string;
  /** Publisher ID as provided by Taboola; sent in the request URL and as `site.publisher.id`. */
  publisherId: string;
  /** Kind of content on the page, sent as `ext.pageType` unless first party data provides one. */
  pageType?: string;
  /** Placement position on screen (OpenRTB ad position, 0-7), sent as `imp.banner.pos`. */
  position?: number;
  /** Bid floor, used when the price floors module is not installed. */
  bidfloor?: number;
  /** Bid floor currency; defaults to `'USD'`. */
  bidfloorcur?: string;
  /** Blocked advertiser categories (IAB); used when `ortb2.bcat` is not set. */
  bcat?: string[];
  /** Blocked advertiser domains; used when `ortb2.badv` is not set. */
  badv?: string[];
  /** Allowed creative languages (ISO-639-1-alpha-2); used when `ortb2.wlang` is not set. */
  wlang?: string[];
}

declare module '../src/adUnits' {
  interface BidderParams {
    taboola: TaboolaBidParams;
  }
}
