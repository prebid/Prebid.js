import {logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {makeBaseSpec} from '../libraries/riseUtils/index.js';

const BIDDER_CODE = 'stn';
const BASE_URL = 'https://hb.stngo.com/';
const MODES = {
  PRODUCTION: 'hb-multi',
  TEST: 'hb-multi-test'
};

export const spec = {
  ...makeBaseSpec(BASE_URL, MODES),
  code: BIDDER_CODE,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params) {
      logWarn('no params have been set to STN adapter');
      return false;
    }

    if (!bidRequest.params.org) {
      logWarn('org is a mandatory param for STN adapter');
      return false;
    }

    return true;
  }
};

registerBidder(spec);
