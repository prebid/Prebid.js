
const VIDEO_PREFIX = 'video/'

/*
ORTB 2.5 section 3.2.7 - Video.mimes
 */
export const VIDEO_MIME_TYPE = {
  MP4: VIDEO_PREFIX + 'mp4',
  MPEG: VIDEO_PREFIX + 'mpeg',
  OGG: VIDEO_PREFIX + 'ogg',
  WEBM: VIDEO_PREFIX + 'webm',
  AAC: VIDEO_PREFIX + 'aac',
  HLS: 'application/vnd.apple.mpegurl'
};

export const JS_APP_MIME_TYPE = 'application/javascript';
export const VPAID_MIME_TYPE = JS_APP_MIME_TYPE;

/*
ORTB 2.5 section 5.9 - Video Placement Types
 */
export const PLACEMENT = {
  IN_STREAM: 1,
  BANNER: 2,
  ARTICLE: 3,
  FEED: 4,
  INTERSTITIAL: 5,
  SLIDER: 5,
  FLOATING: 5,
  INTERSTITIAL_SLIDER_FLOATING: 5
};

/*
ORTB 2.5 section 5.10 - Playback Methods
 */
export const PLAYBACK_METHODS = {
  AUTOPLAY: 1,
  AUTOPLAY_MUTED: 2,
  CLICK_TO_PLAY: 3,
  CLICK_TO_PLAY_MUTED: 4,
  VIEWABLE: 5,
  VIEWABLE_MUTED: 6
};

/*
ORTB 2.5 section 5.8 - Protocols
 */
export const PROTOCOLS = {
  // VAST_1_0: 1,
  VAST_2_0: 2,
  VAST_3_0: 3,
  // VAST_1_O_WRAPPER: 4,
  VAST_2_0_WRAPPER: 5,
  VAST_3_0_WRAPPER: 6,
  VAST_4_0: 7,
  VAST_4_0_WRAPPER: 8
};

/*
ORTB 2.5 section 5.6 - API Frameworks
 */
export const API_FRAMEWORKS = {
  VPAID_1_0: 1,
  VPAID_2_0: 2,
  OMID_1_0: 7
};
