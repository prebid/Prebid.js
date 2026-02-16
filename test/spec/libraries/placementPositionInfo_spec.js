import { getPlacementPositionUtils } from '../../../libraries/placementPositionInfo/placementPositionInfo.js';
import * as utils from '../../../src/utils.js';
import * as boundingClientRectLib from '../../../libraries/boundingClientRect/boundingClientRect.js';
import * as percentInViewLib from '../../../libraries/percentInView/percentInView.js';
import * as winDimensions from 'src/utils/winDimensions.js';

import assert from 'assert';
import sinon from 'sinon';

describe('placementPositionInfo', function () {
  let sandbox;
  let canAccessWindowTopStub;
  let getWindowTopStub;
  let getWindowSelfStub;
  let getBoundingClientRectStub;
  let percentInViewStub;
  let cleanObjStub;

  let mockDocument;
  let mockWindow;
  let viewportOffset

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    mockDocument = {
      getElementById: sandbox.stub().returns(null),
      getElementsByTagName: sandbox.stub().returns([]),
      body: { scrollHeight: 2000, offsetHeight: 1800 },
      documentElement: { clientHeight: 1900, scrollHeight: 2100, offsetHeight: 1950 },
      visibilityState: 'visible'
    };

    mockWindow = {
      innerHeight: 800,
      document: mockDocument
    };

    canAccessWindowTopStub = sandbox.stub(utils, 'canAccessWindowTop').returns(true);
    getWindowTopStub = sandbox.stub(utils, 'getWindowTop').returns(mockWindow);
    getWindowSelfStub = sandbox.stub(utils, 'getWindowSelf').returns(mockWindow);
    getBoundingClientRectStub = sandbox.stub(boundingClientRectLib, 'getBoundingClientRect');
    percentInViewStub = sandbox.stub(percentInViewLib, 'getViewability');
    cleanObjStub = sandbox.stub(utils, 'cleanObj').callsFake(obj => obj);
    sandbox.stub(winDimensions, 'getWinDimensions').returns(mockWindow);
    viewportOffset = {x: 0, y: 0};
    sandbox.stub(percentInViewLib, 'getViewportOffset').callsFake(() => viewportOffset);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getPlacementPositionUtils', function () {
    it('should return an object with getPlacementInfo and getPlacementEnv functions', function () {
      const result = getPlacementPositionUtils();

      assert.strictEqual(typeof result.getPlacementInfo, 'function');
      assert.strictEqual(typeof result.getPlacementEnv, 'function');
    });

    it('should use window top when accessible', function () {
      canAccessWindowTopStub.returns(true);
      getPlacementPositionUtils();

      assert.ok(getWindowTopStub.called);
    });

    it('should use window self when top is not accessible', function () {
      canAccessWindowTopStub.returns(false);
      getPlacementPositionUtils();

      assert.ok(getWindowSelfStub.called);
    });
  });

  describe('getPlacementInfo', function () {
    let getPlacementInfo;
    let mockElement;

    beforeEach(function () {
      mockElement = { id: 'test-ad-unit' };
      mockDocument.getElementById.returns(mockElement);

      getBoundingClientRectStub.returns({
        top: 100,
        bottom: 200,
        height: 100,
        width: 300
      });

      percentInViewStub.returns(50);

      const placementUtils = getPlacementPositionUtils();
      getPlacementInfo = placementUtils.getPlacementInfo;
    });

    it('should return placement info with all required fields', function () {
      const bidReq = {
        adUnitCode: 'test-ad-unit',
        auctionsCount: 5,
        sizes: [[300, 250]]
      };

      const result = getPlacementInfo(bidReq);

      assert.strictEqual(result.AuctionsCount, 5);
      assert.strictEqual(typeof result.DistanceToView, 'number');
      assert.strictEqual(typeof result.PlacementPercentView, 'number');
      assert.strictEqual(typeof result.ElementHeight, 'number');
    });

    it('should calculate distanceToView as 0 when element is in viewport', function () {
      getBoundingClientRectStub.returns({
        top: 100,
        bottom: 200,
        height: 100
      });

      const bidReq = {
        adUnitCode: 'test-ad-unit',
        sizes: [[300, 250]]
      };

      const result = getPlacementInfo(bidReq);

      assert.strictEqual(result.DistanceToView, 0);
    });

    it('should calculate positive distanceToView when element is below viewport', function () {
      getBoundingClientRectStub.returns({
        top: 1000,
        bottom: 1100,
        height: 100
      });

      const bidReq = {
        adUnitCode: 'test-ad-unit',
        sizes: [[300, 250]]
      };

      const result = getPlacementInfo(bidReq);

      assert.strictEqual(result.DistanceToView, 200);
    });

    it('should calculate negative distanceToView when element is above viewport', function () {
      getBoundingClientRectStub.returns({
        top: -200,
        bottom: -100,
        height: 100
      });

      const bidReq = {
        adUnitCode: 'test-ad-unit',
        sizes: [[300, 250]]
      };

      const result = getPlacementInfo(bidReq);

      assert.strictEqual(result.DistanceToView, -100);
    });

    it('should handle null element gracefully', function () {
      mockDocument.getElementById.returns(null);

      const bidReq = {
        adUnitCode: 'non-existent-unit',
        sizes: [[300, 250]]
      };

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo(bidReq);

      assert.strictEqual(result.DistanceToView, 0);
      assert.strictEqual(result.ElementHeight, 1);
    });

    it('should not call getViewability when element is null', function () {
      mockDocument.getElementById.returns(null);

      const bidReq = {
        adUnitCode: 'non-existent-unit',
        sizes: [[300, 250]]
      };

      const placementUtils = getPlacementPositionUtils();
      placementUtils.getPlacementInfo(bidReq);

      assert.ok(!percentInViewStub.called, 'getViewability should not be called with null element');
    });

    it('should handle empty sizes array', function () {
      const bidReq = {
        adUnitCode: 'test-ad-unit',
        sizes: []
      };

      const result = getPlacementInfo(bidReq);

      assert.ok(!isNaN(result.PlacementPercentView), 'PlacementPercentView should not be NaN');
    });

    it('should handle undefined sizes', function () {
      const bidReq = {
        adUnitCode: 'test-ad-unit'
      };

      const result = getPlacementInfo(bidReq);

      assert.ok(!isNaN(result.PlacementPercentView), 'PlacementPercentView should not be NaN');
    });

    it('should select the smallest size by area', function () {
      const bidReq = {
        adUnitCode: 'test-ad-unit',
        sizes: [[728, 90], [300, 250], [160, 600]]
      };

      getPlacementInfo(bidReq);

      const percentInViewCall = percentInViewStub.getCall(0);
      const sizeArg = percentInViewCall.args[2];

      assert.strictEqual(sizeArg.w, 728);
      assert.strictEqual(sizeArg.h, 90);
    });

    it('should use ElementHeight from bounding rect', function () {
      getBoundingClientRectStub.returns({
        top: 100,
        bottom: 350,
        height: 250
      });

      const bidReq = {
        adUnitCode: 'test-ad-unit',
        sizes: [[300, 250]]
      };

      const result = getPlacementInfo(bidReq);

      assert.strictEqual(result.ElementHeight, 250);
    });

    it('should default ElementHeight to 1 when height is 0', function () {
      getBoundingClientRectStub.returns({
        top: 100,
        bottom: 100,
        height: 0
      });

      const bidReq = {
        adUnitCode: 'test-ad-unit',
        sizes: [[300, 250]]
      };

      const result = getPlacementInfo(bidReq);

      assert.strictEqual(result.ElementHeight, 1);
    });
  });

  describe('getPlacementEnv', function () {
    let getPlacementEnv;
    let performanceNowStub;

    beforeEach(function () {
      performanceNowStub = sandbox.stub(performance, 'now').returns(1234.567);

      const placementUtils = getPlacementPositionUtils();
      getPlacementEnv = placementUtils.getPlacementEnv;
    });

    it('should return environment info with all required fields', function () {
      const result = getPlacementEnv();

      assert.strictEqual(typeof result.TimeFromNavigation, 'number');
      assert.strictEqual(typeof result.TabActive, 'boolean');
      assert.strictEqual(typeof result.PageHeight, 'number');
      assert.strictEqual(typeof result.ViewportHeight, 'number');
    });

    it('should return TimeFromNavigation as floored performance.now()', function () {
      performanceNowStub.returns(5678.999);

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementEnv();

      assert.strictEqual(result.TimeFromNavigation, 5678);
    });

    it('should return TabActive as true when document is visible', function () {
      const result = getPlacementEnv();

      assert.strictEqual(result.TabActive, true);
    });

    it('should return TabActive as false when document is hidden', function () {
      sandbox.restore();
      sandbox = sinon.createSandbox();

      const hiddenMockDocument = {
        getElementById: sandbox.stub().returns(null),
        getElementsByTagName: sandbox.stub().returns([]),
        body: { scrollHeight: 1000, offsetHeight: 1000 },
        documentElement: { clientHeight: 1000, scrollHeight: 1000, offsetHeight: 1000 },
        visibilityState: 'hidden'
      };

      const hiddenMockWindow = {
        innerHeight: 800,
        document: hiddenMockDocument
      };

      sandbox.stub(utils, 'canAccessWindowTop').returns(true);
      sandbox.stub(utils, 'getWindowTop').returns(hiddenMockWindow);
      sandbox.stub(utils, 'getWindowSelf').returns(hiddenMockWindow);
      sandbox.stub(utils, 'cleanObj').callsFake(obj => obj);
      sandbox.stub(performance, 'now').returns(1000);

      const freshUtils = getPlacementPositionUtils();
      const result = freshUtils.getPlacementEnv();

      assert.strictEqual(result.TabActive, false);
    });

    it('should return ViewportHeight from window.innerHeight', function () {
      const result = getPlacementEnv();

      assert.strictEqual(result.ViewportHeight, 800);
    });

    it('should return max PageHeight from all document height properties', function () {
      const result = getPlacementEnv();

      assert.strictEqual(result.PageHeight, 2100);
    });
  });

  describe('getViewableDistance edge cases', function () {
    let getPlacementInfo;

    beforeEach(function () {
      mockDocument.getElementById.returns({ id: 'test' });
      percentInViewStub.returns(0);

      const placementUtils = getPlacementPositionUtils();
      getPlacementInfo = placementUtils.getPlacementInfo;
    });

    it('should handle getBoundingClientRect returning null', function () {
      getBoundingClientRectStub.returns(null);

      const bidReq = {
        adUnitCode: 'test',
        sizes: [[300, 250]]
      };

      const result = getPlacementInfo(bidReq);

      assert.strictEqual(result.DistanceToView, 0);
      assert.strictEqual(result.ElementHeight, 1);
    });

    it('should handle element exactly at viewport bottom edge', function () {
      getBoundingClientRectStub.returns({
        top: 800,
        bottom: 900,
        height: 100
      });

      const bidReq = {
        adUnitCode: 'test',
        sizes: [[300, 250]]
      };

      const result = getPlacementInfo(bidReq);

      assert.strictEqual(result.DistanceToView, 0);
    });

    it('should handle element exactly at viewport top edge', function () {
      getBoundingClientRectStub.returns({
        top: 0,
        bottom: 100,
        height: 100
      });

      const bidReq = {
        adUnitCode: 'test',
        sizes: [[300, 250]]
      };

      const result = getPlacementInfo(bidReq);

      assert.strictEqual(result.DistanceToView, 0);
    });
  });

  describe('iframe coordinate translation', function () {
    beforeEach(() => {
      mockDocument.getElementById = sandbox.stub().returns({id: 'test'});
      mockWindow.innerHeight = 1000;
      mockDocument.body = {
        scrollHeight: 2000, offsetHeight: 1800
      }
      mockDocument.documentElement = { clientHeight: 1900, scrollHeight: 2100, offsetHeight: 1950 }
    });
    it('should apply iframe offset when running inside a friendly iframe', function () {
      viewportOffset = {y: 200};

      getBoundingClientRectStub.callsFake((el) => {
        return { top: 100, bottom: 200, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'test',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, 0);
    });

    it('should calculate correct distance when element is below viewport with iframe offset', function () {
      viewportOffset = {y: 500};

      getBoundingClientRectStub.callsFake((el) => {
        return { top: 600, bottom: 700, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'test',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, 100);
    });

    it('should calculate negative distance when element is above viewport with iframe offset', function () {
      viewportOffset = {y: -600};

      getBoundingClientRectStub.callsFake((el) => {
        return { top: 100, bottom: 200, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'test',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, -400);
    });
  });
});
