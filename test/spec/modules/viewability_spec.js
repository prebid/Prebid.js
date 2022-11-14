import { expect } from 'chai';
import * as sinon from 'sinon';
import * as utils from 'src/utils.js';
import * as viewability from 'modules/viewability.js';

describe('viewability test', () => {
  describe('start measurement', () => {
    let sandbox;
    let intersectionObserverStub;
    let setTimeoutStub;
    let observeCalled;
    let unobserveCalled;
    let ti = 1;
    beforeEach(() => {
      observeCalled = false;
      unobserveCalled = false;
      sandbox = sinon.sandbox.create();

      let fakeIntersectionObserver = (stateChange, options) => {
        return {
          observe: (element) => {
            observeCalled = true;
            stateChange([{ isIntersecting: true }]);
          },
          unobserve: (element) => {
            unobserveCalled = true;
          },
        };
      };

      intersectionObserverStub = sandbox.stub(window, 'IntersectionObserver').callsFake(fakeIntersectionObserver);
      setTimeoutStub = sandbox.stub(window, 'setTimeout').callsFake((callback, timeout) => {
        callback();
        return ti++;
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should trigger appropriate callbacks', () => {
      viewability.startMeasurement('0', {}, { method: 'img', value: 'http://my.tracker/123' }, { inViewThreshold: 0.5, timeInView: 1000 });

      sinon.assert.called(intersectionObserverStub);
      sinon.assert.called(setTimeoutStub);
      expect(observeCalled).to.equal(true);
      expect(unobserveCalled).to.equal(true);
    });

    it('should trigger img tracker', () => {
      let triggerPixelSpy = sandbox.spy(utils, ['triggerPixel']);
      viewability.startMeasurement('1', {}, { method: 'img', value: 'http://my.tracker/123' }, { inViewThreshold: 0.5, timeInView: 1000 });
      expect(triggerPixelSpy.callCount).to.equal(1);
    });

    it('should trigger js tracker', () => {
      let insertHtmlIntoIframeSpy = sandbox.spy(utils, ['insertHtmlIntoIframe']);
      viewability.startMeasurement('2', {}, { method: 'js', value: 'http://my.tracker/123.js' }, { inViewThreshold: 0.5, timeInView: 1000 });
      expect(insertHtmlIntoIframeSpy.callCount).to.equal(1);
    });

    it('should trigger callback tracker', () => {
      let callbackFired = false;
      viewability.startMeasurement('3', {}, { method: 'callback', value: () => { callbackFired = true; } }, { inViewThreshold: 0.5, timeInView: 1000 });
      expect(callbackFired).to.equal(true);
    });

    it('should check for vid uniqueness', () => {
      let logWarnSpy = sandbox.spy(utils, 'logWarn');
      viewability.startMeasurement('4', {}, { method: 'js', value: 'http://my.tracker/123.js' }, { inViewThreshold: 0.5, timeInView: 1000 });
      expect(logWarnSpy.callCount).to.equal(0);

      viewability.startMeasurement('4', {}, { method: 'js', value: 'http://my.tracker/123.js' }, { inViewThreshold: 0.5, timeInView: 1000 });
      expect(logWarnSpy.callCount).to.equal(1);
      expect(logWarnSpy.calledWith(`${viewability.MODULE_NAME}: must provide an unregistered vid`, '4')).to.equal(true);
    });

    it('should check for valid criteria', () => {
      let logWarnSpy = sandbox.spy(utils, 'logWarn');
      viewability.startMeasurement('5', {}, { method: 'js', value: 'http://my.tracker/123.js' }, { timeInView: 1000 });
      expect(logWarnSpy.callCount).to.equal(1);
      expect(logWarnSpy.calledWith(`${viewability.MODULE_NAME}: missing criteria`, { timeInView: 1000 })).to.equal(true);
    });

    it('should check for valid tracker', () => {
      let logWarnSpy = sandbox.spy(utils, 'logWarn');
      viewability.startMeasurement('6', {}, { method: 'callback', value: 'string' }, { inViewThreshold: 0.5, timeInView: 1000 });
      expect(logWarnSpy.callCount).to.equal(1);
      expect(logWarnSpy.calledWith(`${viewability.MODULE_NAME}: invalid tracker`, { method: 'callback', value: 'string' })).to.equal(true);
    });

    it('should check if element provided', () => {
      let logWarnSpy = sandbox.spy(utils, 'logWarn');
      viewability.startMeasurement('7', undefined, { method: 'js', value: 'http://my.tracker/123.js' }, { timeInView: 1000 });
      expect(logWarnSpy.callCount).to.equal(1);
      expect(logWarnSpy.calledWith(`${viewability.MODULE_NAME}: no html element provided`)).to.equal(true);
    });
  });

  describe('stop measurement', () => {
    let sandbox;
    let intersectionObserverStub;
    let setTimeoutStub;
    let clearTimeoutStub;
    let observeCalled;
    let unobserveCalled;
    let stateChangeBackup;
    let ti = 1;
    beforeEach(() => {
      observeCalled = false;
      unobserveCalled = false;
      sandbox = sinon.sandbox.create();

      let fakeIntersectionObserver = (stateChange, options) => {
        return {
          observe: (element) => {
            stateChangeBackup = stateChange;
            observeCalled = true;
            stateChange([{ isIntersecting: true }]);
          },
          unobserve: (element) => {
            unobserveCalled = true;
          },
        };
      };

      intersectionObserverStub = sandbox.stub(window, 'IntersectionObserver').callsFake(fakeIntersectionObserver);
      setTimeoutStub = sandbox.stub(window, 'setTimeout').callsFake((callback, timeout) => {
        // skipping the callback
        return ti++;
      });
      clearTimeoutStub = sandbox.stub(window, 'clearTimeout').callsFake((timeoutId) => { });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should clear the timeout', () => {
      viewability.startMeasurement('10', {}, { method: 'img', value: 'http://my.tracker/123' }, { inViewThreshold: 0.5, timeInView: 1000 });
      stateChangeBackup([{ isIntersecting: false }]);
      sinon.assert.called(intersectionObserverStub);
      sinon.assert.called(setTimeoutStub);
      sinon.assert.called(clearTimeoutStub);
      expect(observeCalled).to.equal(true);
    });

    it('should unobserve', () => {
      viewability.startMeasurement('11', {}, { method: 'img', value: 'http://my.tracker/123' }, { inViewThreshold: 0.5, timeInView: 1000 });
      sinon.assert.called(intersectionObserverStub);
      sinon.assert.called(setTimeoutStub);
      expect(observeCalled).to.equal(true);
      expect(unobserveCalled).to.equal(false);

      viewability.stopMeasurement('11');
      expect(unobserveCalled).to.equal(true);
      sinon.assert.called(clearTimeoutStub);
    });

    it('should check for vid existence', () => {
      let logWarnSpy = sandbox.spy(utils, 'logWarn');
      viewability.stopMeasurement('100');
      expect(logWarnSpy.callCount).to.equal(1);
      expect(logWarnSpy.calledWith(`${viewability.MODULE_NAME}: must provide a registered vid`, '100')).to.equal(true);
    });
  });

  describe('handle creative messages', () => {
    let sandbox;
    let intersectionObserverStub;
    let setTimeoutStub;
    let observeCalled;
    let unobserveCalled;
    let ti = 1;
    let getElementsByTagStub;
    let getElementByIdStub;

    let fakeContentWindow = {};
    beforeEach(() => {
      observeCalled = false;
      unobserveCalled = false;
      sandbox = sinon.sandbox.create();

      let fakeIntersectionObserver = (stateChange, options) => {
        return {
          observe: (element) => {
            observeCalled = true;
            stateChange([{ isIntersecting: true }]);
          },
          unobserve: (element) => {
            unobserveCalled = true;
          },
        };
      };

      intersectionObserverStub = sandbox.stub(window, 'IntersectionObserver').callsFake(fakeIntersectionObserver);
      setTimeoutStub = sandbox.stub(window, 'setTimeout').callsFake((callback, timeout) => {
        callback();
        return ti++;
      });

      getElementsByTagStub = sandbox.stub(document, 'getElementsByTagName').callsFake((tagName) => {
        return [{
          contentWindow: fakeContentWindow,
        }];
      });
      getElementByIdStub = sandbox.stub(document, 'getElementById').callsFake((id) => {
        return {};
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should find element by contentWindow', () => {
      let viewabilityRecord = {
        vid: 1000,
        tracker: {
          value: 'http://my.tracker/123',
          method: 'img',
        },
        criteria: { inViewThreshold: 0.5, timeInView: 1000 },
        message: 'Prebid Viewability',
        action: 'startMeasurement',
      };
      let data = JSON.stringify(viewabilityRecord);

      viewability.receiveMessage({
        data: data,
        source: fakeContentWindow,
      });

      sinon.assert.called(getElementsByTagStub);
      sinon.assert.called(intersectionObserverStub);
      sinon.assert.called(setTimeoutStub);
      expect(observeCalled).to.equal(true);
      expect(unobserveCalled).to.equal(true);
    });

    it('should find element by id', () => {
      let viewabilityRecord = {
        vid: 1001,
        tracker: {
          value: 'http://my.tracker/123',
          method: 'img',
        },
        criteria: { inViewThreshold: 0.5, timeInView: 1000 },
        message: 'Prebid Viewability',
        action: 'startMeasurement',
        elementId: '1',
      };
      let data = JSON.stringify(viewabilityRecord);
      viewability.receiveMessage({
        data: data,
      });

      sinon.assert.called(getElementByIdStub);
      sinon.assert.called(intersectionObserverStub);
      sinon.assert.called(setTimeoutStub);
      expect(observeCalled).to.equal(true);
      expect(unobserveCalled).to.equal(true);
    });

    it('should stop measurement', () => {
      let viewabilityRecord = {
        vid: 1001,
        message: 'Prebid Viewability',
        action: 'stopMeasurement',
      };
      let data = JSON.stringify(viewabilityRecord);
      viewability.receiveMessage({
        data: data,
      });

      expect(unobserveCalled).to.equal(true);
    });
  });
});
