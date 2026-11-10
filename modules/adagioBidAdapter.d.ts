/** Debug options; makes the server return a bid at the given CPM. */
export interface AdagioDebugParams {
  enabled?: boolean;
  /** CPM of the debug bid; defaults to 1.00. */
  cpm?: number;
}

/** OpenRTB Native 1.2 request fields; only `context` and `plcmttype` are supported. */
export interface AdagioNativeParams {
  context?: number;
  plcmttype?: number;
}

/**
 * Parameters accepted by the Adagio bidder adapter.
 *
 * `organizationId`, `site` and `placement` are required by the time the bid is validated, but
 * the adapter can fill them in: `organizationId` and `site` from the `adagio.siteId` config
 * (`'<organizationId>:<site>'`), `placement` from `ortb2Imp.ext.data.adg_rtd.placement`,
 * `ortb2Imp.ext.data.placement` or the ad unit code (`useAdUnitCodeAsPlacement`).
 */
export interface AdagioBidParams {
  /** Organization ID, handed out by Adagio. Prefer the `adagio.siteId` config. */
  organizationId?: number | string;
  /** Site name, handed out by Adagio. Prefer the `adagio.siteId` config. */
  site?: string;
  /** Placement of the ad unit in the page, e.g. `'banner_top'`. Not the OpenRTB video `placement`. */
  placement?: string;
  /** Kind of content in the page; falls back to `adagio.pagetype` config or `ortb2.site.ext.data.pagetype`. */
  pagetype?: string;
  /** Content category; falls back to `adagio.category` config or `ortb2.site.ext.data.category`. */
  category?: string;
  /** ID of the ad unit's element; overridden by `ortb2Imp.ext.data.divId`. */
  adUnitElementId?: string;
  /** Use the ad unit code as `adUnitElementId`. */
  useAdUnitCodeAsAdUnitElementId?: boolean;
  /** Use the ad unit code as `placement`. */
  useAdUnitCodeAsPlacement?: boolean;
  /** Split keyword; numbers are converted to strings. */
  splitKeyword?: string | number;
  /** Data layer key-values; sent as `dl`, with values converted to strings. */
  dataLayer?: Record<string, string | number>;
  /** Data layer key-values, sent as is. Prefer `dataLayer`. */
  dl?: Record<string, string>;
  /** OpenRTB 2.5 video fields that override `mediaTypes.video`. */
  video?: Record<string, unknown>;
  /** OpenRTB Native 1.2 request fields. */
  native?: AdagioNativeParams;
  /** Debug mode. */
  debug?: AdagioDebugParams;
  /** Blue Billywig renderer code used for outstream video. */
  rendererCode?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    adagio: AdagioBidParams;
  }
}
