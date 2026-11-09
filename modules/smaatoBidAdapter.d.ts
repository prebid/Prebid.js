import type { Geo } from 'iab-openrtb/v26';

export interface SmaatoAppParams {
  /** Advertising id of the device, used when `device.ifa` is not set. */
  ifa?: string;
  /** Device location, used when `device.geo` is not set. */
  geo?: Geo;
}

export interface SmaatoBidderParams {
  /** Smaato publisher id. */
  publisherId: string;
  /** Smaato adspace id, sent as `imp.tagid`. */
  adspaceId: string;
  /** Overrides the bid request endpoint. */
  endpoint?: string;
  app?: SmaatoAppParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    smaato: SmaatoBidderParams;
  }
}
