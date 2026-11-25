export interface InmobiVantageBidderParams {
  /**
   * InMobi Vantage placement ID; sent as the stored impression id (imp.ext.prebid.storedrequest.id) and imp.tagid.
   */
  tagID: string;
  /**
   * InMobi Vantage site ID; sent as the request-level stored request id (ext.prebid.storedrequest.id).
   */
  siteID: string;
  /**
   * Bid floor in USD, used only when the price floors module sets none.
   */
  bidfloor?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    inmobiVantage: InmobiVantageBidderParams;
  }
}
