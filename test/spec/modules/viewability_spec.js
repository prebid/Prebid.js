import { expect, spy } from 'chai';
import * as sinon from 'sinon';
import * as utils from 'src/utils.js';
import * as viewability from 'modules/viewability/index.js';

describe('viewabilityTest', () => {
  describe('start measurement', () => {
    it('should fire viewability trackers', () => {
      let observeCalled = false;
      let unobserveCalled = false;

      let fakeIntersectionObserver = (stateChange, options) => {
        return {
          observe: (element) => {
            observeCalled = true;
            stateChange([{isIntersecting: true}]);
          },
          unobserve: (element) => {
            unobserveCalled = true;
          },
        };
      };
      let sandbox = sinon.sandbox.create();
      let intersectionObserverStub = sandbox.stub(window, 'IntersectionObserver').callsFake(fakeIntersectionObserver);
      let setTimeoutStub = sandbox.stub(window, 'setTimeout').callsFake((callback, timeout) => {
        callback();
      });
      let triggerPixelSpy = sandbox.spy(utils, ['triggerPixel']);

      viewability.startMeasurement('1', {}, { method: 'img', url: 'http://my.tracker/123' }, { inViewThreshold: 0.5, timeInView: 1000 });

      sinon.assert.called(intersectionObserverStub);
      sinon.assert.called(setTimeoutStub);
      expect(observeCalled).to.equal(true);
      expect(unobserveCalled).to.equal(true);
      // check for img tracker
      expect(triggerPixelSpy.callCount).to.equal(1);

      // check for js tracker
      let insertHtmlIntoIframeSpy = sandbox.spy(utils, ['insertHtmlIntoIframe']);
      viewability.startMeasurement('2', {}, { method: 'js', url: 'http://my.tracker/123.js' }, { inViewThreshold: 0.5, timeInView: 1000 });
      expect(insertHtmlIntoIframeSpy.callCount).to.equal(1);

      // check for vid uniqueness
      let logWarnSpy = sandbox.spy(utils, 'logWarn');
      viewability.startMeasurement('2', {}, { method: 'js', url: 'http://my.tracker/123.js' }, { inViewThreshold: 0.5, timeInView: 1000 });
      expect(logWarnSpy.callCount).to.equal(1);
      expect(logWarnSpy.calledWith('provide an unregistered vid', '2')).to.equal(true);
      sandbox.restore();
    });

    it('should fix invalid sizes object', () => {
    });
  });
});
