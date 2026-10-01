export interface DeepintentUserParams {
  id?: string;
  buyeruid?: string;
  yob?: number;
  gender?: string;
  keywords?: string;
  customdata?: string;
}

export interface DeepintentBidderParams {
  /**
   * Placement identifier. Required.
   */
  tagId: string;
  /**
   * Bid floor when the price floors module is not active.
   */
  bidfloor?: number;
  /**
   * OpenRTB banner position. Fallback when mediaTypes.banner.pos is unset.
   */
  pos?: number;
  /**
   * Banner width override for mediaTypes.banner.sizes.
   */
  w?: number;
  /**
   * Banner height override for mediaTypes.banner.sizes.
   */
  h?: number;
  /**
   * Request-level user object merged onto ORTB user.
   */
  user?: DeepintentUserParams;
  /**
   * Legacy OpenRTB video fields. Prefer mediaTypes.video.
   */
  video?: Record<string, unknown>;
  /**
   * Custom key/value pairs sent on imp.ext.deepintent.
   */
  custom?: Record<string, unknown>;
  /**
   * PMP deal IDs (strings, each longer than 3 characters).
   */
  deals?: string[];
  /**
   * Deal custom targeting, pipe-delimited key/value string.
   */
  dctr?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    deepintent: DeepintentBidderParams;
  }
}
