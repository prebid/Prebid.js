export interface FerioBidParams {
  /**
   * Publisher ID on the Ferio platform.
   */
  publisherId: string;
  /**
   * Ad unit ID on the Ferio platform.
   */
  adUnitId: string;
  /**
   * Tenant ID on the Ferio platform.
   */
  tenantId: string;
}

declare module "../src/adUnits" {
  interface BidderParams {
    ferio: FerioBidParams;
  }
}
