// Life Cycle
export const SETUP_COMPLETE = 'setupComplete';
export const SETUP_FAILED = 'setupFailed';
export const DESTROYED = 'destroyed';

// Ads
export const AD_REQUEST = 'adRequest';
export const AD_BREAK_START = 'adBreakStart';
export const AD_LOADED = 'adLoaded';
export const AD_STARTED = 'adStarted';
export const AD_IMPRESSION = 'adImpression';
export const AD_PLAY = 'adPlay';
export const AD_TIME = 'adTime';
export const AD_PAUSE = 'adPause';
export const AD_CLICK = 'adClick';
export const AD_SKIPPED = 'adSkipped';
export const AD_ERROR = 'adError';
export const AD_COMPLETE = 'adComplete';
export const AD_BREAK_END = 'adBreakEnd';

// Media
export const PLAYLIST = 'playlist';
export const PLAYBACK_REQUEST = 'playbackRequest';
export const AUTOSTART_BLOCKED = 'autostartBlocked';
export const PLAY_ATTEMPT_FAILED = 'playAttemptFailed';
export const CONTENT_LOADED = 'contentLoaded';
export const PLAY = 'play';
export const PAUSE = 'pause';
export const BUFFER = 'buffer';
export const TIME = 'time';
export const SEEK_START = 'seekStart';
export const SEEK_END = 'seekEnd';
export const MUTE = 'mute';
export const VOLUME = 'volume';
export const RENDITION_UPDATE = 'renditionUpdate';
export const ERROR = 'error';
export const COMPLETE = 'complete';
export const PLAYLIST_COMPLETE = 'playlistComplete';

// Layout
export const FULLSCREEN = 'fullscreen';
export const PLAYER_RESIZE = 'playerResize';
export const VIEWABLE = 'viewable';
export const CAST = 'cast';

export const allVideoEvents = [
  SETUP_COMPLETE, SETUP_FAILED, DESTROYED, AD_REQUEST, AD_BREAK_START, AD_LOADED, AD_STARTED,
  AD_IMPRESSION, AD_PLAY, AD_TIME, AD_PAUSE, AD_CLICK, AD_SKIPPED, AD_ERROR, AD_COMPLETE, AD_BREAK_END, PLAYLIST,
  PLAYBACK_REQUEST, AUTOSTART_BLOCKED, PLAY_ATTEMPT_FAILED, CONTENT_LOADED, PLAY, PAUSE, BUFFER, TIME, SEEK_START,
  SEEK_END, MUTE, VOLUME, RENDITION_UPDATE, ERROR, COMPLETE, PLAYLIST_COMPLETE, FULLSCREEN, PLAYER_RESIZE, VIEWABLE,
  CAST
];

export const AUCTION_AD_LOAD_ATTEMPT = 'auctionAdLoadAttempt';
export const AUCTION_AD_LOAD_ABORT = 'auctionAdLoadAbort';
export const BID_IMPRESSION = 'bidImpression';
export const BID_ERROR = 'bidError';

export const videoEvents = {
  SETUP_COMPLETE,
  SETUP_FAILED,
  DESTROYED,
  AD_REQUEST,
  AD_BREAK_START,
  AD_LOADED,
  AD_STARTED,
  AD_IMPRESSION,
  AD_PLAY,
  AD_TIME,
  AD_PAUSE,
  AD_CLICK,
  AD_SKIPPED,
  AD_ERROR,
  AD_COMPLETE,
  AD_BREAK_END,
  PLAYLIST,
  PLAYBACK_REQUEST,
  AUTOSTART_BLOCKED,
  PLAY_ATTEMPT_FAILED,
  CONTENT_LOADED,
  PLAY,
  PAUSE,
  BUFFER,
  TIME,
  SEEK_START,
  SEEK_END,
  MUTE,
  VOLUME,
  RENDITION_UPDATE,
  ERROR,
  COMPLETE,
  PLAYLIST_COMPLETE,
  FULLSCREEN,
  PLAYER_RESIZE,
  VIEWABLE,
  CAST,
};
