export interface YandexBidRequestParams {
  /**
   * Placement ID.
   * Possible formats: `R-I-123456-2`, `R-123456-1`, `123456-789`.
   */
  placementId: string;
  /**
   * Bid currency. Defaults to `EUR`.
   */
  cur?: string;
  /**
   * Deprecated. Please use `placementId` instead.
   */
  pageId?: number;
  /**
   * Deprecated. Please use `placementId` instead.
   */
  impId?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    yandex: YandexBidRequestParams;
  }
}
