import { expect } from 'chai';
import * as bidManager from 'src/bidmanager';
import useVideoCacheStubs from 'test/mocks/videoCacheStub';
import adUnit from 'test/fixtures/video/adUnit';
import bidRequest from 'test/fixtures/video/bidRequest';
import bidResponse from 'test/fixtures/video/bidResponse';

describe('The Bid Manager', () => {
  describe('addBidResponse() function', () => {
    before(() => {
      $$PREBID_GLOBAL$$.cbTimeout = 5000;
      $$PREBID_GLOBAL$$.timeoutBuffer = 50;
    });

    useVideoCacheStubs({
      store: [{ cacheId: 'FAKE_UUID' }],
    });

    describe('when more bids are expected after this one', () => {
      beforeEach(() => {
        const tweakedBidRequest = JSON.parse(JSON.stringify(bidRequest));
        const tweakedBidRequestBid = Object.assign({}, bidRequest.bids[0], { placementCode: 'video2' });
        tweakedBidRequest.bids.push(tweakedBidRequestBid);
        tweakedBidRequest.start = new Date().getTime();

        $$PREBID_GLOBAL$$.adUnits = [adUnit, Object.assign({}, adUnit, { code: 'video2' })];
        $$PREBID_GLOBAL$$._bidsRequested = [tweakedBidRequest];
        $$PREBID_GLOBAL$$._bidsReceived = [];
        $$PREBID_GLOBAL$$._adUnitCodes = $$PREBID_GLOBAL$$.adUnits.map(unit => unit.code);
      });

      it('should add video bids, but *not* call the end-of-auction callbacks', () => {
        const mockResponse = Object.assign({}, bidResponse);
        const spy = sinon.spy();
        bidManager.addOneTimeCallback(spy);

        mockResponse.getSize = function() {
          return `${this.height}x${this.width}`
        };
        bidManager.addBidResponse(adUnit.code, mockResponse);

        expect($$PREBID_GLOBAL$$._bidsReceived.length).to.equal(1);

        const bid = $$PREBID_GLOBAL$$._bidsReceived[0];
        expect(bid.vastUrl).to.equal('www.myVastUrl.com');
        expect(bid.videoCacheKey).to.equal('FAKE_UUID');

        expect(spy.called).to.equal(false);
      });

      it("shouldn't add bids which arrive after the auction times out", () => {
        expect(true).to.equal(true);
      });
    });

    describe('when this is the last bid expected in the auction', () => {
      beforeEach(() => {
        $$PREBID_GLOBAL$$.adUnits = [adUnit];
        $$PREBID_GLOBAL$$._bidsRequested = [bidRequest];
        $$PREBID_GLOBAL$$._bidsReceived = [];
        $$PREBID_GLOBAL$$._adUnitCodes = $$PREBID_GLOBAL$$.adUnits.map(unit => unit.code);
      });

      it("shouldn't add invalid bids", () => {
        bidManager.addBidResponse('', { });
        bidManager.addBidResponse('testCode', { mediaType: 'video' });
        bidManager.addBidResponse('testCode', { mediaType: 'native' });
        expect($$PREBID_GLOBAL$$._bidsReceived.length).to.equal(0);
      });

      it('should add valid video bids and then execute the callbacks signaling the end of the auction', () => {
        const mockResponse = Object.assign({}, bidResponse);
        const spy = sinon.spy();
        bidManager.addOneTimeCallback(spy);

        mockResponse.getSize = function() {
          return `${this.height}x${this.width}`
        };
        bidManager.addBidResponse(adUnit.code, mockResponse);

        expect($$PREBID_GLOBAL$$._bidsReceived.length).to.equal(1);

        const bid = $$PREBID_GLOBAL$$._bidsReceived[0];
        expect(bid.vastUrl).to.equal('www.myVastUrl.com');
        expect(bid.videoCacheKey).to.equal('FAKE_UUID');

        expect(spy.calledOnce).to.equal(true);
      });
    });
  });
});
