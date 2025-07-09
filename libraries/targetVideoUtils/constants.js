const SOURCE = 'pbjs';
const GVLID = 786;
const MARGIN = 1.35;
const BIDDER_CODE = 'targetVideo';

const TIME_TO_LIVE = 300;
const BANNER_ENDPOINT_URL = 'https://ib.adnxs.com/ut/v3/prebid';
const VIDEO_ENDPOINT_URL = 'https://pbs.prebrid.tv/openrtb2/auction';
const SYNC_URL = 'https://bppb.link/static/';
const VIDEO_PARAMS = [
  'api', 'linearity', 'maxduration', 'mimes', 'minduration',
  'plcmt', 'playbackmethod', 'protocols', 'startdelay', 'placement'
];

export {
  SOURCE,
  GVLID,
  MARGIN,
  BIDDER_CODE,
  SYNC_URL,
  TIME_TO_LIVE,
  BANNER_ENDPOINT_URL,
  VIDEO_ENDPOINT_URL,
  VIDEO_PARAMS
}
