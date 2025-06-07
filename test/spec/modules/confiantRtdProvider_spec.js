import * as utils from '../../../src/utils.js';
import * as hook from '../../../src/hook.js'
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';

import confiantModule from '../../../modules/confiantRtdProvider.js';

const {
  injectConfigScript,
  setupPage,
  subscribeToConfiantCommFrame,
  registerConfiantSubmodule
} = confiantModule;

describe('Confiant RTD module', function () {
  describe('setupPage()', function() {
    let logErrorStub;
    beforeEach(function() {
      logErrorStub = sinon.stub(utils, 'logError');
    });
    afterEach(function() {
      logErrorStub.restore();
    });

    it('should return false if propertId is not present in config', function() {
      expect(setupPage({})).to.be.false;
      expect(setupPage({ params: {} })).to.be.false;
      expect(setupPage({ params: { propertyId: '' } })).to.be.false;
      expect(logErrorStub.callCount).to.equal(3);
    });

    it('should return true if expected parameters are present', function() {
      expect(setupPage({ params: { propertyId: 'clientId' } })).to.be.true;
      expect(logErrorStub.callCount).to.equal(0);
    });
  });

  describe('Module initialization', function() {
    let insertElementStub;
    beforeEach(function() {
      insertElementStub = sinon.stub(utils, 'insertElement');
    });
    afterEach(function() {
      utils.insertElement.restore();
    });

    it('should subscribe to rovided Window object', function () {
      const mockWindow = { addEventListener: sinon.spy() };

      subscribeToConfiantCommFrame(mockWindow);

      sinon.assert.calledOnce(mockWindow.addEventListener);
    });

    it('should fire BillableEvent as a result for message in comm window', function() {
      let listenerCallback;
      const mockWindow = { addEventListener: (a, cb) => (listenerCallback = cb) };
      let billableEventsCounter = 0;
      const propertyId = 'fff';

      events.on(EVENTS.BILLABLE_EVENT, (e) => {
        if (e.vendor === 'confiant') {
          billableEventsCounter++;
          expect(e.type).to.equal('impression');
          expect(e.billingId).to.be.a('number');
          expect(e.auctionId).to.equal('auctionId');
          expect(e.transactionId).to.equal('transactionId');
        }
      });

      subscribeToConfiantCommFrame(mockWindow, propertyId);
      listenerCallback({
        data: {
          type: 'cnft:reportBillableEvent:' + propertyId,
          auctionId: 'auctionId',
          transactionId: 'transactionId'
        }
      });
      listenerCallback({
        data: {
          type: 'cnft:reportBillableEvent:' + propertyId,
          auctionId: 'auctionId',
          transactionId: 'transactionId'
        }
      });

      expect(billableEventsCounter).to.equal(2);
    });
  });

  describe('Sumbodule execution', function() {
    let submoduleStub;
    let insertElementStub;
    beforeEach(function () {
      submoduleStub = sinon.stub(hook, 'submodule');
      insertElementStub = sinon.stub(utils, 'insertElement');
    });
    afterEach(function () {
      utils.insertElement.restore();
      submoduleStub.restore();
    });

    function initModule() {
      registerConfiantSubmodule();

      expect(submoduleStub.calledOnceWith('realTimeData')).to.equal(true);

      const registeredSubmoduleDefinition = submoduleStub.getCall(0).args[1];
      expect(registeredSubmoduleDefinition).to.be.an('object');
      expect(registeredSubmoduleDefinition).to.have.own.property('name', 'confiant');
      expect(registeredSubmoduleDefinition).to.have.own.property('init').that.is.a('function');

      return registeredSubmoduleDefinition;
    }

    it('should register Confiant submodule', function () {
      initModule();
    });
  });
});
