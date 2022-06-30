/**
 * @typedef {Object} OrtbParams
 * @property {OrtbVideoParamst} video
 * @property {OrtbContentParams} content
 */

/**
 * @typedef OrtbVideoParams
 * @property {[string]} mimes - Content MIME types supported (e.g., “video/x-ms-wmv”, “video/mp4”).
 * @property {number|undefined} minduration - Minimum video ad duration in seconds.
 * @property {number|undefined} maxduration - Maximum video ad duration in seconds.
 * @property {[number]} protocols - Supported video protocols. At least one supported protocol must be specified.
 * @property {number} w - Width of the video player in device independent pixels (DIPS).
 * @property {number} h - Height of the video player in device independent pixels (DIPS).
 * @property {number|undefined} startdelay - Indicates the offset of the ad placement.
 * @property {number|undefined} placement - Placement type for the impression.
 * @property {number|undefined} linearity - Indicates if the impression must be linear, nonlinear, etc. If omitted, assume all are allowed.
 * @property {number} skip - Indicates if the player can allow the video to be skipped, where 0 is no, 1 is yes.
 * @property {number|undefined} skipmin - Only ad creatives with a duration greater than this value can be skippable; only applicable if the ad is skippable.
 * @property {number|undefined} skipafter - Number of seconds a video must play before skipping is enabled; only applicable if the ad is skippable.
 * @property {number|undefined} sequence - If multiple ad impressions are offered in the same bid request, the sequence number will allow for the coordinated delivery of multiple creatives.
 * @property {[number]|undefined} battr - Blocked creative attributes. Use this to indicate which creatives the player does not support.
 * @property {number|undefined} maxextended - Maximum extended ad duration if extension is allowed.
 * @property {number|undefined} minbitrate - Minimum bit rate in Kbps supported by the player.
 * @property {number|undefined} maxbitrate - Maximum bit rate in Kbps supported by the player.
 * @property {number|undefined} boxingallowed - Indicates if letter-boxing of 4:3 content into a 16:9 window is allowed. 0 is no, 1 is yes.
 * @property {[number]|undefined} playbackmethod - Playback methods that may be in use.
 * @property {number|undefined} playbackend - The scenario that causes playback to end.
 * @property {[number]|undefined} delivery - Supported delivery methods (e.g., streaming, progressive).
 * @property {number|undefined} pos - Ad position on screen.
 * @property {[Object]|undefined} companionad - list of companion ads. Refer to Section 3.2.6 of the oRTB v2.5 spec for the interface of the companion ad object.
 * @property {[number]|undefined} api - List of supported API frameworks for this impression.
 * @property {[number]|undefined} companiontype - Supported VAST companion ad types. Refer to List 5.14 of the oRTB v2.5 spec for the interface.
 * @property {Object|undefined} ext - Placeholder for exchange-specific extensions to OpenRTB.
 */

/**
 * @typedef OrtbContentParams
 * @property {string} id - ID uniquely identifying the content.
 * @property {string} url - URL of the content, for buy-side contextualization or review.
 * @property {number|undefined} episode - Episode number.
 * @property {string|undefined} title - Content title.
 * @property {string|undefined} series - Content series i.e. “The Office” (television), “Star Wars” (movie).
 * @property {string|undefined} season - Content season (e.g., “Season 3”).
 * @property {string|undefined} artist - Artist credited with the content.
 * @property {string|undefined} genre - Genre that best describes the content (e.g., rock, pop, etc).
 * @property {string|undefined} album - Album to which the content belongs. Typically for audio.
 * @property {string|undefined} isrc - International Standard Recording Code conforming to ISO3901.
 * @property {Object|undefined} producer - Details about the content Producer. For Producer interface visit Section 3.2.17 of the oRTB v2.5 spec.
 * @property {[string]|undefined} cat - List of IAB content categories that describe the content. Refer to List 5.1. of the oRTB v2.5 spec for the complete list.
 * @property {number|undefined} prodq - Production quality. Refer to List 5.13 of the oRTB v2.5 spec.
 * @property {number|undefined} context - Type of content (game, video, text, etc.). Refer to List 5.18 of the oRTB v2.5 spec.
 * @property {string|undefined} contentrating - Content rating (e.g., MPAA).
 * @property {string|undefined} userrating - User rating of the content (e.g., number of stars, likes, etc.).
 * @property {number|undefined} qagmediarating - Media rating per IQG guidelines. Refer to List 5.19 of the oRTB v2.5 spec.
 * @property {string|undefined} keywords - Comma separated list of keywords describing the content.
 * @property {number|undefined} livestream - Whether the stream is live or not. 0 means not live (VOD), 1 means content is live streaming.
 * @property {number|undefined} sourcerelationship - 0 means indirect, 1 means direct.
 * @property {number} len - Duration of content in seconds.
 * @property {string|undefined} language - Content language using ISO-639-1-alpha-2.
 * @property {number|undefined} embeddable - Indicator of whether or not the content is embeddable (e.g., an embeddable video player). 0 means no, 1 means yes.
 * @property {[Object]|undefined} data - Additional content data. Each Data object represents a different data source. See Section 3.2.21 of the oRTB v2.5 spec.
 * @property {Object|undefined} ext - Placeholder for exchange-specific extensions to OpenRTB.
 */

