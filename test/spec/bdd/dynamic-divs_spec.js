import { ok, deepEqual } from 'assert';

// import sinon from 'sinon';
import faker from 'faker';
import { makeAdUnit, makeBidder, makePlacement } from './faker/fixtures';

import prebid from 'src/prebid';

// import bidmanager from 'src/bidmanager';
import adaptermanager from 'src/adaptermanager';

let clock;
let adUnits;
let adapters;

describe(`Feature: placement groups / dynamic divs`, () => {
  describe(`Given a page with two placements, three bidders and one ad unit
    and given the placements have the same adUnitCode and sizes`, () => {

      beforeEach(function() {
        const code = `/ad-slot/${faker.address.zipCode()}`;
        adapters = [
            makeBidder(),
            makeBidder(),
            makeBidder(),
          ];
        adUnits = [
          makeAdUnit({ code, bids: adapters })
        ];

        makePlacement({ code });
        makePlacement({ code });

        clock = sinon.useFakeTimers();
      });

      describe(`When a request for bids is made`, () => {
        it(`Then`, () => {
          var requestObj = {
            adUnits,
            bidsBackHandler: sinon.spy(),
            timeout: 2000
          };
          adapters.forEach(adapter => {
            adaptermanager.bidderRegistry[[adapter.bidder]] = { callBids: adapter.callBids };
          });

          // var spyCallBids = sinon.spy($$PREBID_GLOBAL$$, 'callBids');

          $$PREBID_GLOBAL$$.requestBids(requestObj);
          clock.tick(requestObj.timeout);
          ok(spyCallBids.called, 'callBids called wants the bids back');
          deepEqual($$PREBID_GLOBAL$$._bidsRequested, {});

          deepEqual($$PREBID_GLOBAL$$._bidsRequested, {}, `the two placements will have the same Prebid targeting except for hb_adid and hb_pb`);
          deepEqual($$PREBID_GLOBAL$$._bidsReceived, {}, `the bidResponses used to render the ad for the two placements are unique`);
        });
      });
    });
});
