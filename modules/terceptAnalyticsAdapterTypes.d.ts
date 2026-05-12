export interface TerceptAnalyticsAdapterOptions {
  /**
   * Publisher ID assigned by Tercept.
   */
  pubId: number;

  /**
   * Publisher key assigned by Tercept.
   */
  pubKey: number;

  /**
   * Hostname of the Tercept analytics endpoint.
   */
  hostName?: string;

  /**
   * Path of the Tercept analytics endpoint.
   */
  pathName?: string;

  /**
   * Milliseconds to wait after `AUCTION_END` before flushing the batched
   * event payload.
   */
  analyticsBatchTimeout?: number;
}
