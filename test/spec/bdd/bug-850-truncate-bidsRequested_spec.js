import { equal } from 'assert';

import faker from 'faker';
import { makeAdUnit, makeBidder, makeAdSlot, makeRequest } from './faker/fixtures';

const $$PREBID_GLOBAL$$ = window.$$PREBID_GLOBAL$$ || {};
const pbjsBackup = $$PREBID_GLOBAL$$;

function resetPrebid() {
  delete window.$$PREBID_GLOBAL$$;
  require('src/prebid');
}

describe('Bug: #825 adUnit code based refresh times out without setting targets', () => {

  describe('Given a page with five ad slots has loaded and the auction is finished', () => {

    before(() => resetPrebid());

    after(() => window.$$PREBID_GLOBAL$$ = pbjsBackup);

    makeAdSlot();
    makeAdSlot();
    makeAdSlot();
    makeAdSlot();
    makeAdSlot();

    $$PREBID_GLOBAL$$.requestBids();

    it('gotcha', () => {
      equal(true, false, 'is it truth?');
    });
  });
});
