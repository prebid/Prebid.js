import { expect } from 'chai';
import * as bidManager from 'src/bidmanager';
import useVideoCacheStubs from 'test/mocks/videoCacheStub';
import adUnit from 'test/fixtures/video/adUnit';
import bidRequest from 'test/fixtures/video/bidRequest';
import bidResponse from 'test/fixtures/video/bidResponse';

describe('The Bid Manager', () => {
  before(() => {
    $$PREBID_GLOBAL$$.cbTimeout = 5000;
    $$PREBID_GLOBAL$$.timeoutBuffer = 50;
  });

  describe('addBidResponse() function,', () => {
    useVideoCacheStubs({
      store: [{ cacheId: 'FAKE_UUID' }],
    });

    /**
     * Add the bidResponse fixture as a bid into the auction, and run some assertions
     * to verify:
     *
     * 1. Whether or not that bid got added.
     * 2. Whether or not the "end of auction" callbacks got called.
     */
    function testAddVideoBid(expectBidAdded, expectCallbackCalled) {
      return function() {
        const mockResponse = Object.assign({}, bidResponse);
        const callback = sinon.spy();
        bidManager.addOneTimeCallback(callback);

        mockResponse.getSize = function() {
          return `${this.height}x${this.width}`;
        };
        bidManager.addBidResponse(adUnit.code, mockResponse);

        const expectedBidsReceived = expectBidAdded ? 1 : 0;
        expect($$PREBID_GLOBAL$$._bidsReceived.length).to.equal(expectedBidsReceived);

        if (expectedBidsReceived === 1) {
          const bid = $$PREBID_GLOBAL$$._bidsReceived[0];
          expect(bid.vastUrl).to.equal('www.myVastUrl.com');
          expect(bid.videoCacheKey).to.equal('FAKE_UUID');
        }
        if (expectCallbackCalled) {
          expect(callback.calledOnce).to.equal(true);
        } else {
          expect(callback.called).to.equal(false);
        }
      };
    }

    function prepAuction(adUnits, bidRequestTweaker) {
      beforeEach(() => {
        let thisBidRequest = bidRequest;
        if (bidRequestTweaker) {
          thisBidRequest = JSON.parse(JSON.stringify(bidRequest));
          bidRequestTweaker(thisBidRequest);
        }

        $$PREBID_GLOBAL$$.adUnits = adUnits;
        $$PREBID_GLOBAL$$._bidsRequested = [thisBidRequest];
        $$PREBID_GLOBAL$$._bidsReceived = [];
        $$PREBID_GLOBAL$$._adUnitCodes = $$PREBID_GLOBAL$$.adUnits.map(unit => unit.code);
      });
    }

    describe('when more bids are expected after this one', () => {
      // Set up the global state so that we expect two bids, and the auction started just now
      // (so as to reduce the chance of timeout. This assumes that the unit test runs run in < 5000 ms).
      prepAuction(
        [adUnit, Object.assign({}, adUnit, { code: 'video2' })],
        (bidRequest) => {
          const tweakedBidRequestBid = Object.assign({}, bidRequest.bids[0], { placementCode: 'video2' });
          bidRequest.bids.push(tweakedBidRequestBid);
          bidRequest.start = new Date().getTime();
        });

      it('should add video bids, but *not* call the end-of-auction callbacks', testAddVideoBid(true, false));
    });

    describe('when this is the last bid expected in the auction', () => {
      // Set up the global state so that we expect only one bid, and the auction started just now
      // (so as to reduce the chance of timeout. This assumes that the unit test runs run in < 5000 ms).
      prepAuction([adUnit], (bidRequest) => bidRequest.start = new Date().getTime());

      it("shouldn't add invalid bids", () => {
        bidManager.addBidResponse('', { });
        bidManager.addBidResponse('testCode', { mediaType: 'video' });
        bidManager.addBidResponse('testCode', { mediaType: 'native' });
        expect($$PREBID_GLOBAL$$._bidsReceived.length).to.equal(0);
      });

      it('should add valid video bids and then execute the callbacks signaling the end of the auction',
         testAddVideoBid(true, true));
    });

    describe('when the auction has timed out', () => {
      // Set up the global state to expect two bids, and mock an auction which happened long enough
      // in the past that it will *seem* like this bid is arriving after the timeouts.
      prepAuction(
        [adUnit, Object.assign({}, adUnit, { code: 'video2' })],
        (bidRequest) => {
          const tweakedBidRequestBid = Object.assign({}, bidRequest.bids[0], { placementCode: 'video2' });
          bidRequest.bids.push(tweakedBidRequestBid);
          bidRequest.start = new Date().getTime() - $$PREBID_GLOBAL$$.cbTimeout - $$PREBID_GLOBAL$$.timeoutBuffer - 1;
        });

      // Because of the preconditions, this makes sure that the end-of-auction callbacks get called when
      // the auction hits the timeout.
      it('should add the bid, but also execute the callbacks signaling the end of the auction',
         testAddVideoBid(true, true));
    })
  });
});
