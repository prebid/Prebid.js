/** Instream video parameters; they take precedence over `mediaTypes.video`. */
export interface SmartadserverVideoParams {
  /** Maximum OpenRTB video protocol supported. */
  protocol?: number;
  /** 1 (pre-roll, default), 2 (mid-roll) or 3 (post-roll). */
  startDelay?: number;
}

/** Parameters accepted by the Smart AdServer (Equativ) bidder adapter. */
export interface SmartadserverBidParams {
  /** Placement site ID. */
  siteId: number | string;
  /** Placement page ID. */
  pageId: number | string;
  /** Placement format ID. */
  formatId: number | string;
  /** Network ID; read by Prebid Server only. */
  networkId?: number;
  /** Network domain, e.g. `'https://prg.smartadserver.com'` (the default). */
  domain?: string;
  /** Keyword targeting, e.g. `'sport=tennis'`. */
  target?: string;
  /** Bid floor; used instead of the price floors module. */
  bidfloor?: number;
  /** Mobile application name. */
  appName?: string;
  /** Mobile application bundle ID. */
  buId?: string;
  /** Unique Smart AdServer user ID. */
  ckId?: number;
  /** Instream video parameters. */
  video?: SmartadserverVideoParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    smartadserver: SmartadserverBidParams;
    smart: SmartadserverBidParams;
  }
}
