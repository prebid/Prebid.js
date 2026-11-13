/**
 * Parameters accepted by the Invibes bidder adapter.
 * `domainId`, `customEndpoint` and `customUserSync` apply to the whole request: the first bid that sets one wins.
 */
export interface InvibesBidParams {
  /** Invibes placement ID, e.g. `'1234567'`; an `_ivbs<N>` suffix selects the bid endpoint. */
  placementId: string;
  /** Domain ID (e.g. `1001`), used to pick the bid endpoint when `customEndpoint` is not set. */
  domainId?: number;
  /** Overrides the bid endpoint URL, e.g. for testing. */
  customEndpoint?: string;
  /** Overrides the user sync URL. */
  customUserSync?: string;
  /** Set to `false` to allow the iframe user sync, which is disabled by default. The last bid's value is used. */
  disableUserSyncs?: boolean;
}

declare module '../src/adUnits' {
  interface BidderParams {
    invibes: InvibesBidParams;
  }
}
