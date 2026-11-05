export interface PanxoBidderParams {
  /** Property identifier supplied by Panxo. */
  propertyKey: string;
  /**
   * Legacy nonnegative CPM fallback in USD, as published since Prebid.js 10.23.
   * Used only when the publisher has not supplied standard floor control.
   * @deprecated Use Price Floors rules/defaults or a static OpenRTB floor.
   */
  floor?: number;
}

declare module '../src/adUnits' {
  interface BidderParams {
    panxo: PanxoBidderParams;
  }
}
