export interface CaminoBidderParams {
  /**
   * Camino publisher identifier, issued by Camino. Sent as `site.publisher.id`.
   */
  publisherId: string;
  /**
   * Camino placement identifier.
   */
  placementId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    camino: CaminoBidderParams;
  }
}
