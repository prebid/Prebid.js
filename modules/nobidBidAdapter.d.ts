/** Video targeting settings; sent to the server unchanged as part of `params`. */
export interface NobidVideoParams {
  /** Whether the user can skip the video ad. */
  skippable?: boolean;
  /** Supported playback methods, e.g. `'auto_play_sound_off'`, `'click_to_play'`. */
  playback_method?: string[];
  /** Supported player positions, e.g. `'atf'`, `'btf'`, `'sidebar'`. */
  position?: string[];
  /** Supported content MIME types. */
  mimes?: string[];
  /** Minimum video ad duration in seconds. */
  minduration?: number;
  /** Maximum video ad duration in seconds. */
  maxduration?: number;
  /** Supported API frameworks (0: none, 1: VPAID 1.0, 2: VPAID 2.0, 3: MRAID 1.0, 4: ORMMA, 5: MRAID 2.0). */
  frameworks?: number[];
}

/** Parameters accepted by the NoBid bidder adapter. The whole object is sent to the server as `params`. */
export interface NobidBidParams {
  /** Site ID provided by NoBid. */
  siteId: number;
  /** Placement ID provided by NoBid, for reporting on a specific ad unit. */
  placementId?: number;
  /** Video targeting settings. */
  video?: NobidVideoParams;
}

declare module '../src/adUnits' {
  interface BidderParams {
    nobid: NobidBidParams;
    duration: NobidBidParams;
  }
}
