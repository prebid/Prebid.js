export interface AxonixBidderParams {
  /**
   * Unique supply ID provided by Axonix
   */
  supplyId: string;
  /**
   * Regional endpoint prefix (defaults to us-east-1)
   */
  region?: string;
  /**
   * Overrides the default endpoint URL
   */
  endpoint?: string;
  /**
   * Referrer URL to be sent with the bid request
   */
  referrer?: string;
}
declare module '../src/adUnits' {
  interface BidderParams {
    axonix: AxonixBidderParams;
  }
}
