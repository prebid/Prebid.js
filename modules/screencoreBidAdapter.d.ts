/** Parameters accepted by the Screencore bidder adapter. */
export interface ScreencoreBidderParams {
  /**
   * Screencore SSP placement ID. Required unless one of the deprecated
   * `placementId` or `endpointId` params is set.
   */
  sspPlacementId?: string;
  /**
   * @deprecated Use `sspPlacementId`. Used as `sspPlacementId` when that is not set.
   */
  placementId?: string;
  /**
   * @deprecated Use `sspPlacementId`. Used as `sspPlacementId` when neither it
   * nor `placementId` is set.
   */
  endpointId?: string;
  /**
   * Bid floor, used only when the Price Floors module does not set one.
   * Its currency is `currency` (USD by default).
   */
  bidfloor?: number;
  /**
   * Request currency, used only when the Currency module is not enabled.
   * Defaults to `USD`.
   */
  currency?: string;
}

declare module "../src/adUnits" {
  interface BidderParams {
    screencore: ScreencoreBidderParams;
  }
}
