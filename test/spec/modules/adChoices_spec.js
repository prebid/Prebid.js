import {
  setAdChoicesConfig,
  resetAdChoicesData,
  getAdChoicesSignal,
  enrichFPDHook,
  requestBidsHook,
  PMC_EXTENSION_LOADED,
  PMC_GET_AD_PREFERENCES,
  PMC_AD_PREFERENCES,
} from 'modules/adChoices.js';
import * as utils from 'src/utils.js';
import { getHook } from 'src/hook.js';

const expect = require('chai').expect;

const SIGNAL = 'ADCHOICES_SIGNAL_STRING';
const STATIC_SIGNAL = 'STATIC_SIGNAL_STRING';

function dispatchPMC(type, data, source = window) {
  // dispatchEvent delivers synchronously, so handlers run before we assert.
  window.dispatchEvent(new MessageEvent('message', { data: { type, data }, source }));
}

function callEnrichHook() {
  let result;
  enrichFPDHook((res) => { result = res; }, Promise.resolve({}));
  return result;
}

describe('adChoices', function () {
  let sandbox;

  beforeEach(function () {
    resetAdChoicesData();
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logInfo');
    sandbox.stub(utils, 'logWarn');
  });

  afterEach(function () {
    sandbox.restore();
    resetAdChoicesData();
  });

  describe('setAdChoicesConfig', function () {
    it('enables with no signal when given empty config', function () {
      setAdChoicesConfig({});
      expect(getAdChoicesSignal()).to.equal(undefined);
    });

    it('stores a statically supplied signal', function () {
      setAdChoicesConfig({ signal: STATIC_SIGNAL });
      expect(getAdChoicesSignal()).to.equal(STATIC_SIGNAL);
    });

    it('ignores a non-string / empty static signal', function () {
      setAdChoicesConfig({ signal: '' });
      expect(getAdChoicesSignal()).to.equal(undefined);
      setAdChoicesConfig({ signal: 123 });
      expect(getAdChoicesSignal()).to.equal(undefined);
    });

    it('tolerates being called with undefined', function () {
      expect(() => setAdChoicesConfig(undefined)).to.not.throw();
      expect(getAdChoicesSignal()).to.equal(undefined);
    });
  });

  describe('Protect My Choices extension protocol', function () {
    it('requests ad preferences proactively when enabled', function () {
      const postSpy = sandbox.spy(window, 'postMessage');
      setAdChoicesConfig({});
      expect(postSpy.calledWithMatch({ type: PMC_GET_AD_PREFERENCES })).to.equal(true);
    });

    it('requests ad preferences when ExtensionLoaded is received', function () {
      setAdChoicesConfig({});
      const postSpy = sandbox.spy(window, 'postMessage');
      dispatchPMC(PMC_EXTENSION_LOADED);
      expect(postSpy.calledWithMatch({ type: PMC_GET_AD_PREFERENCES })).to.equal(true);
    });

    it('stores a valid signal delivered via AdPreferences', function () {
      setAdChoicesConfig({});
      dispatchPMC(PMC_AD_PREFERENCES, SIGNAL);
      expect(getAdChoicesSignal()).to.equal(SIGNAL);
    });

    it('ignores a malformed AdPreferences payload', function () {
      setAdChoicesConfig({});
      dispatchPMC(PMC_AD_PREFERENCES, { not: 'a string' });
      expect(getAdChoicesSignal()).to.equal(undefined);
    });

    it('ignores messages that did not originate from this window', function () {
      setAdChoicesConfig({});
      dispatchPMC(PMC_AD_PREFERENCES, SIGNAL, null);
      expect(getAdChoicesSignal()).to.equal(undefined);
    });

    it('ignores messages with no usable data', function () {
      setAdChoicesConfig({});
      window.dispatchEvent(new MessageEvent('message', { data: null, source: window }));
      window.dispatchEvent(new MessageEvent('message', { data: 'a string', source: window }));
      expect(getAdChoicesSignal()).to.equal(undefined);
    });

    it('prefers a static signal over the extension-read value', function () {
      setAdChoicesConfig({ signal: STATIC_SIGNAL });
      dispatchPMC(PMC_AD_PREFERENCES, SIGNAL);
      expect(getAdChoicesSignal()).to.equal(STATIC_SIGNAL);
    });
  });

  describe('FPD enrichment (regs.ext.adchoices)', function () {
    it('sets regs.ext.adchoices from the extension signal', function () {
      setAdChoicesConfig({});
      dispatchPMC(PMC_AD_PREFERENCES, SIGNAL);
      return callEnrichHook().then(ortb2 => {
        expect(ortb2.regs.ext.adchoices).to.equal(SIGNAL);
      });
    });

    it('sets regs.ext.adchoices from a static signal', function () {
      setAdChoicesConfig({ signal: STATIC_SIGNAL });
      return callEnrichHook().then(ortb2 => {
        expect(ortb2.regs.ext.adchoices).to.equal(STATIC_SIGNAL);
      });
    });

    it('does not set anything when no signal is available', function () {
      setAdChoicesConfig({});
      return callEnrichHook().then(ortb2 => {
        expect(ortb2).to.eql({});
      });
    });
  });

  describe('requestBidsHook (auction delay)', function () {
    it('proceeds synchronously when no timeout is configured (non-blocking)', function () {
      setAdChoicesConfig({});
      let proceeded = false;
      requestBidsHook(() => { proceeded = true; }, {});
      expect(proceeded).to.equal(true);
    });

    it('proceeds immediately when a signal is already available, even with a timeout', function () {
      setAdChoicesConfig({ signal: STATIC_SIGNAL, timeout: 1000 });
      let proceeded = false;
      requestBidsHook(() => { proceeded = true; }, {});
      expect(proceeded).to.equal(true);
    });

    it('waits for the signal then proceeds when a timeout is configured', function (done) {
      setAdChoicesConfig({ timeout: 1000 });
      let proceeded = false;
      requestBidsHook(() => { proceeded = true; }, {});
      expect(proceeded).to.equal(false);
      dispatchPMC(PMC_AD_PREFERENCES, SIGNAL);
      setTimeout(() => {
        expect(proceeded).to.equal(true);
        done();
      }, 0);
    });

    it('proceeds after the timeout elapses when no signal arrives', function (done) {
      setAdChoicesConfig({ timeout: 20 });
      let proceeded = false;
      requestBidsHook(() => { proceeded = true; }, {});
      expect(proceeded).to.equal(false);
      setTimeout(() => {
        expect(proceeded).to.equal(true);
        done();
      }, 60);
    });

    it('starts the timeout window when an auction waits, not at config time', function (done) {
      setAdChoicesConfig({ timeout: 30 });
      // Let more than the timeout pass before any auction runs.
      setTimeout(() => {
        let proceeded = false;
        requestBidsHook(() => { proceeded = true; }, {});
        // The window should start now, so the auction is still waiting (not expired).
        expect(proceeded).to.equal(false);
        dispatchPMC(PMC_AD_PREFERENCES, SIGNAL);
        setTimeout(() => {
          expect(proceeded).to.equal(true);
          done();
        }, 0);
      }, 60);
    });

    it('does not re-delay later auctions once the timeout has elapsed', function (done) {
      setAdChoicesConfig({ timeout: 20 });
      let first = false;
      requestBidsHook(() => { first = true; }, {});
      setTimeout(() => {
        expect(first).to.equal(true);
        // A subsequent auction must proceed immediately, not wait the timeout again.
        let second = false;
        requestBidsHook(() => { second = true; }, {});
        expect(second).to.equal(true);
        done();
      }, 60);
    });

    it('removes the requestBids hook on reset so it does not leak globally', function () {
      function installedCount() {
        return getHook('requestBids').getHooks({ hook: requestBidsHook }).length;
      }
      setAdChoicesConfig({ timeout: 100 });
      expect(installedCount()).to.equal(1);
      resetAdChoicesData();
      expect(installedCount()).to.equal(0);
      // It can be reinstalled cleanly after a reset.
      setAdChoicesConfig({ timeout: 100 });
      expect(installedCount()).to.equal(1);
    });
  });
});
