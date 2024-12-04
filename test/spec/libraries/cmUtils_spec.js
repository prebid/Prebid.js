import * as utils from 'src/utils.js';
import {lookupConsentData, consentManagementHook} from '../../../libraries/consentManagement/cmUtils';

describe('consent management utils', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    ['logError', 'logInfo', 'logWarn'].forEach(n => sandbox.stub(utils, n));
  });
  afterEach(() => {
    sandbox.restore();
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
        error: Object.assign(new Error('mock-error'), {args: ['arg1', 'arg2']}),
        check(logger) {
          sinon.assert.calledWith(logger, sinon.match('mock-error'), 'arg1', 'arg2');
        }
      },
      'no error': {
        check() {
        }
      }
    }).forEach(([errorDesc, {error, check: checkLogs}]) => {
      describe(`when loadConsentData rejects with ${errorDesc}`, () => {
        beforeEach(async () => {
          loadResult = Promise.reject(error);
        });
        afterEach(() => {
          checkLogs(utils.logError);
        });
        it('should log an error and run bidsBackHandler', async () => {
          const bidsBackHandler = sinon.stub();
          cmHook(next, {bidsBackHandler});
          await loadResult.catch(() => null);
          sinon.assert.calledWith(utils.logError, sinon.match('Canceling auction'));
          sinon.assert.notCalled(next);
          sinon.assert.called(bidsBackHandler);
        });
        it('should not choke when bidsBackHandler is not present', async () => {
          cmHook(next, {});
          await loadResult.catch(() => null);
          sinon.assert.notCalled(next);
        });
      });
      describe(`when loadConsentData resolves with ${errorDesc}`, () => {
        function setupError() {
          loadResult = Promise.resolve({error});
        }
        function setupConsentAndError() {
          loadResult = Promise.resolve({consentData: {'consent': 'data'}, error});
        }
        Object.entries({
          'with': setupConsentAndError,
          'without': setupError
        }).forEach(([t, setup]) => {
          describe(`${t} consent`, () => {
            beforeEach(setup);
            it('should log a warning and continue auction', async () => {
              cmHook(next, {auction: 'args'});
              await loadResult;
              sinon.assert.calledWith(next, {auction: 'args'});
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
            sinon.assert.notCalled(utils.logWarn)
            sinon.assert.calledWith(utils.logInfo, sinon.match('already known'));
          })
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
          })
        })
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
        getConsentData: sinon.stub()
      };
      setupCmp = sinon.stub();
      cmpTimeout = 0;
      actionTimeout = null;
      getNullConsent = sinon.stub().returns({
        consent: null
      })
    })

    function runLookup() {
      return lookupConsentData({
        name,
        consentDataHandler,
        setupCmp,
        cmpTimeout,
        actionTimeout,
        getNullConsent
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
        sinon.assert.calledWith(consentDataHandler.setConsentData, null);
      }
    });

    [123, 0].forEach(timeout => {
      describe(`when cmpTimeout is ${timeout}`, () => {
        beforeEach(() => {
          cmpTimeout = timeout;
          setupCmp.callsFake(() => {
            consentDataHandler.getConsentData.returns({consent: 'data'});
            return Promise.resolve();
          });
        });

        it(`should resolve if cmp handler resolves`, async () => {
          const {consentData, error} = await runLookup();
          expect(consentData).to.eql({consent: 'data'});
          expect(error).to.not.exist;
        });

        it('should not time out after it resolves', async () => {
          await runLookup();
          await new Promise((resolve) => setTimeout(resolve, timeout + 10));
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
            setTimeout(resolve, 300)
          });
        });
      });
      [0, 100].forEach(timeout => {
        it(`should resolve with null consent after cmpTimeout ( = ${timeout}ms)`, async () => {
          cmpTimeout = timeout;
          const {consentData, error} = await runLookup();
          sinon.assert.calledWith(consentDataHandler.setConsentData, {consent: null});
          expect(consentData).to.eql({consent: null})
          expect(error.message).to.match(/.*CMP to load.*/)
        });
      });
      [0, 100].forEach(timeout => {
        it(`should resolve with provisional consent after actionTimeout (= ${timeout}) if cmpHandler provides it`, async () => {
          cmpTimeout = 100;
          actionTimeout = timeout;
          const lookup = runLookup();
          await new Promise((resolve) => setTimeout(resolve, 10));
          setProvisionalConsent({consent: 'provisional'});
          const {consentData, error} = await lookup;
          expect(consentData).to.eql({consent: 'provisional'});
          expect(error.message).to.match(/.*action.*/)
        });
      });

      it('should not reset action timeout if provisional consent is updated multiple times', (done) => {
        actionTimeout = 100;
        let consentData;
        runLookup().then((res) => {
          consentData = res.consentData;
        })
        setProvisionalConsent({consent: 1});
        setTimeout(() => setProvisionalConsent({consent: 2}), 20);
        setTimeout(() => {
          expect(consentData).to.eql({consent: 2});
          done();
        }, 100)
      })
    });
  });
});
