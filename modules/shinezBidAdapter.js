import {logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {makeBaseSpec} from '../libraries/riseUtils/index.js';

const BIDDER_CODE = 'shinez';
const BASE_URL = 'https://hb.sweetgum.io/';
const MODES = {
  PRODUCTION: 'hb-sz-multi',
  TEST: 'hb-multi-sz-test'
};

export const spec = {
  ...makeBaseSpec(BASE_URL, MODES),
  code: BIDDER_CODE,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params) {
      logWarn('no params have been set to Shinez adapter');
      return false;
    }

    if (!bidRequest.params.org) {
      logWarn('org is a mandatory param for Shinez adapter');
      return false;
    }

    return true;
  }
};

registerBidder(spec);
