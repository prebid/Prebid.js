import * as utils from '../../../src/utils.js';
import * as hook from '../../../src/hook.js'
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';

import {
  MediaFilter,
  MEDIAFILTER_EVENT_TYPE,
  MEDIAFILTER_BASE_URL
} from '../../../modules/mediafilterRtdProvider.js';

describe('The Media Filter RTD module', function () {
  describe('register()', function() {
    let submoduleSpy, generateInitHandlerSpy;

    beforeEach(function () {
      submoduleSpy = sinon.spy(hook, 'submodule');
      generateInitHandlerSpy = sinon.spy(MediaFilter, 'generateInitHandler');
    });

    afterEach(function () {
      submoduleSpy.restore();
      generateInitHandlerSpy.restore();
    });

    it('should register and call the submodule function(s)', function () {
      MediaFilter.register();

      expect(submoduleSpy.calledOnceWithExactly('realTimeData', sinon.match.object)).to.be.true;
      expect(submoduleSpy.called).to.be.true;
      expect(generateInitHandlerSpy.called).to.be.true;
    });
  });

  describe('setup()', function() {
    let setupEventListenerSpy, setupScriptSpy;

    beforeEach(function() {
      setupEventListenerSpy = sinon.spy(MediaFilter, 'setupEventListener');
      setupScriptSpy = sinon.spy(MediaFilter, 'setupScript');
    });

    afterEach(function() {
      setupEventListenerSpy.restore();
      setupScriptSpy.restore();
    });

    it('should call setupEventListener and setupScript function(s)', function() {
      MediaFilter.setup({ configurationHash: 'abc123' });

      expect(setupEventListenerSpy.called).to.be.true;
      expect(setupScriptSpy.called).to.be.true;
    });
  });

  describe('setupEventListener()', function() {
    let setupEventListenerSpy, addEventListenerSpy;

    beforeEach(function() {
      setupEventListenerSpy = sinon.spy(MediaFilter, 'setupEventListener');
      addEventListenerSpy = sinon.spy(window, 'addEventListener');
    });

    afterEach(function() {
      setupEventListenerSpy.restore();
      addEventListenerSpy.restore();
    });

    it('should call addEventListener function(s)', function() {
      MediaFilter.setupEventListener();
      expect(addEventListenerSpy.called).to.be.true;
      expect(addEventListenerSpy.calledWith('message', sinon.match.func)).to.be.true;
    });
  });

  describe('generateInitHandler()', function() {
    let generateInitHandlerSpy, setupMock, logErrorSpy;

    beforeEach(function() {
      generateInitHandlerSpy = sinon.spy(MediaFilter, 'generateInitHandler');
      setupMock = sinon.stub(MediaFilter, 'setup').throws(new Error('Mocked error!'));
      logErrorSpy = sinon.spy(utils, 'logError');
    });

    afterEach(function() {
      generateInitHandlerSpy.restore();
      setupMock.restore();
      logErrorSpy.restore();
    });

    it('should handle errors in the catch block when setup throws an error', function() {
      const initHandler = MediaFilter.generateInitHandler();
      initHandler({});

      expect(logErrorSpy.calledWith('Error in initialization: Mocked error!')).to.be.true;
    });
  });

  describe('generateEventHandler()', function() {
    let generateEventHandlerSpy, eventsEmitSpy;

    beforeEach(function() {
      generateEventHandlerSpy = sinon.spy(MediaFilter, 'generateEventHandler');
      eventsEmitSpy = sinon.spy(events, 'emit');
    });

    afterEach(function() {
      generateEventHandlerSpy.restore();
      eventsEmitSpy.restore();
    });

    it('should emit a billable event when the event type matches', function() {
      const configurationHash = 'abc123';
      const eventHandler = MediaFilter.generateEventHandler(configurationHash);

      const mockEvent = {
        data: {
          type: MEDIAFILTER_EVENT_TYPE.concat('.', configurationHash)
        }
      };

      eventHandler(mockEvent);

      expect(eventsEmitSpy.calledWith(EVENTS.BILLABLE_EVENT, {
        'billingId': sinon.match.string,
        'configurationHash': configurationHash,
        'type': 'impression',
        'vendor': 'mediafilter',
      })).to.be.true;
    });

    it('should not emit a billable event when the event type does not match', function() {
      const configurationHash = 'abc123';
      const eventHandler = MediaFilter.generateEventHandler(configurationHash);

      const mockEvent = {
        data: {
          type: 'differentEventType'
        }
      };

      eventHandler(mockEvent);

      expect(eventsEmitSpy.called).to.be.false;
    });
  });
});
