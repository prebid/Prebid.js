/**
 * OpenRTB 2.5 video fields that override `mediaTypes.video`. Values failing the adapter's
 * OpenRTB checks are dropped with a warning.
 */
export interface SovrnVideoParams {
  mimes?: string[];
  minduration?: number;
  maxduration?: number;
  protocols?: number[];
  w?: number;
  h?: number;
  startdelay?: number;
  placement?: number;
  plcmt?: number;
  linearity?: number;
  skip?: number;
  skipmin?: number;
  skipafter?: number;
  sequence?: number;
  battr?: number[];
  maxextended?: number;
  minbitrate?: number;
  maxbitrate?: number;
  boxingallowed?: number;
  playbackmethod?: number[];
  playbackend?: number;
  delivery?: number[];
  pos?: number;
  api?: number[];
}

/** Parameters accepted by the Sovrn bidder adapter. */
export interface SovrnBidParams {
  /** Sovrn ad tag ID; must be numeric. */
  tagid: number | string;
  /** Static CPM floor in USD, used when the floors module provides none. */
  bidfloor?: number | string;
  /** Comma-separated deal IDs, sent as `imp.ext.deals`. */
  segments?: string;
  /** Sovrn `iv` value, forwarded on the request. */
  iv?: string;
  /** OpenRTB video fields that override `mediaTypes.video`. */
  video?: SovrnVideoParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    sovrn: SovrnBidParams;
  }
}
