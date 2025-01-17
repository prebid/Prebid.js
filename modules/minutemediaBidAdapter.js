import {logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {makeBaseSpec} from '../libraries/riseUtils/index.js';

const BIDDER_CODE = 'minutemedia';
const BASE_URL = 'https://hb.minutemedia-prebid.com/';
const GVLID = 918;
const MODES = {
  PRODUCTION: 'hb-mm-multi',
  TEST: 'hb-multi-mm-test'
};

export const spec = {
  ...makeBaseSpec(BASE_URL, MODES),
  code: BIDDER_CODE,
  gvlid: GVLID,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params) {
      logWarn('no params have been set to MinuteMedia adapter');
      return false;
    }

    if (!bidRequest.params.org) {
      logWarn('org is a mandatory param for MinuteMedia adapter');
      return false;
    }

    return true;
  }
};

registerBidder(spec);
