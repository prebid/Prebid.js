import * as viewabilityScoreGeneration from 'modules/viewabilityScoreGeneration.js';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { config } from 'src/config.js';
import { makeSlot } from './integration/faker/googletag.js';

const testSlots = [
  makeSlot({ code: 'slotCode1', divId: 'div1' })
];

const bidderRequests = [
  {
    'bidderCode': 'publisher 1',
    'bids': [
      {
        'bidder': 'publisher 1',
        'adUnitCode': 'someElementIdName',
        'sizes': [[728, 90]]
      }
    ]
  },
  {
    'bidderCode': 'publisher 2',
    'bids': [
      {
        'bidder': 'publisher 2',
        'adUnitCode': 'someElementIdName',
        'sizes': [[728, 90]]
      }
    ]
  },
  {
    'bidderCode': 'publisher 3',
    'bids': [
      {
        'bidder': 'publisher 3',
        'adUnitCode': 'someElementIdName',
        'sizes': [[728, 90]]
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

    it('should set viewability data on adslot render and view events (by ad element id, size and domain) in local storage', function() {
      const setAndStringifyToLocalStorageSpy = sandbox.spy(viewabilityScoreGeneration, 'setAndStringifyToLocalStorage');
      const adSlotElementId = 'someElementIdNameForViewEvent';
      const adSlotSizeFromRender = '728x90';
      // gpt returns slot sizes differently with respect to render, view and visibility events
      const adSlotSizesFromView = [{width: 728, height: 90}];
      const adDomain = 'pubmatic.com';
      viewabilityScoreGeneration.gptSlotRenderEndedHandler(adSlotElementId, adSlotSizeFromRender, adDomain, setAndStringifyToLocalStorageSpy);
      viewabilityScoreGeneration.gptImpressionViewableHandler(adSlotElementId, adSlotSizesFromView, adDomain, setAndStringifyToLocalStorageSpy);
      const spyCall1 = setAndStringifyToLocalStorageSpy.getCall(0);

      // should create viewability-data key in local storage if it doesnt already exist
      // should create a key on viewability-data with element id name and have the value be an object with rendered = 0 and viewed = 1
      sinon.assert.callCount(setAndStringifyToLocalStorageSpy, 2);
      expect(spyCall1.args[0]).to.equal('viewability-data');
      expect(spyCall1.args[1]['someElementIdNameForViewEvent'].rendered).to.equal(1);
      expect(spyCall1.args[1]['someElementIdNameForViewEvent'].viewed).to.equal(1);
      expect(spyCall1.args[1]['728x90'].rendered).to.equal(1);
      expect(spyCall1.args[1]['pubmatic.com'].rendered).to.equal(1);
      expect(spyCall1.args[1]['pubmatic.com'].viewed).to.equal(1);

      viewabilityScoreGeneration.gptSlotRenderEndedHandler(adSlotElementId, adSlotSizeFromRender, adDomain, setAndStringifyToLocalStorageSpy);
      viewabilityScoreGeneration.gptImpressionViewableHandler(adSlotElementId, adSlotSizesFromView, adDomain, setAndStringifyToLocalStorageSpy);
      const spyCall2 = setAndStringifyToLocalStorageSpy.getCall(1);

      // should increment the viewed key by 1 for a specific adslot if the adslot key already exists in the viewability-data object in local storage
      sinon.assert.callCount(setAndStringifyToLocalStorageSpy, 4);
      expect(spyCall2.args[1]['someElementIdNameForViewEvent'].rendered).to.equal(2);
      expect(spyCall2.args[1]['someElementIdNameForViewEvent'].viewed).to.equal(2);
      expect(spyCall1.args[1]['728x90'].rendered).to.equal(2);
      expect(spyCall1.args[1]['pubmatic.com'].rendered).to.equal(2);
      expect(spyCall1.args[1]['pubmatic.com'].viewed).to.equal(2);
    });

    it('should set the totalViewTime and lastViewStarted keys in local storage correctly for each adunit (by ad element id, size and domain)', function() {
      const setAndStringifyToLocalStorageSpy = sandbox.spy(viewabilityScoreGeneration, 'setAndStringifyToLocalStorage');
      const adSlotElementId = 'someElementIdNameForVisibilityChangeEvent';
      const adSlotSizeFromRender = '728x90';
      // gpt returns slot sizes differently with respect to render, view and visibility events
      const adSlotSizesFromView = [{width: 728, height: 90}];
      const adDomain = 'pubmatic.com';

      viewabilityScoreGeneration.gptSlotRenderEndedHandler(adSlotElementId, adSlotSizeFromRender, adDomain, setAndStringifyToLocalStorageSpy);
      viewabilityScoreGeneration.gptSlotVisibilityChangedHandler(adSlotElementId, adSlotSizesFromView, adDomain, 49, setAndStringifyToLocalStorageSpy);

      // only update local storage about dwell time for an ad if the ad is at least 50% viewable in the viewport
      sinon.assert.callCount(setAndStringifyToLocalStorageSpy, 1);

      viewabilityScoreGeneration.gptSlotRenderEndedHandler(adSlotElementId, adSlotSizeFromRender, adDomain, setAndStringifyToLocalStorageSpy);
      viewabilityScoreGeneration.gptImpressionViewableHandler(adSlotElementId, adSlotSizesFromView, adDomain, setAndStringifyToLocalStorageSpy);
      viewabilityScoreGeneration.gptSlotVisibilityChangedHandler(adSlotElementId, adSlotSizesFromView, adDomain, 51, setAndStringifyToLocalStorageSpy);
      let lastSpyCall = setAndStringifyToLocalStorageSpy.lastCall;

      sinon.assert.callCount(setAndStringifyToLocalStorageSpy, 5);

      // the lastViewStarted key should be updated each time an ad is at least 50% visible in the viewport
      expect(lastSpyCall.args[1][adSlotElementId].lastViewStarted).to.be.ok;
      expect(lastSpyCall.args[1][adDomain].lastViewStarted).to.be.ok;

      viewabilityScoreGeneration.gptSlotVisibilityChangedHandler(adSlotElementId, adSlotSizesFromView, adDomain, 51, setAndStringifyToLocalStorageSpy);
      lastSpyCall = setAndStringifyToLocalStorageSpy.lastCall;

      // the totalViewTime key should be updated each time an ad is at least 50% visible in the viewport after it has been viewed at least twice
      expect(lastSpyCall.args[1][adSlotElementId].totalViewTime).to.be.below(lastSpyCall.args[1][adSlotElementId].lastViewStarted);
      expect(lastSpyCall.args[1][adDomain].totalViewTime).to.be.below(lastSpyCall.args[1][adDomain].lastViewStarted);
    });

    it('should check if the TOTAL_VIEW_TIME_LIMIT was exceeded and if so divide render, view and total view time counts by the proper number)', function() {
      const lsObj = {
        someAdSlotElementIdName: {
          rendered: 9,
          viewed: 7,
          createdAt: 1677192128860,
          updatedAt: 1677193274595,
          totalViewTime: 1000000000,
          lastViewStarted: 1677193300470
        }
      };
      const currentTime = Date.now();
      const lastViewStarted = lsObj.someAdSlotElementIdName.lastViewStarted;

      viewabilityScoreGeneration.updateTotalViewTime(undefined, currentTime, lastViewStarted, 'someAdSlotElementIdName', lsObj);

      expect(lsObj.someAdSlotElementIdName.rendered).to.equal(5);
      expect(lsObj.someAdSlotElementIdName.viewed).to.equal(4);
      expect(lsObj.someAdSlotElementIdName.totalViewTime).to.equal(500000000);
    });
  });

  describe('bidder requests', function() {
    it('should add the bidViewability key onto all bidder requests', function() {
      config.setConfig({
        viewabilityScoreGeneration: {
          enabled: true
        }
      });
      const adSlotElementId = 'someElementIdName';
      const adSlotSizeFromRender = '728x90';
      // gpt returns slot sizes differently with respect to render, view and visibility events
      const adSlotSizesFromView = [{width: 728, height: 90}];
      const adDomain = 'pubmatic.com';
      const fakeCb = () => {};
      viewabilityScoreGeneration.gptSlotRenderEndedHandler(adSlotElementId, adSlotSizeFromRender, adDomain, fakeCb);
      viewabilityScoreGeneration.gptImpressionViewableHandler(adSlotElementId, adSlotSizesFromView, adDomain, fakeCb);
      viewabilityScoreGeneration.gptSlotVisibilityChangedHandler(adSlotElementId, adSlotSizesFromView, adDomain, 51, fakeCb);
      viewabilityScoreGeneration.makeBidRequestsHook(fakeCb, bidderRequests, adDomain);

      expect(bidderRequests[0].bids[0].bidViewability).to.be.ok;
      expect(bidderRequests[0].bids[0].bidViewability.lastViewStarted).to.equal(undefined);
      expect(bidderRequests[0].bids[0].bidViewability.hasOwnProperty('adSizes')).to.equal(true);
      expect(bidderRequests[0].bids[0].bidViewability.hasOwnProperty('adUnit')).to.equal(true);

      expect(bidderRequests[1].bids[0].bidViewability).to.be.ok;
      expect(bidderRequests[1].bids[0].bidViewability.lastViewStarted).to.equal(undefined);
      expect(bidderRequests[1].bids[0].bidViewability.hasOwnProperty('adSizes')).to.equal(true);
      expect(bidderRequests[1].bids[0].bidViewability.hasOwnProperty('adUnit')).to.equal(true);

      expect(bidderRequests[2].bids[0].bidViewability).to.be.ok;
      expect(bidderRequests[2].bids[0].bidViewability.lastViewStarted).to.equal(undefined);
      expect(bidderRequests[2].bids[0].bidViewability.hasOwnProperty('adSizes')).to.equal(true);
      expect(bidderRequests[2].bids[0].bidViewability.hasOwnProperty('adUnit')).to.equal(true);
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
            'score': true, // setting to false will omit sending the score K/V to GAM
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
          'some-custom-key-name': 0.6
        },
        'ad-slot-id-2': {
          'custom-key-name-for-bucket': 'HIGH',
          'some-custom-key-name': 0.8
        },
        'ad-slot-id-3': {
          'custom-key-name-for-bucket': 'VERY LOW',
          'some-custom-key-name': 0.2
        }
      };
	  window.googletag.pubads().setSlots(testSlots);
      viewabilityScoreGeneration.addViewabilityTargeting(config, targetingSet, vsgLocalStorageObj, updateGptWithViewabilityTargetingSpy);
      sinon.assert.calledOnce(updateGptWithViewabilityTargetingSpy); // make sure this func is called only once so that relative gpt ad slots are update only once
      const spyCall = updateGptWithViewabilityTargetingSpy.getCall(0);
      expect(spyCall.args[0]).to.deep.equal(result);
    });
  });
});
