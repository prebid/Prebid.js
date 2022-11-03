import { expect } from 'chai';
import { AdQueueCoordinator } from '../../../../modules/videoModule/adQueue.js';
import { SETUP_COMPLETE } from '../../../../libraries/video/constants/events.js';

const testId = 'testId';
describe('Ad Queue Coordinator', function () {
  const mockVideoCoreFactory = function () {
    return {
      onEvents: sinon.spy(),
      offEvents: sinon.spy(),
      setAdTagUrl: sinon.spy(),
    }
  };

  describe('Register Provider', function () {

  });

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
    });
  });

  describe('Queue Ad', function () {

  });
});
