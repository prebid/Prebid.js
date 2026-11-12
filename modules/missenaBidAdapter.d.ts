/** Parameters accepted by the Missena bidder adapter. All params are sent to the Missena server as given. */
export interface MissenaBidParams {
  /** Missena publisher token, e.g. `'PA-34745704'`. */
  apiKey: string;
  /** Placement type: `'sticky'` (default), `'header'`, `'footer'`, `'prestitial'` or `'postitial'`. */
  placement?: string;
  /** Extra settings for the Missena adapter. */
  settings?: Record<string, unknown>;
  /** Overrides the bid endpoint; when set, win notifications go to the staging events domain. For testing. */
  baseUrl?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    missena: MissenaBidParams;
    msna: MissenaBidParams;
  }
}
