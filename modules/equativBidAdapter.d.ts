export interface EquativBidderParams {
  /**
   * Equativ network id.
   * Mandatory unless `ortb2.(site|app|dooh).publisher.id` is set.
   */
  networkId?: number;
  /**
   * Placement identifier used to source inventory.
   * Preferred way to identify inventory. When provided, it takes precedence
   * over the deprecated `siteId`, `pageId` and `formatId` parameters.
   */
  placementuuid?: string;
  /**
   * Equativ site id.
   * @deprecated Use `placementuuid` instead. Kept only to support the
   * inventory-structure ramp-up and will be removed in a future release.
   */
  siteId?: number;
  /**
   * Equativ page id.
   * @deprecated Use `placementuuid` instead. Kept only to support the
   * inventory-structure ramp-up and will be removed in a future release.
   */
  pageId?: number;
  /**
   * Equativ format id.
   * @deprecated Use `placementuuid` instead. Kept only to support the
   * inventory-structure ramp-up and will be removed in a future release.
   */
  formatId?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    equativ: EquativBidderParams;
  }
}
