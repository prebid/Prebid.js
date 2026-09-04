import {
  findSlotElementIdByAdId,
  getPageTargeting,
  getPageTargetingKeys, getPageTargetingMap,
  getSlotTargeting,
  getSlotTargetingKeys, getSlotTargetingMap, recordSlotTargeting,
  setPageTargeting,
  setSlotTargeting, slotHasTargetedAdId,
} from '../../../../src/utils/gptTargeting.js';
import { TARGETING_KEYS } from '../../../../src/constants.js';

describe('gpt targeting shim', () => {
  let mockGam;
  beforeEach(() => {
    mockGam = {};
  });
  describe('when getConfig/setConfig is defined', () => {
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
  });

  describe('when getConfig/setConfig is not defined', () => {
    let pubads, mockSlot;
    beforeEach(() => {
      pubads = {};
      mockGam.pubads = () => pubads;
      mockSlot = {};
    });

    it('getPageTargetingKeys calls pubads.getTargetingKeys', () => {
      pubads.getTargetingKeys = () => ['passthrough'];
      expect(getPageTargetingKeys(mockGam)).to.eql(['passthrough']);
    });
    it('getSlotTargetingKeys calls slot.getTargetingKeys', () => {
      mockSlot.getTargetingKeys = () => ['passthrough'];
      expect(getSlotTargetingKeys(mockSlot)).to.eql(['passthrough']);
    });
    it('getPageTargeting calls pubads.getTargeting', () => {
      pubads.getTargeting = (key) => [`passthrough-${key}`];
      expect(getPageTargeting('k', mockGam)).to.eql(['passthrough-k']);
    });
    it('getSlotTargeting calls slot.getTargeting', () => {
      mockSlot.getTargeting = (key) => [`passthrough-${key}`];
      expect(getSlotTargeting(mockSlot, 'k')).to.eql(['passthrough-k']);
    });

    it('setPageTargeting calls pubads.setTargeting', () => {
      pubads.setTargeting = sinon.stub();
      setPageTargeting('key', 'value', mockGam);
      sinon.assert.calledWith(pubads.setTargeting, 'key', 'value');
    });

    it('setSlotTargeting calls slot.setTargeting', () => {
      mockSlot.setTargeting = sinon.stub();
      setSlotTargeting(mockSlot, 'key', 'value');
      sinon.assert.calledWith(mockSlot.setTargeting, 'key', 'value');
    });

    Object.entries({
      getPageTargetingMap: {
        fn: getPageTargetingMap,
        arg: () => mockGam,
        mock: () => pubads
      },
      getSlotTargetingMap: {
        fn: getSlotTargetingMap,
        arg: () => mockSlot,
        mock: () => mockSlot
      }
    }).forEach(([name, { fn, arg, mock }]) => {
      describe(name, () => {
        it('calls getTargeting on each key from getTargetingkeys', () => {
          Object.assign(mock(), {
            getTargetingKeys: () => ['k1', 'k2'],
            getTargeting: (key) => [`${key}value`]
          });
          expect(fn(arg())).to.eql({
            k1: ['k1value'],
            k2: ['k2value']
          });
        });
      });
    });
  });

  describe('slot targeting adId cache', () => {
    it('records hb_adid values and finds the matching slot element id', () => {
      const slotA = { getSlotElementId: () => 'div-a' };
      const slotB = { getSlotElementId: () => 'div-b' };
      recordSlotTargeting(slotA, { [TARGETING_KEYS.AD_ID]: 'ad-a', hb_pb: '1.00' });
      recordSlotTargeting(slotB, { [`${TARGETING_KEYS.AD_ID}_rubicon`]: 'ad-b' });

      expect(slotHasTargetedAdId(slotA, 'ad-a')).to.equal(true);
      expect(slotHasTargetedAdId(slotA, 'ad-b')).to.equal(false);
      expect(findSlotElementIdByAdId('ad-b', () => [slotA, slotB])).to.equal('div-b');
    });

    it('overwrites previously recorded ad ids for a slot', () => {
      const slot = { getSlotElementId: () => 'div-1' };
      recordSlotTargeting(slot, { [TARGETING_KEYS.AD_ID]: 'old' });
      recordSlotTargeting(slot, { [TARGETING_KEYS.AD_ID]: 'new' });
      expect(slotHasTargetedAdId(slot, 'old')).to.equal(false);
      expect(slotHasTargetedAdId(slot, 'new')).to.equal(true);
    });
  });
});
