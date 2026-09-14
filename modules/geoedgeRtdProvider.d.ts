// the augmentation in this file only applies where the spec is part of the program
import type {} from './rtdModule/spec.js';

export interface GeoedgeRtdProviderParams {
  /**
   * Geoedge customer key. Contact Geoedge to obtain one.
   */
  key: string;
  /**
   * Bidders to monitor, keyed by bidder code. Set a bidder to `true` to monitor it.
   * When omitted, bids from all bidders are monitored.
   */
  bidders?: Record<string, boolean>;
  /**
   * When `true`, wrap bid responses only after the monitoring client has loaded.
   * Defaults to `false`.
   */
  wap?: boolean;
  /**
   * When `true`, monitor every Google Publisher Tag ad slot through the in-page
   * script rather than wrapping Prebid bid responses. Defaults to `false`.
   */
  gpt?: boolean;
  /**
   * When `true`, extend monitoring to outstream video bids by gating the bid's own
   * renderer until the monitoring client clears the creative. Defaults to `false`.
   */
  outstream?: boolean;
  /**
   * When `false`, opt out of display monitoring and leave display bids unwrapped.
   * Defaults to `true`.
   */
  display?: boolean;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    geoedge: {
      params: GeoedgeRtdProviderParams;
    };
  }
}

export {};
