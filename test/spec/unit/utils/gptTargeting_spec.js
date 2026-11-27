import {
  findSlotElementIdByAdId,
  getPageTargeting,
  getPageTargetingKeys, getPageTargetingMap,
  getSlotTargeting,
  getSlotTargetingKeys, getSlotTargetingMap, recordSlotTargeting,
  setPageTargeting,
  setSlotTargeting, slotHasTargetedAdId, updateSlotTargetingFromMap,
} from '../../../../src/utils/gptTargeting.js';

describe('gpt targeting shim', () => {
  let mockGam;
  beforeEach(() => {
    mockGam = {};
  });
  describe('using getConfig/setConfig', () => {
    let targetingConfig;
    beforeEach(() => {
      targetingConfig = undefined;
      mockGam.getConfig = sinon.stub().callsFake((k) => {
        if (k === 'targeting') {
          return { targeting: targetingConfig };
        } else {
          return {};
        }
      });
      mockGam.setConfig = sinon.stub();
    });
    Object.entries({
      getPageTargetingKeys,
      getSlotTargetingKeys
    }).forEach(([name, fn]) => {
      describe(name, () => {
        it('returns an empty list when no targeting config is found', () => {
          expect(fn(mockGam)).to.eql([]);
        });
        it('returns keys from getConfig("targeting")', () => {
          targetingConfig = { k1: ['v1'], k2: ['v2'] };
          expect(fn(mockGam)).to.eql(['k1', 'k2']);
        });
      });
    });
    Object.entries({
      getPageTargeting: (target, key) => getPageTargeting(key, target),
      getSlotTargeting
    }).forEach(([name, fn]) => {
      describe(name, () => {
        it('returns an empty list when no targeting config is found', () => {
          expect(fn(mockGam, 'key')).to.eql([]);
        });
        it('returns the value from config otherwise', () => {
          targetingConfig = { key: ['value'] };
          expect(fn(mockGam, 'key')).to.eql(['value']);
        });
      });
    });

    Object.entries({
      getPageTargetingMap,
      getSlotTargetingMap
    }).forEach(([name, fn]) => {
      describe(name, () => {
        it('returns an empty map when no targeting config is found', () => {
          expect(fn(mockGam)).to.eql({});
        });
        it('returns the value from config otherwise', () => {
          targetingConfig = { key: ['value'] };
          expect(fn(mockGam)).to.eql({ key: ['value'] });
        });
      });
    });

    Object.entries({
      setPageTargeting: (target, key, value) => setPageTargeting(key, value, target),
      setSlotTargeting,
    }).forEach(([name, fn]) => {
      describe(name, () => {
        it('calls setConfig', () => {
          fn(mockGam, 'key', 'value');
          sinon.assert.calledWith(mockGam.setConfig, { targeting: { 'key': 'value' } });
        });
      });
    });

    it('updateSlotTargetingFromMap calls setConfig with the whole map', () => {
      updateSlotTargetingFromMap(mockGam, { k1: 'v1', k2: ['v2', 'v3'] });
      sinon.assert.calledWith(mockGam.setConfig, { targeting: { k1: 'v1', k2: ['v2', 'v3'] } });
    });

    Object.entries({
      getPageTargetingMap,
      getSlotTargetingMap
    }).forEach(([name, fn]) => {
      describe(`${name} normalization`, () => {
        it('wraps single values in arrays and drops null values', () => {
          targetingConfig = { single: 'v', multi: ['v1', 'v2'], cleared: null };
          expect(fn(mockGam)).to.eql({ single: ['v'], multi: ['v1', 'v2'] });
        });
        it('treats a null targeting config as empty', () => {
          targetingConfig = null;
          expect(fn(mockGam)).to.eql({});
        });
      });
    });

    describe('page-level helpers without an explicit gpt argument', () => {
      let origGoogletag;
      beforeEach(() => {
        origGoogletag = window.googletag;
        window.googletag = mockGam;
      });
      afterEach(() => {
        if (origGoogletag === undefined) {
          delete window.googletag;
        } else {
          window.googletag = origGoogletag;
        }
      });
      it('read from the global googletag', () => {
        targetingConfig = { key: ['value'] };
        expect(getPageTargetingKeys()).to.eql(['key']);
        expect(getPageTargeting('key')).to.eql(['value']);
        expect(getPageTargetingMap()).to.eql({ key: ['value'] });
      });
      it('write to the global googletag', () => {
        setPageTargeting('key', 'value');
        sinon.assert.calledWith(mockGam.setConfig, { targeting: { key: 'value' } });
      });
    });
  });

  describe('slot targeting adId cache', () => {
    it('records provided ad ids and finds the matching slot element id', () => {
      const slotA = { getSlotElementId: () => 'div-a' };
      const slotB = { getSlotElementId: () => 'div-b' };
      recordSlotTargeting(slotA, ['ad-a']);
      recordSlotTargeting(slotB, ['ad-b']);

      expect(slotHasTargetedAdId(slotA, 'ad-a')).to.equal(true);
      expect(slotHasTargetedAdId(slotA, 'ad-b')).to.equal(false);
      expect(findSlotElementIdByAdId('ad-b', () => [slotA, slotB])).to.equal('div-b');
    });

    it('overwrites previously recorded ad ids for a slot', () => {
      const slot = { getSlotElementId: () => 'div-1' };
      recordSlotTargeting(slot, ['old']);
      recordSlotTargeting(slot, ['new']);
      expect(slotHasTargetedAdId(slot, 'old')).to.equal(false);
      expect(slotHasTargetedAdId(slot, 'new')).to.equal(true);
    });

    it('ignores empty ad ids', () => {
      const slot = { getSlotElementId: () => 'div-1' };
      recordSlotTargeting(slot, ['ad-1', '']);
      expect(slotHasTargetedAdId(slot, 'ad-1')).to.equal(true);
      expect(slotHasTargetedAdId(slot, '')).to.equal(false);
    });
  });
});
