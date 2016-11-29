import { equal } from 'assert';

import faker from 'faker';
import { makeAdUnit, makeBidder, makeAdSlot, makeRequest } from './faker/fixtures';
import adaptermanager from 'src/adaptermanager';

function resetPrebid() {
  delete window.$$PREBID_GLOBAL$$;
  require('src/prebid');
}

const $$PREBID_GLOBAL$$ = window.$$PREBID_GLOBAL$$ || {};
const pbjsBackup = $$PREBID_GLOBAL$$;
let adUnits;
let adapters;

describe('Bug: #825 adUnit code based refresh times out without setting targets', () => {
  describe('Given a page with five ad slots has loaded and the auction is finished', () => {

    beforeEach(() => {
      adapters = [
        makeBidder(),
        makeBidder(),
        makeBidder()
      ];

      adUnits = [
        makeAdUnit({ bids: adapters }),
        makeAdUnit({ bids: adapters }),
        makeAdUnit({ bids: adapters }),
        makeAdUnit({ bids: adapters }),
        makeAdUnit({ bids: adapters })
      ];

      makeAdSlot({ code: adUnits[0].code });
      makeAdSlot({ code: adUnits[1].code });
      makeAdSlot({ code: adUnits[2].code });
      makeAdSlot({ code: adUnits[3].code });
      makeAdSlot({ code: adUnits[4].code });
    });

    after(() => window.$$PREBID_GLOBAL$$ = pbjsBackup);

    describe('When a subsequent bid request is made for one of the slots', () => {
      it('Then', () => {
        resetPrebid();

        adapters.forEach(adapter => {
          adaptermanager.bidderRegistry[[adapter.bidder]] = { callBids: adapter.callBids };
        });

        $$PREBID_GLOBAL$$.requestBids(makeRequest({ adUnits }));
        equal($$PREBID_GLOBAL$$._bidsRequested, [], 'is it on?');
      });
    });
  });
});
