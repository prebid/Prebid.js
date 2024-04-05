import * as events from 'src/events';
import * as utils from 'src/utils.js';

import spec, {self as exports} from 'modules/automatadAnalyticsAdapter.js';

import { EVENTS } from 'src/constants.js';
import { expect } from 'chai';

const obj = {
  auctionInitHandler: (args) => {},
  bidResponseHandler: (args) => {},
  bidderDoneHandler: (args) => {},
  bidWonHandler: (args) => {},
  noBidHandler: (args) => {},
  auctionDebugHandler: (args) => {},
  bidderTimeoutHandler: (args) => {},
  bidRequestedHandler: (args) => {},
  bidRejectedHandler: (args) => {}
}

const {
  AUCTION_DEBUG,
  BID_REQUESTED,
  BID_REJECTED,
  AUCTION_INIT,
  BIDDER_DONE,
  BID_RESPONSE,
  BID_TIMEOUT,
  BID_WON,
  NO_BID
} = EVENTS

const CONFIG_WITH_DEBUG = {
  provider: 'atmtdAnalyticsAdapter',
  options: {
    publisherID: '230',
    siteID: '421'
  },
  includeEvents: [AUCTION_DEBUG, AUCTION_INIT, BIDDER_DONE, BID_RESPONSE, BID_TIMEOUT, NO_BID, BID_WON, BID_REQUESTED, BID_REJECTED]
}

