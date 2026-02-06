import {BANNER, NATIVE, VIDEO} from '../../src/mediaTypes.js';

const OW_GVLID = 280
export const SUPPORTED_AD_TYPES = [BANNER, VIDEO, NATIVE];
export const ADAPTER_VERSION = '8.0.0';
export const DEFAULT_TTL = 360;
export const DEFAULT_CURRENCY = 'USD';
export const BASE_URL = 'https://hb.yellowblue.io/';
export const BIDDER_CODE = 'rise';
export const DEFAULT_GVLID = 1043;

export const ALIASES = [
  { code: 'risexchange', gvlid: DEFAULT_GVLID },
  { code: 'openwebxchange', gvlid: OW_GVLID }
]

export const MODES = {
  PRODUCTION: 'hb-multi',
  TEST: 'hb-multi-test'
};
