export interface ApsAdapterConfig {
  /**
   * APS-provided account ID used for APS bidding and telemetry state isolation.
   */
  accountID: string | number;
  /**
   * Toggle APS debug mode in bid request URL construction.
   */
  debug?: boolean;
  /**
   * Optional override of the APS bid endpoint.
   */
  debugURL?: string;
  /**
   * Optional render mode used by APS debug signaling.
   */
  renderMethod?: 'fif' | string;
  /**
   * Optional script URL for banner creative rendering.
   */
  creativeURL?: string;
  /**
   * Enable or disable adapter telemetry events.
   */
  telemetry?: boolean;
}

declare module '../src/config.ts' {
  interface Config {
    aps?: ApsAdapterConfig;
  }
}
