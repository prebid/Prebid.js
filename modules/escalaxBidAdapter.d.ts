interface EscalaxCommonParams {
  /**
   * Bid floor, used only when the Price Floors module does not set one.
   * Its currency is `currency` (USD by default).
   */
  bidfloor?: number;
  /**
   * Request currency, used only when the Currency module is not enabled.
   * Defaults to `USD`.
   */
  currency?: string;
}

/** Exchange integration: `accountId` and `sourceId` together. */
export interface EscalaxExchangeParams extends EscalaxCommonParams {
  accountId: string;
  sourceId: string;
  supplyPlacementId?: never;
}

/** SSP integration: `supplyPlacementId` only. */
export interface EscalaxSspParams extends EscalaxCommonParams {
  supplyPlacementId: string;
  accountId?: never;
  sourceId?: never;
}

/** Parameters accepted by the Escalax bidder adapter: exactly one of the two integrations. */
export type EscalaxBidderParams = EscalaxExchangeParams | EscalaxSspParams;

declare module '../src/adUnits' {
  interface BidderParams {
    escalax: EscalaxBidderParams;
  }
}
