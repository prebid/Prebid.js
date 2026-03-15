// Life Cycle
export const SETUP_COMPLETE = 'setupComplete' as const;
export const SETUP_FAILED = 'setupFailed' as const;
export const DESTROYED = 'destroyed' as const;

// Ads
export const AD_REQUEST = 'adRequest' as const;
export const AD_BREAK_START = 'adBreakStart' as const;
export const AD_LOADED = 'adLoaded' as const;
export const AD_STARTED = 'adStarted' as const;
export const AD_IMPRESSION = 'adImpression' as const;
export const AD_PLAY = 'adPlay' as const;
export const AD_TIME = 'adTime' as const;
export const AD_PAUSE = 'adPause' as const;
export const AD_CLICK = 'adClick' as const;
export const AD_SKIPPED = 'adSkipped' as const;
export const AD_ERROR = 'adError' as const;
export const AD_COMPLETE = 'adComplete' as const;
export const AD_BREAK_END = 'adBreakEnd' as const;

// Media
export const PLAYLIST = 'playlist' as const;
export const PLAYBACK_REQUEST = 'playbackRequest' as const;
export const AUTOSTART_BLOCKED = 'autostartBlocked' as const;
export const PLAY_ATTEMPT_FAILED = 'playAttemptFailed' as const;
export const CONTENT_LOADED = 'contentLoaded' as const;
export const PLAY = 'play' as const;
export const PAUSE = 'pause' as const;
export const BUFFER = 'buffer' as const;
export const TIME = 'time' as const;
export const SEEK_START = 'seekStart' as const;
export const SEEK_END = 'seekEnd' as const;
export const MUTE = 'mute' as const;
export const VOLUME = 'volume' as const;
export const RENDITION_UPDATE = 'renditionUpdate' as const;
export const ERROR = 'error' as const;
export const COMPLETE = 'complete' as const;
export const PLAYLIST_COMPLETE = 'playlistComplete' as const;

// Layout
export const FULLSCREEN = 'fullscreen' as const;
export const PLAYER_RESIZE = 'playerResize' as const;
export const VIEWABLE = 'viewable' as const;
export const CAST = 'cast' as const;

export const allVideoEvents = [
  SETUP_COMPLETE, SETUP_FAILED, DESTROYED, AD_REQUEST, AD_BREAK_START, AD_LOADED, AD_STARTED,
  AD_IMPRESSION, AD_PLAY, AD_TIME, AD_PAUSE, AD_CLICK, AD_SKIPPED, AD_ERROR, AD_COMPLETE, AD_BREAK_END, PLAYLIST,
  PLAYBACK_REQUEST, AUTOSTART_BLOCKED, PLAY_ATTEMPT_FAILED, CONTENT_LOADED, PLAY, PAUSE, BUFFER, TIME, SEEK_START,
  SEEK_END, MUTE, VOLUME, RENDITION_UPDATE, ERROR, COMPLETE, PLAYLIST_COMPLETE, FULLSCREEN, PLAYER_RESIZE, VIEWABLE,
  CAST
] as const;

export const AUCTION_AD_LOAD_ATTEMPT = 'auctionAdLoadAttempt' as const;
export const AUCTION_AD_LOAD_QUEUED = 'auctionAdLoadQueued' as const;
export const AUCTION_AD_LOAD_ABORT = 'auctionAdLoadAbort' as const;
export const BID_IMPRESSION = 'bidImpression' as const;
export const BID_ERROR = 'bidError' as const;

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
} as const;

export const additionalEvents = [
  AUCTION_AD_LOAD_ATTEMPT,
  AUCTION_AD_LOAD_QUEUED,
  AUCTION_AD_LOAD_ABORT,
  BID_IMPRESSION,
  BID_ERROR
] as const;

type Event = { [K in keyof typeof videoEvents]: (typeof videoEvents)[K] }[keyof typeof videoEvents] | typeof additionalEvents[number];
type ExternalName<E extends Event> = `video${Capitalize<E>}`;
export type VideoEvent = ExternalName<Event>;
