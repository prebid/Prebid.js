export interface BiddigiBidRequestParams {
  /**
   * BidDigi placement identifier for this ad unit, assigned by BidDigi's config-backend when
   * the publisher's site/app is onboarded.
   */
  placementId: string | number;
  /**
   * BidDigi publisher identifier, assigned by BidDigi's config-backend at onboarding.
   */
  publisherId: string | number;
  /**
   * Publisher-declared price floor for this impression. Forwarded as `imp.bidfloor` only when
   * the ORTB converter didn't already set one (e.g. from `getFloor()`/floors module).
   */
  bidfloor?: number;
  /**
   * Currency of `bidfloor`. Defaults to BidDigi's own settlement currency (INR) when omitted.
   */
  bidfloorcur?: string;
  /**
   * Which of BidDigi's auction-service regions to send this request to. Falls back to `'in'`
   * when omitted or unrecognized.
   */
  region?: 'in' | 'us';
}

declare module '../src/adUnits' {
  interface BidderParams {
    biddigi: BiddigiBidRequestParams;
  }
}
