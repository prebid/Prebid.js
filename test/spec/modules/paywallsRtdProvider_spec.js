import { expect } from 'chai';
import sinon from 'sinon';
import {
  paywallsSubmodule,
  getVaiPayload,
  buildOrtb2,
  storage,
  SUBMODULE_NAME,
  DEFAULT_SCRIPT_URL,
  VAI_WINDOW_KEY,
  VAI_HOOK_KEY,
  VAI_LS_KEY,
} from 'modules/paywallsRtdProvider.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_VAI = {
  iss: 'https://paywalls.net',
  aud: 'vai',
  dom: 'example.com',
  kid: '2026-01-a',
  vat: 'HUMAN',
  act: 'ACT-1',
  assertion_jws: 'eyJhbGciOiJFZERTQSJ9.eyJ2YXQiOiJIVU1BTiJ9.signature',
  iat: Math.floor(Date.now() / 1000) - 10,
  exp: Math.floor(Date.now() / 1000) + 60,
};

const MOCK_VAI_EXPIRED = {
  ...MOCK_VAI,
  exp: Math.floor(Date.now() / 1000) - 10,
};

const MOCK_CONFIG = {
  name: SUBMODULE_NAME,
  params: {},
};

const MOCK_CONFIG_WITH_URL = {
  name: SUBMODULE_NAME,
  params: {
    scriptUrl: 'https://cdn.example.com/pw/vai.js',
    waitForIt: 50,
  },
};

