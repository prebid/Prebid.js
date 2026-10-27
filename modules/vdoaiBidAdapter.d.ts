export interface VdoaiBidRequestParams {
  /**
   * Ad network's RTB host.
   */
  host: string;
  /**
   * Ad unit ID generated on the VDO.AI platform.
   */
  adUnitId: string | number;
  /**
   * Type of ad unit.
   */
  adUnitType: 'banner' | 'video';
  /**
   * Publisher ID generated on the VDO.AI platform.
   */
  publisherId?: string;
  /**
   * Minimum bid floor price in USD.
   */
  bidfloor?: number;
  /**
   * Custom targeting field 1.
   */
  custom1?: string;
  /**
   * Custom targeting field 2.
   */
  custom2?: string;
  /**
   * Custom targeting field 3.
   */
  custom3?: string;
  /**
   * Custom targeting field 4.
   */
  custom4?: string;
  /**
   * Custom targeting field 5.
   */
  custom5?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    vdoai: VdoaiBidRequestParams;
  }
}
