import { unicornSubmodule } from 'modules/unicornRtdProvider.js';
import { expect } from 'chai';

describe('Unicorn RTD submodule', function () {
  const createdIds = [];

  // Create a real div with a deterministic bounding rect so measureNow() has
  // stable geometry to read (jsdom-free: Karma runs a real browser).
  function makeDiv(id, rect) {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    el.getBoundingClientRect = () => ({ ...rect });
    createdIds.push(id);
    return el;
  }

  function adUnit(code, divId) {
    return {
      code,
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      ortb2Imp: { ext: { data: { divId } } }
    };
  }

  before(function () {
    unicornSubmodule.init({});
  });

  afterEach(function () {
    createdIds.splice(0).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  });

  describe('submodule definition', function () {
    it('exposes the expected name', function () {
      expect(unicornSubmodule.name).to.equal('unicorn');
    });

    it('init returns true when IntersectionObserver is supported', function () {
      expect(unicornSubmodule.init({})).to.equal(true);
    });

    it('exposes getBidRequestData', function () {
      expect(unicornSubmodule.getBidRequestData).to.be.a('function');
    });
  });

  describe('getBidRequestData', function () {
    it('injects imp.ext.data.adslot (ver 1) and banner.pos for a resolvable slot', function (done) {
      const divId = 'uni-rtd-slot-1';
      makeDiv(divId, { top: 100, left: 10, right: 310, bottom: 350, width: 300, height: 250 });
      const au = adUnit('/1234/slot-1', divId);

      unicornSubmodule.getBidRequestData({ adUnits: [au] }, function () {
        const signal = au.ortb2Imp.ext.data.adslot;
        expect(signal).to.be.an('object');
        expect(signal.ver).to.equal(1);
        expect(signal.w).to.equal(300);
        expect(signal.h).to.equal(250);
        expect(signal.x).to.equal(10);
        expect(signal.y).to.equal(100);
        expect(signal.fixed).to.equal(false);
        expect(signal.ratio).to.be.within(0, 1);
        // position lives in the standard banner.pos, not inside ext.adslot
        expect(signal).to.not.have.property('pos');
        expect(au.ortb2Imp.banner.pos).to.be.oneOf([1, 3]);
        done();
      });
    });

    it('sets banner.pos = 2 (locked) for a fixed slot', function (done) {
      const divId = 'uni-rtd-fixed';
      const el = makeDiv(divId, { top: 20, left: 0, right: 320, bottom: 70, width: 320, height: 50 });
      el.style.position = 'fixed';
      const au = adUnit('/1234/fixed', divId);

      unicornSubmodule.getBidRequestData({ adUnits: [au] }, function () {
        expect(au.ortb2Imp.ext.data.adslot.fixed).to.equal(true);
        expect(au.ortb2Imp.banner.pos).to.equal(2);
        done();
      });
    });

    it('does not inject when the slot element cannot be resolved', function (done) {
      const au = adUnit('/1234/missing', 'uni-rtd-does-not-exist');

      unicornSubmodule.getBidRequestData({ adUnits: [au] }, function () {
        expect(au.ortb2Imp.ext.data.adslot).to.equal(undefined);
        done();
      });
    });

    it('invokes the callback with no adUnits', function (done) {
      unicornSubmodule.getBidRequestData({ adUnits: [] }, function () {
        done();
      });
    });
  });
});
