import { equal } from 'assert';

import faker from 'faker';
import { makeAdUnit, makeBidder, makePlacement, makeRequest } from './faker/fixtures';
import adaptermanager from 'src/adaptermanager';

function resetPrebid() {
  delete window.$$PREBID_GLOBAL$$;
  require('src/prebid');
}

// let clock;
let adUnits;
let adapters;

describe(`Feature: placement groups / dynamic divs`, () => {
  describe(`Given a page with two placements, three bidders and one ad unit
    and given the placements have the same adUnitCode and sizes`, () => {

      beforeEach(function() {
        const code = `/ad-slot/${faker.address.zipCode()}`;
        const sizes = [[300, 250], [300, 600]];
        adapters = [
            makeBidder(),
            makeBidder(),
            makeBidder(),
          ];
        adUnits = [
          makeAdUnit({ code, bids: adapters })
        ];

        makePlacement({ code, sizes });
        makePlacement({ code, sizes });

        // clock = sinon.useFakeTimers();
      });

      describe(`When a request for bids is made`, () => {
        it(`Then`, () => {
          resetPrebid();
          adapters.forEach(adapter => {
            adaptermanager.bidderRegistry[[adapter.bidder]] = { callBids: adapter.callBids };
          });

          $$PREBID_GLOBAL$$.requestBids(makeRequest({ adUnits }));

          adapters.map(adapter => {
            return equal(adaptermanager.bidderRegistry[[adapter.bidder]]
              .callBids.args[0][0].bids.length, 2, 'bidder request should contain 2 bids');
          });
        });
      });
    });
});
