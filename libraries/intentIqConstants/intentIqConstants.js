export const FIRST_PARTY_KEY = '_iiq_fdata';

export const SUPPORTED_TYPES = ['html5', 'cookie']

export const WITH_IIQ = 'A';
export const WITHOUT_IIQ = 'B';
export const NOT_YET_DEFINED = 'U';
export const BLACK_LIST = 'L';
export const CLIENT_HINTS_KEY = '_iiq_ch';
export const EMPTY = 'EMPTY';
export const GVLID = '1323';
export const VERSION = 0.32;
export const PREBID = 'pbjs';
export const HOURS_24 = 86400000;

export const INVALID_ID = 'INVALID_ID';

export const SYNC_REFRESH_MILL = 3600000;
export const META_DATA_CONSTANT = 256;

export const MAX_REQUEST_LENGTH = {
  // https://www.geeksforgeeks.org/maximum-length-of-a-url-in-different-browsers/
  chrome: 2097152,
  safari: 80000,
  opera: 2097152,
  edge: 2048,
  firefox: 65536,
  ie: 2048
};

export const CH_KEYS = [
  'brands', 'mobile', 'platform', 'bitness', 'wow64', 'architecture',
  'model', 'platformVersion', 'fullVersionList'
];
