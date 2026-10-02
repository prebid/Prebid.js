/**
 * OCM bidder-specific parameters, supplied on each ad unit's `bids[].params`. These are the adapter's
 * public interface; everything else (sizes, video/native config, consent, first-party data) is read
 * from standard ad-unit / ORTB2 fields by the ORTB converter rather than from params.
 */
export interface OcmBidParams {
  /**
   * OCM-issued publisher ID. Used as the Prebid Server `account` and set as `site`/`app`
   * `publisher.id` on the ORTB request. Required.
   */
  publisherId: string;
  /**
   * OCM placement ID; mapped to the PBS stored-request id (`imp.ext.prebid.storedrequest.id`).
   * Required.
   */
  placementId: string;
  /**
   * Optional overrides deep-merged into the OCM outstream video player config at render time (an
   * alternative to `mediaTypes.video.renderer.options`).
   */
  rendererConfig?: Record<string, unknown>;
}

declare module '../src/adUnits' {
  interface BidderParams {
    ocm: OcmBidParams;
  }
}