const VIDEO_PREFIX = 'video/';
const APPLICATION_PREFIX = 'application/';

/**
 * ORTB 2.5 section 3.2.7 - Video.mimes
 * @enum OrtbVideoParams.mimes
 */
export const VIDEO_MIME_TYPE = {
  MP4: VIDEO_PREFIX + 'mp4',
  MPEG: VIDEO_PREFIX + 'mpeg',
  OGG: VIDEO_PREFIX + 'ogg',
  WEBM: VIDEO_PREFIX + 'webm',
  AAC: VIDEO_PREFIX + 'aac',
  HLS: APPLICATION_PREFIX + 'vnd.apple.mpegurl'
};

export const JS_APP_MIME_TYPE = APPLICATION_PREFIX + 'javascript';
export const VPAID_MIME_TYPE = JS_APP_MIME_TYPE;

/**
 * ORTB 2.5 section 5.9 - Video Placement Types
 * @enum OrtbVideoParams.placement
 */
export const PLACEMENT = {
  INSTREAM: 1,
  BANNER: 2,
  ARTICLE: 3,
  FEED: 4,
  INTERSTITIAL: 5,
  SLIDER: 5,
  FLOATING: 5,
  INTERSTITIAL_SLIDER_FLOATING: 5
};

/**
 * ORTB 2.5 section 5.4 - Ad Position
 * @enum OrtbVideoParams.pos
 */
export const AD_POSITION = {
  UNKNOWN: 0,
  ABOVE_THE_FOLD: 1,
  BELOW_THE_FOLD: 3,
  HEADER: 4,
  FOOTER: 5,
  SIDEBAR: 6,
  FULL_SCREEN: 7
}

/**
 * ORTB 2.5 section 5.11 - Playback Cessation Modes
 * @enum OrtbVideoParams.playbackend
 */
export const PLAYBACK_END = {
  VIDEO_COMPLETION: 1,
  VIEWPORT_LEAVE: 2,
  FLOATING: 3
}

/**
 * ORTB 2.5 section 5.10 - Playback Methods
 * @enum OrtbVideoParams.playbackmethod
 */
export const PLAYBACK_METHODS = {
  AUTOPLAY: 1,
  AUTOPLAY_MUTED: 2,
  CLICK_TO_PLAY: 3,
  CLICK_TO_PLAY_MUTED: 4,
  VIEWABLE: 5,
  VIEWABLE_MUTED: 6
};

/**
 * ORTB 2.5 section 5.8 - Protocols
 * @enum OrtbVideoParams.protocols
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

/**
 * ORTB 2.5 section 5.6 - API Frameworks
 * @enum OrtbVideoParams.api
 */
export const API_FRAMEWORKS = {
  VPAID_1_0: 1,
  VPAID_2_0: 2,
  OMID_1_0: 7
};

/**
 * ORTB 2.5 section 5.18 - Content Context
 * @enum OrtbContentParams.context
 */
export const CONTEXT = {
  VIDEO: 1,
  AUDIO: 3
};
