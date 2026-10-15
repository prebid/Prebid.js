/**
 * Publisher-provided configuration for the Optimera RTD submodule.
 * Passed via `pbjs.setConfig({ realTimeData: { dataProviders: [{ name: 'optimeraRTD', params }] } })`.
 */
export interface OptimeraRtdParams {
  /**
   * Optimera-assigned client identifier. Required.
   */
  clientID: string;
  /**
   * Key name used for legacy key-value targeting. Defaults to `hb_deal_optimera`.
   */
  optimeraKeyName?: string;
  /**
   * Device segment used to select device-specific scores (e.g. `mobile`, `desktop`).
   * Defaults to `default`.
   */
  device?: string;
  /**
   * Optimera scores API version to use. One of `v0` or `v1`. Defaults to `v0`.
   */
  apiVersion?: 'v0' | 'v1';
  /**
   * Whether ORTB2 targeting is injected before bid requests are sent.
   * Defaults to `allow`.
   */
  transmitWithBidRequests?: string;
  /**
   * When `true` (or the string `"true"`), loads the Optimera oPS measurement
   * script and appends it to the document body. Defaults to `false`.
   */
  callOPS?: boolean | string;
}
