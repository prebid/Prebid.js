

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

/*
ORTB 2.5 section 5.10 - Playback Methods
 */
export const PLAYBACK_METHODS = { // Spec 5.10.
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
export const PROTOCOLS = { // Spec 5.8.
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
export const API_FRAMEWORKS = { // Spec 5.6.
    VPAID_1_0: 1,
    VPAID_2_0: 2,
    OMID_1_0: 7
};
