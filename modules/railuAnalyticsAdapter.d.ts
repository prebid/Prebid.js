/** Options of the Railu analytics adapter. */
export interface RailuAnalyticsOptions {
  /** The seller's public Railu tag ID (console, Connect your supply); reports count as the seller's on its own domains. */
  tid: string;
  /** Share of page views to report, 0 to 1 (default 1; 0 reports none). Railu weighs each report by 1 / sample. */
  sample?: number;
  /** Override the report endpoint. */
  endpoint?: string;
}

declare module '../libraries/analyticsAdapter/AnalyticsAdapter' {
  interface AnalyticsProviderConfig {
    railu: {
      options: RailuAnalyticsOptions;
    };
  }
}
