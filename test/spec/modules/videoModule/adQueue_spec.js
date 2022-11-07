import { expect } from 'chai';
import { AdQueueCoordinator } from '../../../../modules/videoModule/adQueue.js';
import { AD_BREAK_END, SETUP_COMPLETE } from '../../../../libraries/video/constants/events.js'

const testId = 'testId';
describe('Ad Queue Coordinator', function () {
  const mockVideoCoreFactory = function () {
    return {
      onEvents: sinon.spy(),
      offEvents: sinon.spy(),
      setAdTagUrl: sinon.spy(),
    }
  };

  describe('Requires Queuing', function () {
    it('should be true when provider is not setup', function() {
      const coordinator = AdQueueCoordinator(mockVideoCoreFactory());
      coordinator.registerProvider(testId);
      expect(coordinator.requiresQueueing(testId)).to.be.true;
    });

    it('should be false when provider is setup', function() {
      const mockVideoCore = mockVideoCoreFactory();
      let setupComplete;
      mockVideoCore.onEvents = function(events, callback, id) {
        if (events[0] === SETUP_COMPLETE && id === testId) {
          setupComplete = callback;
        }
      };
      const coordinator = AdQueueCoordinator(mockVideoCore);
      coordinator.registerProvider(testId);
      setupComplete({ divId: testId });

      expect(coordinator.requiresQueueing(testId)).to.be.false;
      expect(mockVideoCore.offEvents.calledTwice).to.be.true;
      const offSetupCompleteArgs = mockVideoCore.offEvents.firstCall.args;
      expect(offSetupCompleteArgs[0]).to.deep.equal([SETUP_COMPLETE]);
      expect(offSetupCompleteArgs[2]).to.equal(testId);
    });
  });

  describe('Queue Ad', function () {
    it('should push ad to queue', function () {
      const mockVideoCore = mockVideoCoreFactory();
      let setupComplete;
      mockVideoCore.onEvents = function(events, callback, id) {
        if (events[0] === SETUP_COMPLETE && id === testId) {
          setupComplete = callback;
        }
      };
      const coordinator = AdQueueCoordinator(mockVideoCore);
      coordinator.registerProvider(testId);
      coordinator.queueAd('testAdTag', testId, { param: {} });
      setupComplete({ divId: testId });
      expect(mockVideoCore.setAdTagUrl.calledOnce).to.be.true;
    });
  });

  it('should load from queue on Ad Break End', function () {
    const mockVideoCore = mockVideoCoreFactory();
    let setupComplete;
    let adBreakEnd;

    mockVideoCore.onEvents = function(events, callback, id) {
      if (events[0] === SETUP_COMPLETE && id === testId) {
        setupComplete = callback;
      }

      if (events[0] === AD_BREAK_END && id === testId) {
        adBreakEnd = callback;
      }
    };

    const coordinator = AdQueueCoordinator(mockVideoCore);
    coordinator.registerProvider(testId);
    coordinator.queueAd('testAdTag', testId);
    coordinator.queueAd('testAdTag2', testId);
    coordinator.queueAd('testAdTag3', testId);

    setupComplete({ divId: testId });

    expect(mockVideoCore.setAdTagUrl.calledOnce).to.be.true;
    let setAdTagArgs = mockVideoCore.setAdTagUrl.firstCall.args;
    expect(setAdTagArgs[0]).to.be.equal('testAdTag');

    adBreakEnd({ divId: testId });

    expect(mockVideoCore.setAdTagUrl.calledTwice).to.be.true;
    setAdTagArgs = mockVideoCore.setAdTagUrl.secondCall.args;
    expect(setAdTagArgs[0]).to.be.equal('testAdTag2');

    adBreakEnd({ divId: testId });

    expect(mockVideoCore.setAdTagUrl.calledThrice).to.be.true;
    setAdTagArgs = mockVideoCore.setAdTagUrl.thirdCall.args;
    expect(setAdTagArgs[0]).to.be.equal('testAdTag3');
  })
});
