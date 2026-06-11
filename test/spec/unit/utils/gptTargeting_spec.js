import {
  getPageTargeting,
  getPageTargetingKeys, getPageTargetingMap,
  getSlotTargeting,
  getSlotTargetingKeys, getSlotTargetingMap, setPageTargeting,
  setSlotTargeting,
} from '../../../../src/utils/gptTargeting.js';

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

    it('getSlotTargetingMap calls slot.getTargeting on each key from slot.getTargetingKeys', () => {
      mockSlot.getTargetingKeys = () => ['k1', 'k2'];
      mockSlot.getTargeting = (key) => [`${key}value`];
      expect(getSlotTargetingMap(mockSlot)).to.eql({
        k1: ['k1value'],
        k2: ['k2value']
      });
    });
  });
});
