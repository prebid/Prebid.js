/**
 * Currencies accepted by the Geniee Exchange.
 */
export type ExGenieeCurrency = 'JPY' | 'USD';

/**
 * Bid params for the Geniee Exchange bid adapter (`ex_geniee`).
 */
export interface ExGenieeBidderParams {
  /**
   * The single per-publisher ID issued by Geniee during integration. Must be
   * an integer >= 1 (number only; string forms such as `'123'` are rejected).
   * Sent as the `id` query parameter (`/exchange?id=YOUR_ID`) and used by the
   * Exchange to authorize the request.
   */
  partnerId: number;
  /**
   * ISO-4217 currency code, `JPY` or `USD`. When omitted, the currency
   * module's `adServerCurrency` is used (`USD` if unset); if that
   * `adServerCurrency` is neither `JPY` nor `USD`, no request is sent.
   */
  currency?: ExGenieeCurrency;
  /**
   * Reporting label for the ad unit, defined by the supply partner (not issued
   * by Geniee). Use a fixed value per ad unit; if omitted, Geniee reports
   * cannot be broken down by ad unit. Alphanumeric, hyphen and underscore, max
   * 40 characters, case-insensitive (`Sidebar` = `sidebar`). Sent as the
   * `placement` query parameter (`/exchange?id=YOUR_ID&placement=YOUR_PLACEMENT`)
   * and validated by the Exchange, not by the adapter.
   */
  placementId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    ex_geniee: ExGenieeBidderParams;
  }
}
