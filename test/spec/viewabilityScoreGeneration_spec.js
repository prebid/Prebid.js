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

  describe('configuration', function() {
    const sandbox = sinon.sandbox.create();

    afterEach(function() {
      sandbox.restore();
    });

    it('should not load the module if it is not enabled in the config', function() {
      const setGptEventHandlersSpy = sandbox.spy(viewabilityScoreGeneration, 'setGptEventHandlers');
      const setViewabilityTargetingKeysSpy = sandbox.spy(viewabilityScoreGeneration, 'setViewabilityTargetingKeys');

      viewabilityScoreGeneration.init(setGptEventHandlersSpy, setViewabilityTargetingKeysSpy);
      sinon.assert.notCalled(setGptEventHandlersSpy);
    });

    it('should utlize the viewability targeting feature if enabled', function() {
      const setGptEventHandlersSpy = sandbox.spy(viewabilityScoreGeneration, 'setGptEventHandlers');
      const setViewabilityTargetingKeysSpy = sandbox.spy(viewabilityScoreGeneration, 'setViewabilityTargetingKeys');

      viewabilityScoreGeneration.init(setGptEventHandlersSpy, setViewabilityTargetingKeysSpy);
      config.setConfig({
        viewabilityScoreGeneration: {
          enabled: true,
          targeting: {
            enabled: true
          }
        }
      });
      sinon.assert.calledOnce(setGptEventHandlersSpy);
      sinon.assert.calledOnce(setViewabilityTargetingKeysSpy);
    });

    it('should not utilize the viewability targeting feature if not enabled', function() {
      const setGptEventHandlersSpy = sandbox.spy(viewabilityScoreGeneration, 'setGptEventHandlers');
      const setViewabilityTargetingKeysSpy = sandbox.spy(viewabilityScoreGeneration, 'setViewabilityTargetingKeys');

      viewabilityScoreGeneration.init(setGptEventHandlersSpy, setViewabilityTargetingKeysSpy);
      config.setConfig({
        viewabilityScoreGeneration: {
          enabled: true
        }
      });
      sinon.assert.calledOnce(setGptEventHandlersSpy);
      sinon.assert.notCalled(setViewabilityTargetingKeysSpy);
    });
  });

  describe('targeting', function() {
    const sandbox = sinon.sandbox.create();

    afterEach(function() {
      sandbox.restore();
    });

    it('should append key/value pairings correctly', function() {
      const updateGptWithViewabilityTargetingSpy = sandbox.spy(viewabilityScoreGeneration, 'updateGptWithViewabilityTargeting');

      const config = {
        'viewabilityScoreGeneration': {
          'enabled': true,
          'targeting': {
            'enabled': true,
            'score': false, // setting to false will omit sending the score K/V to GAM
            'scoreKey': 'some-custom-key-name',
            'bucket': true,
            'bucketKey': 'custom-key-name-for-bucket', // some-other-custom-key-name is the custom key name, since the line above is commented out, the default key name of bidViewabilityBucket should be used
            'bucketCategories': ['VERY LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY HIGH'] // should create bucket category ranges automatically based on the number of string items in the bucketCategories array
          }
        }
      };

      const targetingSet = {
        'ad-slot-id-1': {
          'hb_format': 'banner',
          'hb_bidder': 'rubicon'
        },
        'ad-slot-id-2': {
          'hb_format': 'banner',
          'hb_bidder': 'pubmatic'
        },
        'ad-slot-id-3': {
          'hb_format': 'banner',
          'hb_bidder': 'rubicon'
        }
      };

      const vsgLocalStorageObj = {
        'ad-slot-id-1': {
          'rendered': 49,
          'viewed': 30,
          'createdAt': 1666030591160,
          'totalViewTime': 20275,
          'updatedAt': 1666389968134,
          'lastViewed': 2322.699999988079
        },
        'ad-slot-id-2': {
          'rendered': 49,
          'viewed': 40,
          'createdAt': 1666030591179,
          'updatedAt': 1666389967741,
          'totalViewTime': 48674,
          'lastViewed': 1932.5
        },
        'ad-slot-id-3': {
          'rendered': 49,
          'viewed': 10,
          'createdAt': 1666030591231,
          'updatedAt': 1666389967796,
          'totalViewTime': 48658,
          'lastViewed': 1988
        }
      }

      const result = {
        'ad-slot-id-1': {
          'custom-key-name-for-bucket': 'MEDIUM',
          'hb_bidder': 'rubicon',
          'hb_format': 'banner'
        },
        'ad-slot-id-2': {
          'custom-key-name-for-bucket': 'HIGH',
          'hb_bidder': 'pubmatic',
          'hb_format': 'banner'
        },
        'ad-slot-id-3': {
          'custom-key-name-for-bucket': 'VERY LOW',
          'hb_bidder': 'rubicon',
          'hb_format': 'banner'
        }
      };

      viewabilityScoreGeneration.addViewabilityTargeting(config, targetingSet, vsgLocalStorageObj, updateGptWithViewabilityTargetingSpy);
      sinon.assert.calledOnce(updateGptWithViewabilityTargetingSpy); // make sure this func is called only once so that relative gpt ad slots are update only once
      const spyCall = updateGptWithViewabilityTargetingSpy.getCall(0);
      expect(spyCall.args[0]).to.deep.equal(result);
    });
  });
});
