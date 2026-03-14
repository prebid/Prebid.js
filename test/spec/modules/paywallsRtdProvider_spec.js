import { expect } from 'chai';
import sinon from 'sinon';
import {
  paywallsSubmodule,
  getVaiPayload,
  buildOrtb2,
  SUBMODULE_NAME,
  VAI_WINDOW_KEY,
} from 'modules/paywallsRtdProvider.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_VAI = {
  iss: 'paywalls.net',
  dom: 'example.com',
  kid: '2026-01-a',
  vat: 'HUMAN',
  act: 'ACT-1',
  mstk: '01J4X9K2ABCDEF01234567',
  jws: 'eyJhbGciOiJFZERTQSJ9.eyJ2YXQiOiJIVU1BTiJ9.signature',
  pvtk: '01J4X9K2ABCDEF01234567/1',
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

function makeReqBids(existingOrtb2 = {}, adUnits = [{ code: 'ad-unit-1' }, { code: 'ad-unit-2' }]) {
  return {
    ortb2Fragments: {
      global: existingOrtb2,
    },
    adUnits: adUnits,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('paywallsRtdProvider', function () {
  beforeEach(function () {
    delete window[VAI_WINDOW_KEY];
  });

  afterEach(function () {
    delete window[VAI_WINDOW_KEY];
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

    it('returns true even when VAI is absent', function () {
      expect(paywallsSubmodule.init(MOCK_CONFIG, {})).to.equal(true);
    });
  });

  // -------------------------------------------------------------------------
  // buildOrtb2
  // -------------------------------------------------------------------------

  describe('buildOrtb2', function () {
    it('places site fields at site.ext.data.vai', function () {
      const ortb2 = buildOrtb2(MOCK_VAI);
      expect(ortb2.site.ext.data.vai).to.deep.equal({
        iss: MOCK_VAI.iss,
        dom: MOCK_VAI.dom,
      });
    });

    it('places user fields at user.ext.data.vai', function () {
      const ortb2 = buildOrtb2(MOCK_VAI);
      expect(ortb2.user.ext.data.vai).to.deep.equal({
        iss: MOCK_VAI.iss,
        vat: MOCK_VAI.vat,
        act: MOCK_VAI.act,
        mstk: MOCK_VAI.mstk,
        jws: MOCK_VAI.jws,
      });
    });

    it('does not place fields at imp level (imp handled in mergeOrtb2Fragments)', function () {
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

    it('returns null for invalid payload (missing vat)', function () {
      window[VAI_WINDOW_KEY] = { act: 'ACT-1', iss: 'paywalls.net' };
      expect(getVaiPayload()).to.be.null;
    });

    it('returns null for invalid payload (missing act)', function () {
      window[VAI_WINDOW_KEY] = { vat: 'HUMAN', iss: 'paywalls.net' };
      expect(getVaiPayload()).to.be.null;
    });

    it('returns null for non-object values', function () {
      window[VAI_WINDOW_KEY] = 'not-an-object';
      expect(getVaiPayload()).to.be.null;
    });
  });

  // -------------------------------------------------------------------------
  // getBidRequestData
  // -------------------------------------------------------------------------

  describe('getBidRequestData', function () {
    it('merges ORTB2 when VAI is present on window', function (done) {
      window[VAI_WINDOW_KEY] = { ...MOCK_VAI };
      const reqBids = makeReqBids();

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        const global = reqBids.ortb2Fragments.global;
        expect(global.site.ext.data.vai.dom).to.equal('example.com');
        expect(global.site.ext.data.vai.iss).to.equal('paywalls.net');
        expect(global.user.ext.data.vai.jws).to.equal(MOCK_VAI.jws);
        expect(global.user.ext.data.vai.mstk).to.equal(MOCK_VAI.mstk);
        expect(global.user.ext.data.vai.vat).to.equal('HUMAN');
        expect(global.user.ext.data.vai.act).to.equal('ACT-1');
        // pvtk should be set at imp level on each ad unit
        reqBids.adUnits.forEach(function (adUnit) {
          expect(adUnit.ortb2Imp.ext.vai.pvtk).to.equal(MOCK_VAI.pvtk);
        });
        done();
      }, MOCK_CONFIG, {});
    });

    it('calls callback without enrichment when VAI is absent', function (done) {
      const reqBids = makeReqBids();

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        const global = reqBids.ortb2Fragments.global;
        expect(global).to.not.have.nested.property('site.ext.data.vai');
        done();
      }, MOCK_CONFIG, {});
    });

    it('calls callback without enrichment when VAI is expired', function (done) {
      window[VAI_WINDOW_KEY] = { ...MOCK_VAI_EXPIRED };
      const reqBids = makeReqBids();

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        const global = reqBids.ortb2Fragments.global;
        expect(global).to.not.have.nested.property('site.ext.data.vai');
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
        expect(global.site.name).to.equal('MySite');
        expect(global.site.ext.data.vai.dom).to.equal('example.com');
        done();
      }, MOCK_CONFIG, {});
    });

    it('injects pvtk at imp level on each ad unit', function (done) {
      window[VAI_WINDOW_KEY] = { ...MOCK_VAI };
      const reqBids = makeReqBids({}, [{ code: 'slot-a' }, { code: 'slot-b' }, { code: 'slot-c' }]);

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        reqBids.adUnits.forEach(function (adUnit) {
          expect(adUnit.ortb2Imp).to.have.nested.property('ext.vai.pvtk');
          expect(adUnit.ortb2Imp.ext.vai.pvtk).to.equal(MOCK_VAI.pvtk);
        });
        done();
      }, MOCK_CONFIG, {});
    });

    it('skips imp-level pvtk when pvtk is absent from VAI payload', function (done) {
      const vaiNoPvtk = { ...MOCK_VAI };
      delete vaiNoPvtk.pvtk;
      window[VAI_WINDOW_KEY] = vaiNoPvtk;
      const reqBids = makeReqBids();

      paywallsSubmodule.getBidRequestData(reqBids, function () {
        const global = reqBids.ortb2Fragments.global;
        expect(global.user.ext.data.vai.vat).to.equal('HUMAN');
        reqBids.adUnits.forEach(function (adUnit) {
          expect(adUnit).to.not.have.nested.property('ortb2Imp.ext.vai');
        });
        done();
      }, MOCK_CONFIG, {});
    });

    it('always calls callback (never blocks the auction)', function (done) {
      // No VAI, no script — callback must still fire
      const reqBids = makeReqBids();
      paywallsSubmodule.getBidRequestData(reqBids, function () {
        done();
      }, MOCK_CONFIG, {});
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
