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
      setAdXml: sinon.spy(),
    }
  };

  const mockEventsFactory = function () {
    return {
      emit: sinon.spy()
    };
  };

  describe('Before Provider Setup Complete', function () {
    it('should push ad to queue', function () {
      const mockVideoCore = mockVideoCoreFactory();
      const mockEvents = mockEventsFactory();
      const coordinator = AdQueueCoordinator(mockVideoCore, mockEvents);
      coordinator.registerProvider(testId);
      coordinator.queueAd('testAdXml', testId, { param: {} });

      expect(mockEvents.emit.calledOnce).to.be.true;
      let emitArgs = mockEvents.emit.firstCall.args;
      expect(emitArgs[0]).to.be.equal('videoAuctionAdLoadQueued');
      expect(mockVideoCore.setAdXml.called).to.be.false;
    });
  });

  describe('After Provider Setup Complete', function () {
    it('should load from ad queue', function () {
      const mockVideoCore = mockVideoCoreFactory();
      const mockEvents = mockEventsFactory();
      let setupComplete;
      mockVideoCore.onEvents = function(events, callback, id) {
        if (events[0] === SETUP_COMPLETE && id === testId) {
          setupComplete = callback;
        }
      };
      const coordinator = AdQueueCoordinator(mockVideoCore, mockEvents);
      coordinator.registerProvider(testId);
      coordinator.queueAd('testAdXml', testId, { param: {} });

      expect(mockEvents.emit.calledOnce).to.be.true;
      let emitArgs = mockEvents.emit.firstCall.args;
      expect(emitArgs[0]).to.be.equal('videoAuctionAdLoadQueued');

      setupComplete('', { divId: testId });
      expect(mockEvents.emit.calledTwice).to.be.true;
      emitArgs = mockEvents.emit.secondCall.args;
      expect(emitArgs[0]).to.be.equal('videoAuctionAdLoadAttempt');
      expect(mockVideoCore.setAdXml.calledOnce).to.be.true;
    });

    it('should load ads without queueing', function () {
      const mockVideoCore = mockVideoCoreFactory();
      const mockEvents = mockEventsFactory();
      let setupComplete;
      mockVideoCore.onEvents = function(events, callback, id) {
        if (events[0] === SETUP_COMPLETE && id === testId) {
          setupComplete = callback;
        }
      };
      const coordinator = AdQueueCoordinator(mockVideoCore, mockEvents);
      coordinator.registerProvider(testId);

      setupComplete('', { divId: testId });

      coordinator.queueAd('testAdXml', testId, { param: {} });
      expect(mockEvents.emit.calledOnce).to.be.true;
      let emitArgs = mockEvents.emit.firstCall.args;
      expect(emitArgs[0]).to.be.equal('videoAuctionAdLoadAttempt');
      expect(mockVideoCore.setAdXml.calledOnce).to.be.true;
    });
  });

  describe('On Ad Break End', function () {
    it('should load from queue', function () {
      const mockVideoCore = mockVideoCoreFactory();
      const mockEvents = mockEventsFactory();
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

      const coordinator = AdQueueCoordinator(mockVideoCore, mockEvents);
      coordinator.registerProvider(testId);
      coordinator.queueAd('testAdXml', testId);
      coordinator.queueAd('testAdXml2', testId);
      coordinator.queueAd('testAdXml3', testId);

      mockEvents.emit.resetHistory();

      setupComplete('', { divId: testId });

      expect(mockEvents.emit.calledOnce).to.be.true;
      let emitArgs = mockEvents.emit.firstCall.args;
      expect(emitArgs[0]).to.be.equal('videoAuctionAdLoadAttempt');
      expect(mockVideoCore.setAdXml.calledOnce).to.be.true;
      let setAdXmlArgs = mockVideoCore.setAdXml.firstCall.args;
      expect(setAdXmlArgs[0]).to.be.equal('testAdXml');

      adBreakEnd('', { divId: testId });

      expect(mockEvents.emit.calledTwice).to.be.true;
      emitArgs = mockEvents.emit.secondCall.args;
      expect(emitArgs[0]).to.be.equal('videoAuctionAdLoadAttempt');
      expect(mockVideoCore.setAdXml.calledTwice).to.be.true;
      setAdXmlArgs = mockVideoCore.setAdXml.secondCall.args;
      expect(setAdXmlArgs[0]).to.be.equal('testAdXml2');

      adBreakEnd('', { divId: testId });

      expect(mockEvents.emit.calledThrice).to.be.true;
      emitArgs = mockEvents.emit.thirdCall.args;
      expect(emitArgs[0]).to.be.equal('videoAuctionAdLoadAttempt');
      expect(mockVideoCore.setAdXml.calledThrice).to.be.true;
      setAdXmlArgs = mockVideoCore.setAdXml.thirdCall.args;
      expect(setAdXmlArgs[0]).to.be.equal('testAdXml3');

      adBreakEnd('', { divId: testId });

      expect(mockEvents.emit.calledThrice).to.be.true;
      expect(mockVideoCore.setAdXml.calledThrice).to.be.true;
    });

    it('should stop responding to AdBreakEnd when queue is empty', function () {
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

      const coordinator = AdQueueCoordinator(mockVideoCore, mockEventsFactory());
      coordinator.registerProvider(testId);
      coordinator.queueAd('testAdXml', testId);
      coordinator.queueAd('testAdXml2', testId);
      coordinator.queueAd('testAdXml3', testId);

      setupComplete('', { divId: testId });
      adBreakEnd('', { divId: testId });
      adBreakEnd('', { divId: testId });
      expect(mockVideoCore.setAdXml.calledThrice).to.be.true;
      adBreakEnd('', { divId: testId });
      expect(mockVideoCore.setAdXml.calledThrice).to.be.true;
      adBreakEnd('', { divId: testId });
      expect(mockVideoCore.setAdXml.calledThrice).to.be.true;
    });
  });
});
