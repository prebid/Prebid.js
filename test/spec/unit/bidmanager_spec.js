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
    /**
     * Add the bidResponse fixture as a bid into the auction, and run some assertions
     * to verify:
     *
     * 1. Whether or not that bid got added.
     * 2. Whether or not the "end of auction" callbacks got called.
     */
    function testAddVideoBid(expectBidAdded, expectCallbackCalled, videoCacheStubProvider) {
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

        const storeStub = videoCacheStubProvider().store;
        expect(storeStub.calledOnce).to.equal(true);
        expect(storeStub.getCall(0).args[0][0]).to.equal(mockResponse);

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

    /**
     * Initialize the global state so that the auction-space looks like we want it to.
     *
     * @param {Array} adUnits The array of ad units which should appear in this auction.
     * @param {function} bidRequestTweaker A function which accepts a basic bidRequest, and
     *   transforms it to prepare it for auction.
     */
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

    function auctionStart(timedOut) {
      return timedOut
        ? new Date().getTime() - $$PREBID_GLOBAL$$.cbTimeout - $$PREBID_GLOBAL$$.timeoutBuffer - 1
        : new Date().getTime();
    }

    describe('when the cache is functioning properly', () => {
      let stubProvider = useVideoCacheStubs({
        store: [{ uuid: 'FAKE_UUID' }],
      });

      describe('when more bids are expected after this one', () => {
        // Set up the global state so that we expect two bids, and the auction started just now
        // (so as to reduce the chance of timeout. This assumes that the unit test runs run in < 5000 ms).
        prepAuction(
          [adUnit, Object.assign({}, adUnit, { code: 'video2' })],
          (bidRequest) => {
            const tweakedBidRequestBid = Object.assign({}, bidRequest.bids[0], { placementCode: 'video2' });
            bidRequest.bids.push(tweakedBidRequestBid);
            bidRequest.start = auctionStart(false);
          });

        it("should add video bids, but shouldn't call the end-of-auction callbacks yet",
          testAddVideoBid(true, false, stubProvider));
      });

      describe('when this is the last bid expected in the auction', () => {
        // Set up the global state so that we expect only one bid, and the auction started just now
        // (so as to reduce the chance of timeout. This assumes that the unit test runs run in < 5000 ms).
        prepAuction([adUnit], (bidRequest) => bidRequest.start = auctionStart(false));

        it("shouldn't add invalid bids", () => {
          bidManager.addBidResponse('', { });
          bidManager.addBidResponse('testCode', { mediaType: 'video' });
          bidManager.addBidResponse('testCode', { mediaType: 'native' });
          expect($$PREBID_GLOBAL$$._bidsReceived.length).to.equal(0);
        });

        it('should add valid video bids and then execute the callbacks signaling the end of the auction',
          testAddVideoBid(true, true, stubProvider));
      });

      describe('when the auction has timed out', () => {
        // Set up the global state to expect two bids, and mock an auction which happened long enough
        // in the past that it will *seem* like this bid is arriving after the timeouts.
        prepAuction(
          [adUnit, Object.assign({}, adUnit, { code: 'video2' })],
          (bidRequest) => {
            const tweakedBidRequestBid = Object.assign({}, bidRequest.bids[0], { placementCode: 'video2' });
            bidRequest.bids.push(tweakedBidRequestBid);
            bidRequest.start = auctionStart(true);
          });

        // Because of the preconditions, this makes sure that the end-of-auction callbacks get called when
        // the auction hits the timeout.
        it('should add the bid, but also execute the callbacks signaling the end of the auction',
          testAddVideoBid(true, true, stubProvider));
      });
    });

    describe('when the cache is failing for some reason,', () => {
      let stubProvider = useVideoCacheStubs({
        store: new Error('Unable to save to the cache'),
      });

      describe('when the auction still has time left', () => {
        prepAuction([adUnit], (bidRequest) => bidRequest.start = auctionStart(false));

        it("shouldn't add the bid to the auction, and shouldn't execute the end-of-auction callbacks",
          testAddVideoBid(false, false, stubProvider));
      });

      describe('when the auction has timed out', () => {
        prepAuction([adUnit], (bidRequest) => bidRequest.start = auctionStart(true));
        it("shouldn't add the bid to the auction, but should execute the end-of-auction callbacks",
          testAddVideoBid(false, true, stubProvider));
      })
    });
  });
});
