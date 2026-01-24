import { getPlacementPositionUtils } from '../../../libraries/placementPositionInfo/placementPositionInfo.js';
import * as utils from '../../../src/utils.js';
import * as boundingClientRectLib from '../../../libraries/boundingClientRect/boundingClientRect.js';
import * as percentInViewLib from '../../../libraries/percentInView/percentInView.js';
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
    let mockSelfDoc;
    let mockSelfWindow;
    let mockTopWindow;
    let mockIframe;
    let iframeTop;

    beforeEach(function () {
      iframeTop = 0;
      mockSelfDoc = {
        getElementById: sandbox.stub().returns({ id: 'test' }),
        getElementsByTagName: sandbox.stub().returns([])
      };
      mockSelfWindow = {
        innerHeight: 500,
        document: mockSelfDoc
      };
      mockTopWindow = {
        innerHeight: 1000,
        document: {
          getElementsByTagName: sinon.stub(),
          body: { scrollHeight: 2000, offsetHeight: 1800 },
          documentElement: { clientHeight: 1900, scrollHeight: 2100, offsetHeight: 1950 }
        }
      };
      mockIframe = {
        contentWindow: mockSelfWindow
      };

      sandbox.restore();
      sandbox = sinon.createSandbox();

      mockSelfDoc.getElementById = sandbox.stub().returns({ id: 'test' });
      mockSelfDoc.getElementsByTagName = sandbox.stub().returns([]);
      mockTopWindow.document.getElementsByTagName = sandbox.stub();

      sandbox.stub(utils, 'canAccessWindowTop').returns(true);
      sandbox.stub(utils, 'getWindowTop').returns(mockTopWindow);
      sandbox.stub(utils, 'getWindowSelf').returns(mockSelfWindow);
      sandbox.stub(utils, 'cleanObj').callsFake(obj => obj);
      getBoundingClientRectStub = sandbox.stub(boundingClientRectLib, 'getBoundingClientRect');
      percentInViewStub = sandbox.stub(percentInViewLib, 'getViewability').returns(0);
    });

    it('should return frame offset of 0 when not in iframe (topWin === selfWin)', function () {
      sandbox.restore();
      sandbox = sinon.createSandbox();

      const sameDoc = {
        getElementById: sandbox.stub().returns({ id: 'test' }),
        getElementsByTagName: sandbox.stub().returns([]),
        body: { scrollHeight: 2000, offsetHeight: 1800 },
        documentElement: { clientHeight: 1900, scrollHeight: 2100, offsetHeight: 1950 }
      };
      const sameWindow = {
        innerHeight: 800,
        document: sameDoc
      };
      sandbox.stub(utils, 'canAccessWindowTop').returns(true);
      sandbox.stub(utils, 'getWindowTop').returns(sameWindow);
      sandbox.stub(utils, 'getWindowSelf').returns(sameWindow);
      sandbox.stub(utils, 'cleanObj').callsFake(obj => obj);
      sandbox.stub(boundingClientRectLib, 'getBoundingClientRect').returns({
        top: 100, bottom: 200, height: 100
      });
      sandbox.stub(percentInViewLib, 'getViewability').returns(0);

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'test',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, 0);
    });

    it('should apply iframe offset when running inside a friendly iframe', function () {
      iframeTop = 200;
      mockTopWindow.document.getElementsByTagName.returns([mockIframe]);

      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
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
      iframeTop = 500;
      mockTopWindow.document.getElementsByTagName.returns([mockIframe]);

      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
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
      iframeTop = -600;
      mockTopWindow.document.getElementsByTagName.returns([mockIframe]);

      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
        return { top: 100, bottom: 200, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'test',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, -400);
    });

    it('should return frame offset of 0 when iframe is not found', function () {
      mockTopWindow.document.getElementsByTagName.returns([]);

      getBoundingClientRectStub.returns({
        top: 100, bottom: 200, height: 100
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'test',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, 0);
    });

    it('should return frame offset of 0 when getElementsByTagName throws', function () {
      mockTopWindow.document.getElementsByTagName.throws(new Error('Access denied'));

      getBoundingClientRectStub.returns({
        top: 100, bottom: 200, height: 100
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'test',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, 0);
    });

    it('should use top window viewport height for distance calculation', function () {
      iframeTop = 0;
      mockTopWindow.document.getElementsByTagName.returns([mockIframe]);

      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
        return { top: 1200, bottom: 1300, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'test',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, 200);
    });
  });

  describe('FIF scenario: Prebid in parent, element in iframe', function () {
    let mockElement;
    let mockIframeDoc;
    let mockIframeWindow;
    let mockIframe;
    let mockParentDoc;
    let mockParentWindow;
    let iframeTop;

    beforeEach(function () {
      iframeTop = 200;
      mockElement = { id: 'iframe-ad-unit' };
      mockIframeWindow = { innerHeight: 400 };
      mockIframeDoc = {
        getElementById: sinon.stub().returns(mockElement),
        getElementsByTagName: sinon.stub().returns([])
      };
      mockIframe = {
        contentDocument: mockIframeDoc,
        contentWindow: mockIframeWindow
      };

      sandbox.restore();
      sandbox = sinon.createSandbox();

      mockIframeDoc.getElementById = sandbox.stub().returns(mockElement);
      mockIframeDoc.getElementsByTagName = sandbox.stub().returns([]);

      mockParentDoc = {
        getElementById: sandbox.stub().returns(null),
        getElementsByTagName: sandbox.stub().returns([mockIframe]),
        body: { scrollHeight: 2000, offsetHeight: 1800 },
        documentElement: { clientHeight: 1900, scrollHeight: 2100, offsetHeight: 1950 }
      };

      mockParentWindow = {
        innerHeight: 800,
        document: mockParentDoc
      };

      sandbox.stub(utils, 'canAccessWindowTop').returns(true);
      sandbox.stub(utils, 'getWindowTop').returns(mockParentWindow);
      sandbox.stub(utils, 'getWindowSelf').returns(mockParentWindow);
      sandbox.stub(utils, 'cleanObj').callsFake(obj => obj);

      getBoundingClientRectStub = sandbox.stub(boundingClientRectLib, 'getBoundingClientRect');
      percentInViewStub = sandbox.stub(percentInViewLib, 'getViewability').returns(50);
    });

    it('should find element in iframe document when not in current document', function () {
      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
        return { top: 100, bottom: 200, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'iframe-ad-unit',
        sizes: [[300, 250]]
      });

      assert.ok(mockIframeDoc.getElementById.calledWith('iframe-ad-unit'));
      assert.strictEqual(result.ElementHeight, 100);
    });

    it('should apply iframe offset when element is in iframe', function () {
      iframeTop = 300;
      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
        return { top: 100, bottom: 200, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'iframe-ad-unit',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, 0);
    });

    it('should calculate positive distance when element in iframe is below viewport', function () {
      iframeTop = 500;
      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
        return { top: 400, bottom: 500, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'iframe-ad-unit',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, 100);
    });

    it('should calculate negative distance when element in iframe is above viewport', function () {
      iframeTop = -500;
      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
        return { top: 100, bottom: 200, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'iframe-ad-unit',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, -300);
    });

    it('should use iframe window for viewability calculation', function () {
      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
        return { top: 100, bottom: 200, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      placementUtils.getPlacementInfo({
        adUnitCode: 'iframe-ad-unit',
        sizes: [[300, 250]]
      });

      const viewabilityCall = percentInViewStub.getCall(0);
      assert.strictEqual(viewabilityCall.args[1], mockIframeWindow);
    });

    it('should skip cross-origin iframes that throw errors', function () {
      const crossOriginIframe = {
        get contentDocument() { throw new Error('Blocked by CORS'); },
        get contentWindow() { return null; }
      };
      mockParentDoc.getElementsByTagName.returns([crossOriginIframe, mockIframe]);

      getBoundingClientRectStub.callsFake((el) => {
        if (el === mockIframe) return { top: iframeTop };
        return { top: 100, bottom: 200, height: 100 };
      });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'iframe-ad-unit',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.ElementHeight, 100);
    });

    it('should return default values when element not found anywhere', function () {
      mockIframeDoc.getElementById.returns(null);

      getBoundingClientRectStub.returns({ top: 100, bottom: 200, height: 100 });

      const placementUtils = getPlacementPositionUtils();
      const result = placementUtils.getPlacementInfo({
        adUnitCode: 'non-existent',
        sizes: [[300, 250]]
      });

      assert.strictEqual(result.DistanceToView, 0);
      assert.strictEqual(result.ElementHeight, 1);
    });
  });
});
