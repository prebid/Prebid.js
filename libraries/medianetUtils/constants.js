export const mnetGlobals = {
  auctions: {}, // Stores details of ongoing or completed auctions
  infoByAdIdMap: {}, // Maps ad IDs to their respective information
  bdpMap: {},
  configuration: {},
  logsQueue: [], // Queue for storing logs
  errorQueue: [], // Queue for storing errors,
  eventQueue: null,
  refererInfo: null,
};

export const LOGGING_DELAY = 2000;

export const LOG_TYPE_ID = 'kfk';
export const LOG_EVT_ID = 'projectevents';
export const EVENT_PIXEL_URL = 'https://qsearch-a.akamaihd.net/log';
export const POST_ENDPOINT = 'https://navvy.media.net/log';
export const GET_ENDPOINT = 'https://pb-logs.media.net/log';
export const ANALYTICS_VERSION = '2.0.0';
export const PREBID_VERSION = '$prebid.version$';
export const MEDIANET = 'medianet';
export const GLOBAL_VENDOR_ID = 142;

// Bid Status
export const BID_SUCCESS = 1;
export const BID_NOBID = 2;
export const BID_TIMEOUT = 3;
export const SUCCESS_AFTER_AUCTION = 5;
export const NOBID_AFTER_AUCTION = 6;
export const TIMEOUT_AFTER_AUCTION = 7;
export const BID_FLOOR_REJECTED = 12;

export const DBF_PRIORITY = {
  [BID_SUCCESS]: 4,
  [BID_NOBID]: 3,
  [SUCCESS_AFTER_AUCTION]: 2,
  [BID_TIMEOUT]: 1,
  [NOBID_AFTER_AUCTION]: 1,
  [TIMEOUT_AFTER_AUCTION]: 0,
  [BID_FLOOR_REJECTED]: 0
};

// Properties
export const SEND_ALL_BID_PROP = 'enableSendAllBids';
export const AUCTION_OPTIONS = 'auctionOptions';

// Errors
export const ERROR_CONFIG_JSON_PARSE = 'analytics_config_parse_fail';
export const ERROR_CONFIG_FETCH = 'analytics_config_ajax_fail';
export const PBS_ERROR_STATUS_START = 2000;
export const WINNING_BID_ABSENT_ERROR = 'winning_bid_absent';
export const WINNING_AUCTION_MISSING_ERROR = 'winning_auction_missing';
export const ERROR_IWB_BID_MISSING = 'iwb_bid_missing';
// Config
export const CONFIG_PENDING = 0;
export const CONFIG_PASS = 1;
export const CONFIG_ERROR = 3;
export const DEFAULT_LOGGING_PERCENT = 50;
export const CONFIG_URL = 'https://prebid.media.net/rtb/prebid/analytics/config';
// Dummy Bidder
export const DUMMY_BIDDER = '-2';

// Video Constants
export const VIDEO_UUID_PENDING = 9999;

export const VIDEO_CONTEXT = {
  INSTREAM: 'instream',
  OUTSTREAM: 'outstream'
}

export const VIDEO_PLACEMENT = {
  [VIDEO_CONTEXT.INSTREAM]: 1,
  [VIDEO_CONTEXT.OUTSTREAM]: 6
}

// Log Types
export const LOG_APPR = 'APPR';
export const LOG_RA = 'RA';
