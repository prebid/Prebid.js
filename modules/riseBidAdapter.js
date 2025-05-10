import {logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {makeBaseSpec} from '../libraries/riseUtils/index.js';
import {
  ALIASES,
  BASE_URL,
  BIDDER_CODE,
  DEFAULT_GVLID,
  MODES,
} from '../libraries/riseUtils/constants.js';

export const spec = {
  ...makeBaseSpec(BASE_URL, MODES),
  code: BIDDER_CODE,
  aliases: ALIASES,
  gvlid: DEFAULT_GVLID,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params) {
      logWarn('no params have been set to Rise adapter');
      return false;
    }

    if (!bidRequest.params.org) {
      logWarn('org is a mandatory param for Rise adapter');
      return false;
    }

    return true;
  }
};

registerBidder(spec);
