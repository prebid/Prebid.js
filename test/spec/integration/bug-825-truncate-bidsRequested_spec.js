import { equal } from 'assert';

import faker from 'faker';
import { makeAdUnit, makeBidder, makeAdSlot, makeRequest } from './faker/fixtures';
import adaptermanager from 'src/adaptermanager';

function resetPrebid() {
  delete window.$$PREBID_GLOBAL$$;
  require('src/prebid');
}

let pbjsBackup;
let adUnits;
let adapters;

describe('Bug: #825 adUnit code based refresh times out without setting targets', () => {
  describe('Given a page with five ad slots has loaded and the auction is finished', () => {

    before(() => {
      pbjsBackup = $$PREBID_GLOBAL$$;

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

      resetPrebid();

      adapters.forEach(adapter => {
        adaptermanager.bidderRegistry[[adapter.bidder]] = { callBids: adapter.callBids };
      });
    });

    after(() => {
      window.$$PREBID_GLOBAL$$ = pbjsBackup;
    });

    describe('When the first auction completes', () => {
      it('Then there will be correct number of bidder requests', () => {
        var clock = sinon.useFakeTimers();
        $$PREBID_GLOBAL$$.requestBids(makeRequest({ adUnits }));
        equal($$PREBID_GLOBAL$$._bidsRequested.length, 3, 'there are three bidder requests');
        $$PREBID_GLOBAL$$.requestBids(makeRequest({ adUnits: [adUnits[0]] }));
        clock.tick($$PREBID_GLOBAL$$.bidderTimeout + 10000);
        equal($$PREBID_GLOBAL$$._bidsRequested.length, 1, 'there is now only one bidder request');
        clock.restore();
      });
    });
  });
});