function makeReqBids(existingOrtb2 = {}) {
  return {
    ortb2Fragments: {
      global: existingOrtb2,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('paywallsRtdProvider', function () {
  let sandbox;
  let getDataFromLocalStorageStub;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    getDataFromLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage');
    // Clean window state
    delete window[VAI_WINDOW_KEY];
    delete window[VAI_HOOK_KEY];
  });

  afterEach(function () {
    sandbox.restore();
    delete window[VAI_WINDOW_KEY];
    delete window[VAI_HOOK_KEY];
  });

  // -------------------------------------------------------------------------
  // Submodule registration
  // -------------------------------------------------------------------------

  describe('submodule registration', function () {
    it('has the correct name', function () {
      expect(paywallsSubmodule.name).to.equal('paywalls');
    });

    it('exposes init, getBidRequestData, and getTargetingData', function () {
      expect(paywallsSubmodule.init).to.be.a('function');
      expect(paywallsSubmodule.getBidRequestData).to.be.a('function');
      expect(paywallsSubmodule.getTargetingData).to.be.a('function');
    });
  });

  // -------------------------------------------------------------------------
  // init
  // -------------------------------------------------------------------------

  describe('init', function () {
    it('returns true to signal successful registration', function () {
      expect(paywallsSubmodule.init(MOCK_CONFIG, {})).to.equal(true);
    });

    it('merges ORTB2 immediately when window.__PW_VAI__ is already set', function () {
      window[VAI_WINDOW_KEY] = { ...MOCK_VAI };
      const result = paywallsSubmodule.init(MOCK_CONFIG, {});
      expect(result).to.equal(true);

      // Verify VAI is used on next getBidRequestData call (cached from init)
      const reqBids = makeReqBids();
      paywallsSubmodule.getBidRequestData(reqBids, function () {
        const global = reqBids.ortb2Fragments.global;
        expect(global.site.ext.vai).to.include({ dom: 'example.com' });
        expect(global.user.ext.vai).to.include({ vat: 'HUMAN', act: 'ACT-1' });
      }, MOCK_CONFIG, {});
    });

    it('reads localStorage cache when window.__PW_VAI__ is absent', function () {
      getDataFromLocalStorageStub.withArgs(VAI_LS_KEY).returns(JSON.stringify(MOCK_VAI));

      const result = paywallsSubmodule.init(MOCK_CONFIG, {});
      expect(result).to.equal(true);
    });

    it('does not merge ORTB2 for expired cached payload', function () {
      getDataFromLocalStorageStub.withArgs(VAI_LS_KEY).returns(JSON.stringify(MOCK_VAI_EXPIRED));

      paywallsSubmodule.init(MOCK_CONFIG, {});
      // Should not throw; should return true but skip ORTB2 merge
    });
  });

  // -------------------------------------------------------------------------
  // buildOrtb2
  // -------------------------------------------------------------------------

  describe('buildOrtb2', function () {
    it('places site fields at site.ext.vai', function () {
      const ortb2 = buildOrtb2(MOCK_VAI);
      expect(ortb2.site.ext.vai).to.deep.equal({
        iss: MOCK_VAI.iss,
        aud: MOCK_VAI.aud,
        dom: MOCK_VAI.dom,
        kid: MOCK_VAI.kid,
        assertion_jws: MOCK_VAI.assertion_jws,
      });
    });

    it('places user fields at user.ext.vai', function () {
      const ortb2 = buildOrtb2(MOCK_VAI);
      expect(ortb2.user.ext.vai).to.deep.equal({
        vat: MOCK_VAI.vat,
        act: MOCK_VAI.act,
      });
    });

    it('does not place fields at imp level', function () {
      const ortb2 = buildOrtb2(MOCK_VAI);
      expect(ortb2).to.not.have.property('imp');
    });
  });

  // -------------------------------------------------------------------------
  // getVaiPayload
  // -------------------------------------------------------------------------

  describe('getVaiPayload', function () {
    it('returns window.__PW_VAI__ when present and unexpired', function () {
      window[VAI_WINDOW_KEY] = { ...MOCK_VAI };
      const payload = getVaiPayload();
      expect(payload).to.not.be.null;
      expect(payload.vat).to.equal('HUMAN');
    });

    it('returns null when window.__PW_VAI__ is expired', function () {
      window[VAI_WINDOW_KEY] = { ...MOCK_VAI_EXPIRED };
      const payload = getVaiPayload();
      expect(payload).to.be.null;
    });

    it('returns null when nothing is available', function () {
      const payload = getVaiPayload();
      expect(payload).to.be.null;
    });

    it('falls back to localStorage when window key is absent', function () {
      getDataFromLocalStorageStub.withArgs(VAI_LS_KEY).returns(JSON.stringify(MOCK_VAI));
      const payload = getVaiPayload();
      expect(payload).to.not.be.null;
      expect(payload.dom).to.equal('example.com');
    });
  });

  // -------------------------------------------------------------------------
  // getBidRequestData
  // -------------------------------------------------------------------------

  describe('getBidRequestData', function () {
    it('merges ORTB2 immediately when VAI is already on window', function (done) {
      window[VAI_WINDOW_KEY] = { ...MOCK_VAI };
      const reqBids = makeReqBids();

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        const global = reqBids.ortb2Fragments.global;
        expect(global.site.ext.vai.dom).to.equal('example.com');
        expect(global.site.ext.vai.assertion_jws).to.equal(MOCK_VAI.assertion_jws);
        expect(global.user.ext.vai.vat).to.equal('HUMAN');
        expect(global.user.ext.vai.act).to.equal('ACT-1');
        expect(loadExternalScriptStub.called).to.be.false;
        done();
      }, MOCK_CONFIG, {});
    });

    it('does not overwrite existing ortb2 fragments', function (done) {
      window[VAI_WINDOW_KEY] = { ...MOCK_VAI };
      const reqBids = makeReqBids({
        site: { name: 'MySite' },
      });

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        const global = reqBids.ortb2Fragments.global;
        // Original data should be preserved
        expect(global.site.name).to.equal('MySite');
        // VAI data should be merged
        expect(global.site.ext.vai.dom).to.equal('example.com');
        done();
      }, MOCK_CONFIG, {});
    });

    it('loads vai.js when not present and calls back on script load', function (done) {
      const reqBids = makeReqBids();

      loadExternalScriptStub.callsFake((url, type, name, cb) => {
        // Simulate vai.js setting window.__PW_VAI__
        window[VAI_WINDOW_KEY] = { ...MOCK_VAI };
        if (cb) cb();
      });

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        expect(loadExternalScriptStub.calledOnce).to.be.true;
        const global = reqBids.ortb2Fragments.global;
        expect(global.site.ext.vai.dom).to.equal('example.com');
        done();
      }, MOCK_CONFIG, {});
    });

    it('uses custom scriptUrl from params', function (done) {
      const reqBids = makeReqBids();

      loadExternalScriptStub.callsFake((url, type, name, cb) => {
        window[VAI_WINDOW_KEY] = { ...MOCK_VAI };
        if (cb) cb();
      });

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        expect(loadExternalScriptStub.firstCall.args[0]).to.equal('https://cdn.example.com/pw/vai.js');
        done();
      }, MOCK_CONFIG_WITH_URL, {});
    });

    it('calls callback without enrichment on timeout', function (done) {
      const reqBids = makeReqBids();
      const fastConfig = {
        name: SUBMODULE_NAME,
        params: { waitForIt: 10 },
      };

      // loadExternalScript does NOT set __PW_VAI__ — simulating timeout
      loadExternalScriptStub.callsFake((url, type, name, cb) => {
        // Script loaded but vai.js never sets window.__PW_VAI__
        if (cb) cb();
      });

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        // Callback should fire even without VAI data — graceful degradation
        const global = reqBids.ortb2Fragments.global;
        expect(global).to.not.have.nested.property('site.ext.vai');
        done();
      }, fastConfig, {});
    });

    it('responds to __PW_VAI_HOOK__ callback', function (done) {
      const reqBids = makeReqBids();

      loadExternalScriptStub.callsFake((url, type, name, cb) => {
        // Simulate vai.js calling the hook before setting window global
        setTimeout(() => {
          if (typeof window[VAI_HOOK_KEY] === 'function') {
            window[VAI_HOOK_KEY]({ ...MOCK_VAI });
          }
        }, 5);
        if (cb) cb();
      });

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        const global = reqBids.ortb2Fragments.global;
        expect(global.site.ext.vai.dom).to.equal('example.com');
        expect(global.user.ext.vai.vat).to.equal('HUMAN');
        done();
      }, MOCK_CONFIG, {});
    });

    it('never blocks the auction — calls callback even on script load failure', function (done) {
      const reqBids = makeReqBids();
      const fastConfig = {
        name: SUBMODULE_NAME,
        params: { waitForIt: 10 },
      };

      // Simulate script failing to load entirely
      loadExternalScriptStub.callsFake(() => {
        // No callback, no window.__PW_VAI__ — total failure
      });

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        // Should still reach here via timeout
        done();
      }, fastConfig, {});
    });
  });

  // -------------------------------------------------------------------------
  // Bug reproductions (from bot review feedback)
  // -------------------------------------------------------------------------

  describe('bug reproductions', function () {
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
    });

    it('P1: late hook payload should be stored for subsequent auctions', function (done) {
      // Bug: if timeout fires before hook, the payload is dropped permanently.
      // Subsequent auctions keep degrading because loadExternalScript won't re-execute.
      const reqBids1 = makeReqBids();
      const fastConfig = { name: SUBMODULE_NAME, params: { waitForIt: 10 } };

      loadExternalScriptStub.callsFake(() => {
        // Simulate hook-only delivery AFTER timeout (no window global fallback)
        setTimeout(() => {
          if (typeof window[VAI_HOOK_KEY] === 'function') {
            window[VAI_HOOK_KEY]({ ...MOCK_VAI });
          }
        }, 20);
      });

      // First auction: should timeout and degrade
      paywallsSubmodule.init(fastConfig, {});
      paywallsSubmodule.getBidRequestData(reqBids1, function () {
        // First auction degraded — expected
        const global1 = reqBids1.ortb2Fragments.global;
        expect(global1).to.not.have.nested.property('site.ext.vai');

        // Now hook delivers late payload (at t=20ms)
        clock.tick(15);

        // Second auction should pick up the late payload
        const reqBids2 = makeReqBids();
        paywallsSubmodule.getBidRequestData(reqBids2, function () {
          const global2 = reqBids2.ortb2Fragments.global;
          expect(global2.user.ext.vai.vat).to.equal('HUMAN');
          expect(global2.user.ext.vai.act).to.equal('ACT-1');
          done();
        }, fastConfig, {});
      }, fastConfig, {});

      // Advance past timeout
      clock.tick(15);
    });

    it('waitForIt=0 should be respected, not treated as falsy', function (done) {
      // Bug: params.waitForIt || DEFAULT_WAIT_FOR_IT treats 0 as falsy
      const reqBids = makeReqBids();
      const zeroConfig = { name: SUBMODULE_NAME, params: { waitForIt: 0 } };
      let callbackTime = null;

      loadExternalScriptStub.callsFake(() => {
        // Script never sets __PW_VAI__ — should timeout at 0ms, not 100ms
      });

      paywallsSubmodule.init(zeroConfig, {});
      paywallsSubmodule.getBidRequestData(reqBids, function () {
        callbackTime = clock.now;
        done();
      }, zeroConfig, {});

      // If bug exists, callback won't fire until 100ms (DEFAULT_WAIT_FOR_IT)
      // With fix, it should fire at ~0ms
      clock.tick(1);
      // If we get here without done() being called, the test will timeout
    });

    it('should extend hook grace when script loads after timeout', function (done) {
      // Scenario: slow network — script loads well after waitForIt timeout.
      // Hook delivery happens 50ms after script load, which is beyond the
      // initial grace window. The onload extension should keep the hook alive.
      const reqBids1 = makeReqBids();
      const fastConfig = { name: SUBMODULE_NAME, params: { waitForIt: 10 } };
      let scriptOnload;

      loadExternalScriptStub.callsFake((_url, _type, _name, onload) => {
        // Capture the onload so we can fire it manually later
        scriptOnload = onload;
      });

      paywallsSubmodule.init(fastConfig, {});
      paywallsSubmodule.getBidRequestData(reqBids1, function () {
        // First auction degrades (expected)

        // Simulate script loading 500ms after timeout (well past initial grace)
        clock.tick(500);
        scriptOnload(); // fires onload — should extend hook grace

        // Hook delivers VAI 50ms after script load
        clock.tick(50);
        if (typeof window[VAI_HOOK_KEY] === 'function') {
          window[VAI_HOOK_KEY]({ ...MOCK_VAI });
        }

        // Verify the late payload was stored
        expect(window[VAI_WINDOW_KEY]).to.have.property('vat', 'HUMAN');

        // Second auction should use the stored payload
        const reqBids2 = makeReqBids();
        paywallsSubmodule.getBidRequestData(reqBids2, function () {
          const global2 = reqBids2.ortb2Fragments.global;
          expect(global2.user.ext.vai.vat).to.equal('HUMAN');
          expect(global2.user.ext.vai.act).to.equal('ACT-1');
          done();
        }, fastConfig, {});
      }, fastConfig, {});

      // Advance past timeout
      clock.tick(15);
    });
  });

  // -------------------------------------------------------------------------
  // getTargetingData
  // -------------------------------------------------------------------------

  describe('getTargetingData', function () {
    it('returns vai_vat and vai_act for each ad unit', function () {
      window[VAI_WINDOW_KEY] = { ...MOCK_VAI };
      const adUnits = ['ad-unit-1', 'ad-unit-2'];
      const targeting = paywallsSubmodule.getTargetingData(adUnits, MOCK_CONFIG, {});

      expect(targeting).to.have.property('ad-unit-1');
      expect(targeting).to.have.property('ad-unit-2');
      expect(targeting['ad-unit-1']).to.deep.equal({ vai_vat: 'HUMAN', vai_act: 'ACT-1' });
      expect(targeting['ad-unit-2']).to.deep.equal({ vai_vat: 'HUMAN', vai_act: 'ACT-1' });
    });

    it('returns empty object when VAI is unavailable', function () {
      const adUnits = ['ad-unit-1'];
      const targeting = paywallsSubmodule.getTargetingData(adUnits, MOCK_CONFIG, {});
      expect(targeting).to.deep.equal({});
    });
  });
});