describe('Automatad Analytics Adapter', () => {
  var sandbox, clock;

  describe('Adapter Setup Configuration', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'logMessage')
      sandbox.stub(events, 'getEvents').returns([]);
      sandbox.stub(utils, 'logError');
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('Should log error and return false if nothing is passed as the param in the enable analytics call', () => {
      spec.enableAnalytics()

      expect(utils.logError.called).to.equal(true)
    });

    it('Should log error and return false if object type is not passed as the param in the enable analytics call', () => {
      spec.enableAnalytics('hello world')

      expect(utils.logError.called).to.equal(true)
    });

    it('Should log error and return false if options is not defined in the enable analytics call', () => {
      spec.enableAnalytics({
        provider: 'atmtdAnalyticsAdapter'
      })

      expect(utils.logError.called).to.equal(true)
    });
    it('Should log error and return false if pub id is not defined in the enable analytics call', () => {
      spec.enableAnalytics({
        provider: 'atmtdAnalyticsAdapter',
        options: {
          siteID: '230'
        }
      })

      expect(utils.logError.called).to.equal(true)
    });
    it('Should log error and return false if pub id is not defined in the enable analytics call', () => {
      spec.enableAnalytics({
        provider: 'atmtdAnalyticsAdapter',
        options: {
          publisherID: '230'
        }
      })

      expect(utils.logError.called).to.equal(true)
    });
    it('Should successfully configure the adapter and set global log debug messages flag to false', () => {
      spec.enableAnalytics({
        provider: 'atmtdAnalyticsAdapter',
        options: {
          publisherID: '230',
          siteID: '421',
          logDebug: false
        }
      });
      expect(utils.logError.called).to.equal(false)
      expect(utils.logMessage.called).to.equal(true)
      spec.disableAnalytics();
    });
    it('Should successfully configure the adapter and set global log debug messages flag to true', () => {
      sandbox.stub(exports, 'initializeQueue').callsFake(() => {});
      sandbox.stub(exports, 'addGPTHandlers').callsFake(() => {});
      const config = {
        provider: 'atmtdAnalyticsAdapter',
        options: {
          publisherID: '230',
          siteID: '410',
          logDebug: true
        }
      }

      spec.enableAnalytics(config)
      expect(utils.logError.called).to.equal(false)
      expect(exports.initializeQueue.called).to.equal(true)
      expect(exports.addGPTHandlers.called).to.equal(true)
      expect(utils.logMessage.called).to.equal(true)
      spec.disableAnalytics();
    });
  });

  describe('Behaviour of the adapter when the sdk has loaded', () => {
    before(() => {
      spec.enableAnalytics(CONFIG_WITH_DEBUG);

      global.window.atmtdAnalytics = obj
      exports.qBeingUsed = false
      exports.qTraversalComplete = undefined
      Object.keys(obj).forEach((fn) => sandbox.spy(global.window.atmtdAnalytics, fn))
    })
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(events, 'getEvents').returns([]);
      sandbox.stub(utils, 'logMessage');
      sandbox.stub(utils, 'logError');
    });
    afterEach(() => {
      sandbox.restore();
    });
    after(() => {
      const handlers = global.window.atmtdAnalytics
      Object.keys(handlers).forEach((handler) => global.window.atmtdAnalytics[handler].reset())
      global.window.atmtdAnalytics = undefined;
      spec.disableAnalytics();
      exports.qBeingUsed = false
      exports.qTraversalComplete = undefined
    })

    it('Should call the auctionInitHandler when the auction init event is fired', () => {
      events.emit(AUCTION_INIT, {type: AUCTION_INIT})
      expect(global.window.atmtdAnalytics.auctionInitHandler.called).to.equal(true)
    });

    it('Should call the bidRequested when the bidRequested event is fired', () => {
      events.emit(BID_REQUESTED, {type: BID_REQUESTED})
      expect(global.window.atmtdAnalytics.bidRequestedHandler.called).to.equal(true)
    });

    it('Should call the bidRejected when the bidRejected event is fired', () => {
      events.emit(BID_REJECTED, {type: BID_REJECTED})
      expect(global.window.atmtdAnalytics.bidRejectedHandler.called).to.equal(true)
    });

    it('Should call the bidResponseHandler when the bidResponse event is fired', () => {
      events.emit(BID_RESPONSE, {type: BID_RESPONSE})
      expect(global.window.atmtdAnalytics.bidResponseHandler.called).to.equal(true)
    });

    it('Should call the bidderDoneHandler when the bidderDone event is fired', () => {
      events.emit(BIDDER_DONE, {type: BIDDER_DONE})
      expect(global.window.atmtdAnalytics.bidderDoneHandler.called).to.equal(true)
    });

    it('Should call the bidWonHandler when the bidWon event is fired', () => {
      events.emit(BID_WON, {type: BID_WON})
      expect(global.window.atmtdAnalytics.bidWonHandler.called).to.equal(true)
    });

    it('Should call the noBidHandler when the noBid event is fired', () => {
      events.emit(NO_BID, {type: NO_BID})
      expect(global.window.atmtdAnalytics.noBidHandler.called).to.equal(true)
    });

    it('Should call the bidTimeoutHandler when the bidTimeout event is fired', () => {
      events.emit(BID_TIMEOUT, {type: BID_TIMEOUT})
      expect(global.window.atmtdAnalytics.bidderTimeoutHandler.called).to.equal(true)
    });

    it('Should call the auctionDebugHandler when the auctionDebug event is fired', () => {
      events.emit(AUCTION_DEBUG, {type: AUCTION_DEBUG})
      expect(global.window.atmtdAnalytics.auctionDebugHandler.called).to.equal(true)
    });
  });

  describe('Behaviour of the adapter when the SDK has not loaded', () => {
    before(() => {
      spec.enableAnalytics(CONFIG_WITH_DEBUG);
    })
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(events, 'getEvents').returns([]);
      sandbox.stub(utils, 'logMessage');
      sandbox.stub(utils, 'logError');

      global.window.atmtdAnalytics = undefined
      exports.__atmtdAnalyticsQueue.length = 0
      sandbox.stub(exports.__atmtdAnalyticsQueue, 'push').callsFake((args) => {
        Array.prototype.push.apply(exports.__atmtdAnalyticsQueue, [args]);
      })
    });
    afterEach(() => {
      sandbox.restore();
    });
    after(() => {
      spec.disableAnalytics();
    })

    it('Should push to the que when the auctionInit event is fired', () => {
      events.emit(AUCTION_INIT, {type: AUCTION_INIT})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(AUCTION_INIT)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(AUCTION_INIT)
    });

    it('Should push to the que when the bidResponse event is fired', () => {
      events.emit(BID_RESPONSE, {type: BID_RESPONSE})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(BID_RESPONSE)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(BID_RESPONSE)
    });

    it('Should push to the que when the bidRequested event is fired', () => {
      events.emit(BID_REQUESTED, {type: BID_REQUESTED})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(BID_REQUESTED)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(BID_REQUESTED)
    });

    it('Should push to the que when the bidRejected event is fired', () => {
      events.emit(BID_REJECTED, {type: BID_REJECTED})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(BID_REJECTED)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(BID_REJECTED)
    });

    it('Should push to the que when the bidderDone event is fired', () => {
      events.emit(BIDDER_DONE, {type: BIDDER_DONE})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(BIDDER_DONE)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(BIDDER_DONE)
    });

    it('Should push to the que when the bidWon event is fired', () => {
      events.emit(BID_WON, {type: BID_WON})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(BID_WON)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(BID_WON)
    });

    it('Should push to the que when the noBid event is fired', () => {
      events.emit(NO_BID, {type: NO_BID})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(NO_BID)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(NO_BID)
    });

    it('Should push to the que when the auctionDebug is fired', () => {
      events.emit(AUCTION_DEBUG, {type: AUCTION_DEBUG})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(AUCTION_DEBUG)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(AUCTION_DEBUG)
    });

    it('Should push to the que when the bidderTimeout event is fired', () => {
      events.emit(BID_TIMEOUT, {type: BID_TIMEOUT})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(BID_TIMEOUT)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(BID_TIMEOUT)
    });
  });

  describe('Behaviour of the adapter when the SDK has loaded midway', () => {
    before(() => {
      spec.enableAnalytics(CONFIG_WITH_DEBUG);
    })
    beforeEach(() => {
      sandbox = sinon.createSandbox();

      global.window.atmtdAnalytics = undefined

      exports.qBeingUsed = undefined
      exports.qTraversalComplete = undefined
      exports.queuePointer = 0
      exports.retryCount = 0
      exports.__atmtdAnalyticsQueue.length = 0

      clock = sandbox.useFakeTimers();

      sandbox.spy(exports.__atmtdAnalyticsQueue, 'push')
    });
    afterEach(() => {
      sandbox.restore();
    });
    after(() => {
      spec.disableAnalytics();
    })

    it('Should push to the que when the auctionInit event is fired and push to the que even after SDK has loaded after auctionInit event', () => {
      events.emit(BID_RESPONSE, {type: BID_RESPONSE})
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(BID_RESPONSE)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(BID_RESPONSE)
      expect(exports.qBeingUsed).to.equal(true)
      expect(exports.qTraversalComplete).to.equal(undefined)
      global.window.atmtdAnalytics = obj
      events.emit(BID_RESPONSE, {type: BID_RESPONSE})
      expect(exports.__atmtdAnalyticsQueue.push.calledTwice).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[1]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[1][0]).to.equal(BID_RESPONSE)
      expect(exports.__atmtdAnalyticsQueue[1][1].type).to.equal(BID_RESPONSE)
      expect(exports.qBeingUsed).to.equal(true)
      expect(exports.qTraversalComplete).to.equal(undefined)
    });

    it('Should push to the que when the auctionInit event is fired and push to the analytics adapter handler after the que is processed', () => {
      expect(exports.qBeingUsed).to.equal(undefined)
      events.emit(AUCTION_INIT, {type: AUCTION_INIT})
      global.window.atmtdAnalytics = {...obj}
      const handlers = global.window.atmtdAnalytics
      Object.keys(handlers).forEach((handler) => global.window.atmtdAnalytics[handler].reset())
      expect(exports.__atmtdAnalyticsQueue.push.called).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(1)
      expect(exports.__atmtdAnalyticsQueue[0]).to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue[0][0]).to.equal(AUCTION_INIT)
      expect(exports.__atmtdAnalyticsQueue[0][1].type).to.equal(AUCTION_INIT)
      expect(exports.qBeingUsed).to.equal(true)
      expect(exports.qTraversalComplete).to.equal(undefined)
      expect(global.window.atmtdAnalytics.auctionInitHandler.callCount).to.equal(0)
      clock.tick(2000)
      expect(exports.qBeingUsed).to.equal(true)
      expect(exports.qTraversalComplete).to.equal(undefined)
      events.emit(NO_BID, {type: NO_BID})
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue.push.calledTwice).to.equal(true)
      clock.tick(1500)
      expect(exports.qBeingUsed).to.equal(false)
      expect(exports.qTraversalComplete).to.equal(true)
      events.emit(BID_RESPONSE, {type: BID_RESPONSE})
      expect(exports.__atmtdAnalyticsQueue).to.be.an('array').to.have.lengthOf(2)
      expect(exports.__atmtdAnalyticsQueue.push.calledTwice).to.equal(true)
      expect(exports.__atmtdAnalyticsQueue.push.calledThrice).to.equal(false)
      expect(global.window.atmtdAnalytics.auctionInitHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.noBidHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.bidResponseHandler.calledOnce).to.equal(true)
    });
  });

  describe('Process Events from Que when SDK still has not loaded', () => {
    before(() => {
      spec.enableAnalytics({
        provider: 'atmtdAnalyticsAdapter',
        options: {
          publisherID: '230',
          siteID: '421'
        }
      });
      global.window.atmtdAnalytics = undefined

      sandbox.stub(exports.__atmtdAnalyticsQueue, 'push').callsFake((args) => {
        Array.prototype.push.apply(exports.__atmtdAnalyticsQueue, [args]);
      })
      exports.queuePointer = 0;
      exports.retryCount = 0;
    })
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(events, 'getEvents').returns([]);
      sandbox.spy(exports, 'prettyLog')
      sandbox.spy(exports, 'processEvents')

      clock = sandbox.useFakeTimers();
      exports.__atmtdAnalyticsQueue.length = 0
    });
    afterEach(() => {
      sandbox.restore();
      exports.queuePointer = 0;
      exports.retryCount = 0;
      spec.disableAnalytics();
    })

    it('Should retry processing auctionInit in certain intervals', () => {
      expect(exports.queuePointer).to.equal(0)
      expect(exports.retryCount).to.equal(0)
      const que = [[AUCTION_INIT, {type: AUCTION_INIT}]]
      exports.__atmtdAnalyticsQueue.push(que[0])
      exports.processEvents()
      expect(exports.prettyLog.getCall(0).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(0).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 1`)
      expect(exports.prettyLog.getCall(1).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(1).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 1500ms ...`)
      clock.tick(1510)
      expect(exports.prettyLog.getCall(2).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(2).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 2`)
      expect(exports.prettyLog.getCall(3).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(3).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 3000ms ...`)
      clock.tick(3010)
      expect(exports.prettyLog.getCall(4).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(4).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 3`)
      expect(exports.prettyLog.getCall(5).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(5).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 5000ms ...`)
      clock.tick(5010)
      expect(exports.prettyLog.getCall(6).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(6).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 4`)
      expect(exports.prettyLog.getCall(7).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(7).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 10000ms ...`)
      clock.tick(10010)
      expect(exports.prettyLog.getCall(8).args[0]).to.equal('error')
      expect(exports.prettyLog.getCall(8).args[1]).to.equal(`Aggregator still hasn't loaded. Processing que stopped`)
      expect(exports.queuePointer).to.equal(0)
      expect(exports.processEvents.callCount).to.equal(5)
    })

    it('Should retry processing slotRenderEnded in certain intervals', () => {
      expect(exports.queuePointer).to.equal(0)
      expect(exports.retryCount).to.equal(0)
      const que = [['slotRenderEnded', {type: 'slotRenderEnded'}]]
      exports.__atmtdAnalyticsQueue.push(que[0])
      exports.processEvents()
      expect(exports.prettyLog.getCall(0).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(0).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 1`)
      expect(exports.prettyLog.getCall(1).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(1).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 1500ms ...`)
      clock.tick(1510)
      expect(exports.prettyLog.getCall(2).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(2).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 2`)
      expect(exports.prettyLog.getCall(3).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(3).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 3000ms ...`)
      clock.tick(3010)
      expect(exports.prettyLog.getCall(4).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(4).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 3`)
      expect(exports.prettyLog.getCall(5).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(5).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 5000ms ...`)
      clock.tick(5010)
      expect(exports.prettyLog.getCall(6).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(6).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 4`)
      expect(exports.prettyLog.getCall(7).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(7).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 10000ms ...`)
      clock.tick(10010)
      expect(exports.prettyLog.getCall(8).args[0]).to.equal('error')
      expect(exports.prettyLog.getCall(8).args[1]).to.equal(`Aggregator still hasn't loaded. Processing que stopped`)
      expect(exports.queuePointer).to.equal(0)
      expect(exports.processEvents.callCount).to.equal(5)
    })

    it('Should retry processing impressionViewable in certain intervals', () => {
      expect(exports.queuePointer).to.equal(0)
      expect(exports.retryCount).to.equal(0)
      const que = [['impressionViewable', {type: 'impressionViewable'}]]
      exports.__atmtdAnalyticsQueue.push(que[0])
      exports.processEvents()
      expect(exports.prettyLog.getCall(0).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(0).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 1`)
      expect(exports.prettyLog.getCall(1).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(1).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 1500ms ...`)
      clock.tick(1510)
      expect(exports.prettyLog.getCall(2).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(2).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 2`)
      expect(exports.prettyLog.getCall(3).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(3).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 3000ms ...`)
      clock.tick(3010)
      expect(exports.prettyLog.getCall(4).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(4).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 3`)
      expect(exports.prettyLog.getCall(5).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(5).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 5000ms ...`)
      clock.tick(5010)
      expect(exports.prettyLog.getCall(6).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(6).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 4`)
      expect(exports.prettyLog.getCall(7).args[0]).to.equal('warn')
      expect(exports.prettyLog.getCall(7).args[1]).to.equal(`Adapter failed to process event as aggregator has not loaded. Retrying in 10000ms ...`)
      clock.tick(10010)
      expect(exports.prettyLog.getCall(8).args[0]).to.equal('error')
      expect(exports.prettyLog.getCall(8).args[1]).to.equal(`Aggregator still hasn't loaded. Processing que stopped`)
      expect(exports.queuePointer).to.equal(0)
      expect(exports.processEvents.callCount).to.equal(5)
    })
  });

  describe('Process Events from Que when SDK has loaded', () => {
    before(() => {
      spec.enableAnalytics({
        provider: 'atmtdAnalyticsAdapter',
        options: {
          publisherID: '230',
          siteID: '421'
        }
      });
      sandbox = sinon.createSandbox();
      const obj = {
        auctionInitHandler: (args) => {},
        bidResponseHandler: (args) => {},
        bidderDoneHandler: (args) => {},
        bidWonHandler: (args) => {},
        noBidHandler: (args) => {},
        auctionDebugHandler: (args) => {},
        bidderTimeoutHandler: (args) => {},
        impressionViewableHandler: (args) => {},
        slotRenderEndedGPTHandler: (args) => {},
        bidRequestedHandler: (args) => {},
        bidRejectedHandler: (args) => {}
      }

      global.window.atmtdAnalytics = obj;

      Object.keys(obj).forEach((fn) => sandbox.spy(global.window.atmtdAnalytics, fn))
      sandbox.stub(events, 'getEvents').returns([]);
      sandbox.spy(exports, 'prettyLog')
      exports.retryCount = 0;
      exports.queuePointer = 0;
      exports.__atmtdAnalyticsQueue = [
        [AUCTION_INIT, {type: AUCTION_INIT}],
        [BID_RESPONSE, {type: BID_RESPONSE}],
        [BID_REQUESTED, {type: BID_REQUESTED}],
        [BID_REJECTED, {type: BID_REJECTED}],
        [NO_BID, {type: NO_BID}],
        [BID_WON, {type: BID_WON}],
        [BIDDER_DONE, {type: BIDDER_DONE}],
        [AUCTION_DEBUG, {type: AUCTION_DEBUG}],
        [BID_TIMEOUT, {type: BID_TIMEOUT}],
        ['slotRenderEnded', {type: 'slotRenderEnded'}],
        ['impressionViewable', {type: 'impressionViewable'}]
      ]
    });
    afterEach(() => {
      sandbox.restore();
    })
    after(() => {
      spec.disableAnalytics();
    })

    it('Should make calls to appropriate SDK event handlers', () => {
      exports.processEvents()
      expect(exports.prettyLog.getCall(0).args[0]).to.equal('status')
      expect(exports.prettyLog.getCall(0).args[1]).to.equal(`Que has been inactive for a while. Adapter starting to process que now... Trial Count = 1`)
      expect(exports.retryCount).to.equal(0)
      expect(exports.prettyLog.callCount).to.equal(1)
      expect(exports.queuePointer).to.equal(exports.__atmtdAnalyticsQueue.length)
      expect(global.window.atmtdAnalytics.auctionInitHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.bidResponseHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.bidRejectedHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.bidRequestedHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.noBidHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.bidWonHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.auctionDebugHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.bidderTimeoutHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.bidderDoneHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.slotRenderEndedGPTHandler.calledOnce).to.equal(true)
      expect(global.window.atmtdAnalytics.impressionViewableHandler.calledOnce).to.equal(true)
    })
  });

  describe('Prettylog fn tests', () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox()
      sandbox.spy(utils, 'logInfo')
      sandbox.spy(utils, 'logError')
      exports.isLoggingEnabled = true
    })

    afterEach(() => {
      sandbox.restore()
    })

    it('Should call logMessage once in normal mode', () => {
      exports.prettyLog('status', 'Hello world')
      expect(utils.logInfo.callCount).to.equal(1)
    })

    it('Should call logMessage twice in group mode and have the cb called', () => {
      const spy = sandbox.spy()
      exports.prettyLog('status', 'Hello world', true, spy)
      expect(utils.logInfo.callCount).to.equal(2)
      expect(spy.called).to.equal(true)
    })

    it('Should call logMessage twice in group mode and have the cb which throws an error', () => {
      const spy = sandbox.stub().throws()
      exports.prettyLog('status', 'Hello world', true, spy)
      expect(utils.logInfo.callCount).to.equal(2)
      expect(utils.logError.called).to.equal(true)
    })
  });
});
