export interface VuukleBidderParams {
  /**
   * Your Vuukle seller ID, as listed in https://vuukle.com/sellers.json. Required.
   */
  sid: string;
  /**
   * Optional named placement / tag ID. Falls back to the ad unit code when omitted.
   */
  placementId?: string;
  /**
   * Optional static hard floor in USD. The priceFloors module is preferred when configured.
   */
  bidfloor?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    vuukle: VuukleBidderParams;
  }
}
