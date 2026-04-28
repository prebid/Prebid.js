interface YandexBaseParams {
  /**
   * Bid currency. Defaults to `EUR`.
   */
  cur?: string;
  /**
   * Target reference URL.
   */
  targetRef?: string;
  /**
   * Whether to send credentials with requests. Defaults to `true`.
   */
  withCredentials?: boolean;
  /**
   * Custom container element ID for the ad unit.
   */
  pubcontainerid?: string;
}

interface YandexPlacementIdParams extends YandexBaseParams {
  /**
   * Placement ID.
   * Possible formats: `R-I-123456-2`, `R-123456-1`, `123456-789`.
   */
  placementId: string;
  pageId?: never;
  impId?: never;
}

interface YandexLegacyParams extends YandexBaseParams {
  placementId?: never;
  /**
   * @deprecated Please use `placementId` instead.
   */
  pageId: number;
  /**
   * @deprecated Please use `placementId` instead.
   */
  impId: number;
}

export type YandexBidRequestParams = YandexPlacementIdParams | YandexLegacyParams;

declare module '../src/adUnits' {
  interface BidderParams {
    yandex: YandexBidRequestParams;
  }
}
