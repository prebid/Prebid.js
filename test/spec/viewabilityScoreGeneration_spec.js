import * as viewabilityScoreGeneration from 'modules/viewabilityScoreGeneration.js';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { config } from 'src/config.js';

const bidderRequests = [
  {
    'bidderCode': 'publisher 1',
    'bids': [
      {
        'bidder': 'publisher 1',
        'adUnitCode': 'someElementIdName'
      }
    ]
  },
  {
    'bidderCode': 'publisher 2',
    'bids': [
      {
        'bidder': 'publisher 2',
        'adUnitCode': 'someElementIdName'
      }
    ]
  },
  {
    'bidderCode': 'publisher 3',
    'bids': [
      {
        'bidder': 'publisher 3',
        'adUnitCode': 'someElementIdName'
      }
    ]
  }
];

describe('viewabilityScoreGeneration', function() {
  describe('local storage', function() {
    const sandbox = sinon.sandbox.create();

    afterEach(function() {
      sandbox.restore();
    });

    it('should set viewability data on adslot render events in local storage', function() {
      const setAndStringifyToLocalStorageSpy = sandbox.spy(viewabilityScoreGeneration, 'setAndStringifyToLocalStorage');
      const adSlotElementId = 'someElementIdNameForRenderEvent';
      viewabilityScoreGeneration.gptSlotRenderEndedHandler(adSlotElementId, setAndStringifyToLocalStorageSpy);
      const spyCall1 = setAndStringifyToLocalStorageSpy.getCall(0);

      // should create viewability-data key in local storage if it doesnt already exist
      // should create a key on viewability-data with element id name and have the value be an object with rendered = 1 and viewed = 0
      sinon.assert.calledOnce(setAndStringifyToLocalStorageSpy);
      expect(spyCall1.args[0]).to.equal('viewability-data');
      expect(spyCall1.args[1]['someElementIdNameForRenderEvent'].rendered).to.equal(1);
      expect(spyCall1.args[1]['someElementIdNameForRenderEvent'].viewed).to.equal(0);

      viewabilityScoreGeneration.gptSlotRenderEndedHandler(adSlotElementId, setAndStringifyToLocalStorageSpy);
      const spyCall2 = setAndStringifyToLocalStorageSpy.getCall(1);

      // should increment the rendered key by 1 for a specific adslot if the adslot key already exists in the viewability-data object in local storage
      sinon.assert.calledTwice(setAndStringifyToLocalStorageSpy);
      expect(spyCall2.args[1]['someElementIdNameForRenderEvent'].rendered).to.equal(2);
      expect(spyCall2.args[1]['someElementIdNameForRenderEvent'].viewed).to.equal(0);
    });

    it('should set viewability data on adslot view events in local storage', function() {
      const setAndStringifyToLocalStorageSpy = sandbox.spy(viewabilityScoreGeneration, 'setAndStringifyToLocalStorage');
      const adSlotElementId = 'someElementIdNameForViewEvent';
      viewabilityScoreGeneration.gptImpressionViewableHandler(adSlotElementId, setAndStringifyToLocalStorageSpy);
      const spyCall1 = setAndStringifyToLocalStorageSpy.getCall(0);

      // should create viewability-data key in local storage if it doesnt already exist
      // should create a key on viewability-data with element id name and have the value be an object with rendered = 0 and viewed = 1
      sinon.assert.calledOnce(setAndStringifyToLocalStorageSpy);
      expect(spyCall1.args[0]).to.equal('viewability-data');
      expect(spyCall1.args[1]['someElementIdNameForViewEvent'].rendered).to.equal(0);
      expect(spyCall1.args[1]['someElementIdNameForViewEvent'].viewed).to.equal(1);

      viewabilityScoreGeneration.gptImpressionViewableHandler(adSlotElementId, setAndStringifyToLocalStorageSpy);
      const spyCall2 = setAndStringifyToLocalStorageSpy.getCall(1);

      // should increment the viewed key by 1 for a specific adslot if the adslot key already exists in the viewability-data object in local storage
      sinon.assert.calledTwice(setAndStringifyToLocalStorageSpy);
      expect(spyCall2.args[1]['someElementIdNameForViewEvent'].rendered).to.equal(0);
      expect(spyCall2.args[1]['someElementIdNameForViewEvent'].viewed).to.equal(2);
    });

    it('should set the totalViewTime and lastViewed keys in local storage correctly for each adunit', function() {
      const setAndStringifyToLocalStorageSpy = sandbox.spy(viewabilityScoreGeneration, 'setAndStringifyToLocalStorage');
      const adSlotElementId = 'someElementIdNameForVisibilityChangeEvent';
      viewabilityScoreGeneration.gptSlotVisibilityChangedHandler(adSlotElementId, 49, setAndStringifyToLocalStorageSpy);

      // only update local storage about dwell time for an ad if the ad is at least 50% viewable in the viewport
      sinon.assert.notCalled(setAndStringifyToLocalStorageSpy);

      viewabilityScoreGeneration.gptSlotRenderEndedHandler(adSlotElementId, setAndStringifyToLocalStorageSpy);
      viewabilityScoreGeneration.gptImpressionViewableHandler(adSlotElementId, setAndStringifyToLocalStorageSpy);
      viewabilityScoreGeneration.gptSlotVisibilityChangedHandler(adSlotElementId, 51, setAndStringifyToLocalStorageSpy);
      const spyCall3 = setAndStringifyToLocalStorageSpy.getCall(2);
      sinon.assert.callCount(setAndStringifyToLocalStorageSpy, 3);

      // the lastViewed key should be updated each time an ad is at least 50% visible in the viewport
      expect(spyCall3.args[1][adSlotElementId].lastViewed).to.be.ok;

      viewabilityScoreGeneration.gptSlotVisibilityChangedHandler(adSlotElementId, 51, setAndStringifyToLocalStorageSpy);
      const spyCall4 = setAndStringifyToLocalStorageSpy.getCall(3);

      // the totalViewTime key should be updated each time an ad is at least 50% visible in the viewport after it has been viewed at least twice
      expect(spyCall4.args[1][adSlotElementId].totalViewTime).to.be.below(spyCall4.args[1][adSlotElementId].lastViewed);
    });
  });

  describe('bidder requests', function() {
    it('should add the bidViewability key onto all bidder requests', function() {
      const adSlotElementId = 'someElementIdName';
      const fakeCb = () => {};
      viewabilityScoreGeneration.gptSlotRenderEndedHandler(adSlotElementId, fakeCb);
      viewabilityScoreGeneration.makeBidRequestsHook(fakeCb, bidderRequests);
      expect(bidderRequests[0].bids[0].bidViewability).to.be.ok;
      expect(bidderRequests[1].bids[0].bidViewability).to.be.ok;
      expect(bidderRequests[2].bids[0].bidViewability).to.be.ok;
    });
  });
});
