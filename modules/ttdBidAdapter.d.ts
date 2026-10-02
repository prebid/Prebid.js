export interface TtdBidderParams {
  /**
   * Supply source id assigned by The Trade Desk. Only alphanumeric and underscore characters are allowed.
   * It is appended to the bidder endpoint path.
   */
  supplySourceId: string;
  /**
   * Publisher id assigned by The Trade Desk. Up to 64 characters.
   */
  publisherId: string;
  /**
   * Placement id, sent as `imp.tagid`. Required unless the ad unit has a GPID (`ortb2Imp.ext.gpid`),
   * which takes precedence when both are present.
   */
  placementId?: string;
  /**
   * Bid floor in USD. Takes precedence over the floor from the Floor module.
   */
  bidfloor?: number | string;
  banner?: {
    /**
     * Directions in which the banner may expand, sent as `imp.banner.expdir` (OpenRTB expandable direction values).
     */
    expdir?: number[];
  };
  /**
   * Overrides the default bidder endpoint (https://direct.adsrvr.org/bid/bidder/).
   * Must start with `https://` and end with `/bid/bidder/`.
   */
  customBidderEndpoint?: string;
  /**
   * Set to `false` to disable the failover. By default, a request that fails quickly with a network error
   * (for example a DNS resolution failure) is retried once on the failover domain.
   * Timeouts and HTTP error responses are never retried.
   * @default true
   */
  failoverEnabled?: boolean;
  /**
   * Hostname (no scheme, port or path) to retry on when the failover is triggered.
   * An invalid value is ignored. Only the host of the request url is replaced.
   * @default 'bid-openpath.ttdcdn.org'
   */
  failoverDomain?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    ttd: TtdBidderParams;
    thetradedesk: TtdBidderParams;
  }
}
