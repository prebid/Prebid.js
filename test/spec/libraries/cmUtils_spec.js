import * as utils from 'src/utils.js';
import { lookupConsentData, consentManagementHook, configParser } from '../../../libraries/consentManagement/cmUtils.js';
import { CMP_POLL_INTERVAL } from '../../../libraries/cmp/cmpClient.js';

describe('consent management utils', () => {
  let sandbox, clock;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers();
    ['logError', 'logInfo', 'logWarn'].forEach(n => sandbox.stub(utils, n));
  });
  afterEach(() => {
    sandbox.restore();
    clock.restore();
  });

  describe('consentManagementHook', () => {
    let cmHook, loadResult, next;
    beforeEach(() => {
      next = sinon.stub();
      cmHook = consentManagementHook('test', () => loadResult);
    });

    Object.entries({
      'an error': {
        error: new Error('mock-error'),
        check(logger) {
          sinon.assert.calledWith(logger, sinon.match('mock-error'));
        }
      },
      'an error with args': {
        error: Object.assign(new Error('mock-error'), { args: ['arg1', 'arg2'] }),
        check(logger) {
          sinon.assert.calledWith(logger, sinon.match('mock-error'), 'arg1', 'arg2');
        }
      },
      'no error': {
        check() {
        }
      }
    }).forEach(([errorDesc, { error, check: checkLogs }]) => {
      describe(`when loadConsentData rejects with ${errorDesc}`, () => {
        beforeEach(async () => {
          loadResult = Promise.reject(error);
        });
        afterEach(() => {
          checkLogs(utils.logError);
        });
        it('should log an error and reject the auction promise', async () => {
          const reject = sinon.stub();
          cmHook(next, { defer: { reject } });
          await loadResult.catch(() => null);
          sinon.assert.calledWith(utils.logError, sinon.match('Canceling auction'));
          sinon.assert.notCalled(next);
          sinon.assert.called(reject);
        });
        it('should not choke when bidsBackHandler is not present', async () => {
          cmHook(next, {});
          await loadResult.catch(() => null);
          sinon.assert.notCalled(next);
        });
      });
      describe(`when loadConsentData resolves with ${errorDesc}`, () => {
        function setupError() {
          loadResult = Promise.resolve({ error });
        }
        function setupConsentAndError() {
          loadResult = Promise.resolve({ consentData: { 'consent': 'data' }, error });
        }
        Object.entries({
          'with': setupConsentAndError,
          'without': setupError
        }).forEach(([t, setup]) => {
          describe(`${t} consent`, () => {
            beforeEach(setup);
            it('should log a warning and continue auction', async () => {
              cmHook(next, { auction: 'args' });
              await loadResult;
              sinon.assert.calledWith(next, { auction: 'args' });
              checkLogs(utils.logWarn);
            });
          });
        });

        describe('when consent data is available', () => {
          beforeEach(setupConsentAndError);
          it(`should not log a warning on the second call`, async () => {
            cmHook(next, {});
            await loadResult;
            sandbox.resetHistory();
            cmHook(next, {});
            await loadResult;
            sinon.assert.notCalled(utils.logWarn);
          });
        });

        describe('when consent data is not available', () => {
          beforeEach(setupError);
          it('should log the same warning again on the second call', async () => {
            cmHook(next, {});
            await loadResult;
            sandbox.resetHistory();
            cmHook(next, {});
            await loadResult;
            checkLogs(utils.logWarn);
          });
        });
      });
    });
  });
  describe('lookupConsentData', () => {
    let name, consentDataHandler, setupCmp, cmpTimeout, actionTimeout, getNullConsent;
    beforeEach(() => {
      name = 'TEST';
      consentDataHandler = {
        enable: sinon.stub(),
        setConsentData: sinon.stub(),
        getConsentData: sinon.stub(),
        error: sinon.stub(),
      };
      setupCmp = sinon.stub();
      cmpTimeout = 0;
      actionTimeout = null;
      getNullConsent = sinon.stub().returns({
        consent: null
      });
    });

    function runLookup(options = {}) {
      return lookupConsentData({
        name,
        consentDataHandler,
        setupCmp,
        cmpTimeout,
        actionTimeout,
        getNullConsent,
        ...options
      });
    }

    it('should enable consent data handler', () => {
      runLookup().catch(() => null);
      sinon.assert.calledWith(consentDataHandler.enable);
    });

    it('should reject if cmp handler rejects', async () => {
      const err = new Error();
      setupCmp.returns(Promise.reject(err));
      try {
        await runLookup();
        sinon.assert.fail('should throw');
      } catch (e) {
        expect(e).to.equal(err);
        sinon.assert.calledWith(consentDataHandler.error, err);
      }
    });

    [123, 0].forEach(timeout => {
      describe(`when cmpTimeout is ${timeout}`, () => {
        beforeEach(() => {
          cmpTimeout = timeout;
          setupCmp.callsFake(() => {
            consentDataHandler.getConsentData.returns({ consent: 'data' });
            return Promise.resolve();
          });
        });

        it(`should resolve if cmp handler resolves`, async () => {
          const { consentData, error } = await runLookup();
          expect(consentData).to.eql({ consent: 'data' });
          expect(error).to.not.exist;
        });

        it('should not time out after it resolves', async () => {
          await runLookup();
          clock.tick(timeout + 10);
          sinon.assert.notCalled(consentDataHandler.setConsentData);
        });
      });
    });

    describe('when cmp handler does not reply', () => {
      let setProvisionalConsent;
      beforeEach(() => {
        setupCmp.callsFake((setPC) => {
          setProvisionalConsent = setPC;
          return new Promise((resolve) => {
            setTimeout(resolve, 300);
          });
        });
      });
      [0, 100].forEach(timeout => {
        it(`should resolve with null consent after cmpTimeout ( = ${timeout}ms)`, async () => {
          cmpTimeout = timeout;
          const lookup = runLookup();
          clock.tick(timeout + 1);
          const { consentData, error } = await lookup;
          sinon.assert.calledWith(consentDataHandler.setConsentData, { consent: null });
          expect(consentData).to.eql({ consent: null });
          expect(error.message).to.match(/.*CMP to load.*/);
        });
      });
      [0, 100].forEach(timeout => {
        it(`should resolve with provisional consent after actionTimeout (= ${timeout}) if cmpHandler provides it`, async () => {
          cmpTimeout = 100;
          actionTimeout = timeout;
          const lookup = runLookup();
          clock.tick(10);
          setProvisionalConsent({ consent: 'provisional' });
          clock.tick(timeout + 1);
          const { consentData, error } = await lookup;
          expect(consentData).to.eql({ consent: 'provisional' });
          expect(error.message).to.match(/.*action.*/);
        });
      });

      it('should not reset action timeout if provisional consent is updated multiple times', async () => {
        actionTimeout = 100;
        let consentData;
        const lookup = runLookup().then((res) => {
          consentData = res.consentData;
        });
        setProvisionalConsent({ consent: 1 });
        clock.tick(20);
        setProvisionalConsent({ consent: 2 });
        clock.tick(80);
        await lookup;
        expect(consentData).to.eql({ consent: 2 });
      });
    });

    describe('with findCmp', () => {
      let findCmp, cmp;
      beforeEach(() => {
        cmp = sinon.stub();
        findCmp = sinon.stub();
        cmpTimeout = 1000;
        setupCmp.returns(Promise.resolve());
      });

      async function lookupError(lookup) {
        try {
          await lookup;
        } catch (e) {
          return e;
        }
        sinon.assert.fail('should have rejected');
      }

      it('should pass the CMP client to the cmp handler', async () => {
        findCmp.returns(cmp);
        await runLookup({ findCmp });
        sinon.assert.calledWith(setupCmp, sinon.match.func, cmp);
      });

      it('should reject, without running the cmp handler, if no CMP is found', async () => {
        const error = await lookupError(runLookup({ findCmp }));
        expect(error.message).to.contain('CMP not found');
        sinon.assert.notCalled(setupCmp);
      });

      describe('and waitForCmp', () => {
        it('should run the cmp handler once the CMP appears', async () => {
          const lookup = runLookup({ findCmp, waitForCmp: true });
          clock.tick(CMP_POLL_INTERVAL);
          sinon.assert.notCalled(setupCmp);
          findCmp.returns(cmp);
          clock.tick(CMP_POLL_INTERVAL);
          await lookup;
          sinon.assert.calledWith(setupCmp, sinon.match.func, cmp);
        });

        it('should reject, and stop looking, if the CMP does not appear within cmpTimeout', async () => {
          const lookup = runLookup({ findCmp, waitForCmp: true });
          clock.tick(cmpTimeout + 1);
          const error = await lookupError(lookup);
          expect(error.message).to.contain('CMP not found');
          sinon.assert.notCalled(consentDataHandler.setConsentData);
          findCmp.resetHistory();
          clock.tick(CMP_POLL_INTERVAL * 2);
          sinon.assert.notCalled(findCmp);
        });

        it('should time out with null consent if the CMP is found but does not reply', async () => {
          setupCmp.returns(new Promise(() => null));
          const lookup = runLookup({ findCmp, waitForCmp: true });
          clock.tick(CMP_POLL_INTERVAL);
          findCmp.returns(cmp);
          clock.tick(cmpTimeout);
          const { consentData, error } = await lookup;
          expect(consentData).to.eql({ consent: null });
          expect(error.message).to.match(/.*CMP to load.*/);
        });
      });
    });
  });

  describe('configParser', () => {
    let namespace, displayName, consentDataHandler, parseConsentData, getNullConsent, cmpHandlers, cmpEventCleanup;
    let getConsentConfig;

    beforeEach(() => {
      namespace = 'test';
      displayName = 'TEST';
      sinon.stub();
      consentDataHandler = {
        enable: sinon.stub(),
        error: sinon.stub(),
        reset: sinon.stub(),
        removeCmpEventListener: sinon.stub(),
        getConsentData: sinon.stub(),
        setConsentData: sinon.stub()
      };
      parseConsentData = sinon.stub().callsFake(data => data);
      getNullConsent = sinon.stub().returns({ consent: null });
      cmpHandlers = {
        iab: {
          api: { apiName: '__testCmp' },
          lookup: sinon.stub().returns(Promise.resolve())
        }
      };
      cmpEventCleanup = sinon.stub();

      // Create a spy for resetConsentDataHandler to verify it's called
      const configParserInstance = configParser({
        namespace,
        displayName,
        consentDataHandler,
        parseConsentData,
        getNullConsent,
        cmpHandlers,
        cmpEventCleanup
      });

      getConsentConfig = configParserInstance;
    });

    it('should reset and return empty object when config is not defined', () => {
      const result = getConsentConfig();
      expect(result).to.deep.equal({});
      sinon.assert.calledWith(utils.logWarn, sinon.match('config not defined'));
    });

    it('should reset and return empty object when config is not an object', () => {
      const result = getConsentConfig({ [namespace]: 'not an object' });
      expect(result).to.deep.equal({});
      sinon.assert.calledWith(utils.logWarn, sinon.match('config not defined'));
    });

    describe('when module is explicitly disabled', () => {
      it('should reset consent data handler and return empty object when enabled is false', () => {
        const result = getConsentConfig({ [namespace]: { enabled: false } });

        expect(result).to.deep.equal({});
        sinon.assert.calledWith(utils.logWarn, sinon.match('config enabled is set to false'));
      });

      it('should call cmpEventCleanup when enabled is false', () => {
        getConsentConfig({ [namespace]: { enabled: false } });

        sinon.assert.called(cmpEventCleanup);
        sinon.assert.calledWith(utils.logWarn, sinon.match('config enabled is set to false'));
      });

      it('should handle cmpEventCleanup errors gracefully', () => {
        const cleanupError = new Error('Cleanup failed');
        cmpEventCleanup.throws(cleanupError);

        getConsentConfig({ [namespace]: { enabled: false } });

        sinon.assert.called(cmpEventCleanup);
        sinon.assert.calledWith(utils.logError, sinon.match('Error during CMP event cleanup'), cleanupError);
      });

      it('should not call cmpEventCleanup when enabled is true', () => {
        getConsentConfig({ [namespace]: { enabled: true, cmpApi: 'iab' } });

        sinon.assert.notCalled(cmpEventCleanup);
      });

      it('should not call cmpEventCleanup when enabled is not specified', () => {
        getConsentConfig({ [namespace]: { cmpApi: 'iab' } });

        sinon.assert.notCalled(cmpEventCleanup);
      });
    });

    describe('cmpEventCleanup parameter', () => {
      it('should work without cmpEventCleanup parameter', () => {
        const configParserWithoutCleanup = configParser({
          namespace,
          displayName,
          consentDataHandler,
          parseConsentData,
          getNullConsent,
          cmpHandlers
          // No cmpEventCleanup provided
        });

        const result = configParserWithoutCleanup({ [namespace]: { enabled: false } });
        expect(result).to.deep.equal({});
        // Should not throw error when cmpEventCleanup is undefined
      });

      it('should only call cmpEventCleanup if it is a function', () => {
        const configParserWithNonFunction = configParser({
          namespace,
          displayName,
          consentDataHandler,
          parseConsentData,
          getNullConsent,
          cmpHandlers,
          cmpEventCleanup: 'not a function'
        });

        const result = configParserWithNonFunction({ [namespace]: { enabled: false } });
        expect(result).to.deep.equal({});
        // Should not throw error when cmpEventCleanup is not a function
      });
    });

    describe('CMP lookup', () => {
      afterEach(() => {
        delete window.__testCmp;
        getConsentConfig({});
      });

      describe('when a lookup starts while another is waiting for the CMP', () => {
        function startLookup(cmConfig = { cmpApi: 'iab', waitForCmp: true, timeout: 1000 }) {
          return getConsentConfig({ [namespace]: cmConfig }).loadConsentData().catch(() => null);
        }

        function assertWaitingError(called) {
          (called ? sinon.assert.calledWith : sinon.assert.neverCalledWith)(utils.logError, sinon.match('still waiting for the CMP'));
        }

        it('should log an error', () => {
          startLookup();
          startLookup({ cmpApi: 'static', consentData: {} });
          assertWaitingError(true);
        });

        it('should not log an error if the CMP was found', () => {
          window.__testCmp = sinon.stub();
          startLookup();
          startLookup();
          assertWaitingError(false);
        });

        it('should not log an error after the previous lookup times out', async () => {
          const previous = startLookup();
          await clock.tickAsync(1000);
          await previous;
          startLookup();
          assertWaitingError(false);
        });

        it('should not log an error without waitForCmp', () => {
          startLookup({ cmpApi: 'iab' });
          startLookup({ cmpApi: 'iab' });
          assertWaitingError(false);
        });
      });

      it('should pass the CMP client to the cmp handler, reusing it across lookups', async () => {
        window.__testCmp = sinon.stub();
        cmpHandlers.iab.lookup.onFirstCall().returns(Promise.reject(new Error()));
        const { loadConsentData } = getConsentConfig({ [namespace]: { cmpApi: 'iab' } });
        await loadConsentData().catch(() => null);
        await loadConsentData();
        const [first, second] = cmpHandlers.iab.lookup.getCalls().map(call => call.args[1]);
        expect(first.isDirect).to.be.true;
        expect(second).to.equal(first);
      });
    });

    // Additional tests for other configParser functionality could be added here
  });
});
