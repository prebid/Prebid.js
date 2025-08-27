import {logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {makeBaseSpec} from '../libraries/riseUtils/index.js';

const BIDDER_CODE = 'openweb';
const BASE_URL = 'https://hb.openwebmp.com/';
const GVLID = 280;
const MODES = {
  PRODUCTION: 'hb-multi',
  TEST: 'hb-multi-test'
};

export const spec = {
  ...makeBaseSpec(BASE_URL, MODES),
  code: BIDDER_CODE,
  gvlid: GVLID,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params) {
      logWarn('no params have been set to OpenWeb adapter');
      return false;
    }

    if (!bidRequest.params.org) {
      logWarn('org is a mandatory param for OpenWeb adapter');
      return false;
    }

    if (!bidRequest.params.placementId) {
      logWarn('placementId is a mandatory param for OpenWeb adapter');
      return false;
    }

    return true;
  }
};

registerBidder(spec);
