import * as utils from '../../src/utils.js';
import { syncOrtb2, validateOrtbFields } from '../../src/prebid.js';

describe('banner', () => {
  describe('validateOrtbBannerFields', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
    })

    afterEach(() => {
      sandbox.restore();
    });

    it('removes incorrect or invalid ortb properties, and keep non ortb ones', () => {
      const mt = {
        mimes: ['video/mp4'],
        w: 600,
        h: 480,
        battr: [6, 7],
        api: 6, // -- INVALID
        otherOne: 'test'
      };

      const expected = {...mt};
      delete expected.api;

      const adUnit = {
        code: 'adUnitCode',
        mediaTypes: { banner: mt }
      };
      validateOrtbFields(adUnit, 'banner');

      expect(adUnit.mediaTypes.banner).to.eql(expected);
    });

    it('Early return when 1st param is not a plain object', () => {
      sandbox.spy(utils, 'logWarn');

      validateOrtbFields(undefined, 'banner');
      validateOrtbFields([], 'banner');
      validateOrtbFields(null, 'banner');
      validateOrtbFields('hello', 'banner');
      validateOrtbFields(() => {}, 'banner');

      sinon.assert.callCount(utils.logWarn, 5);
    });

    it('Calls onInvalidParam when a property is invalid', () => {
      const onInvalidParam = sandbox.spy();
      const adUnit = {
        code: 'adUnitCode',
        mediaTypes: {
          banner: {
            mimes: ['video/mp4'],
            api: 6
          }
        }
      };
      validateOrtbFields(adUnit, 'banner', onInvalidParam);

      sinon.assert.calledOnce(onInvalidParam);
      sinon.assert.calledWith(onInvalidParam, 'api', 6, adUnit);
    });
  });

  describe('syncOrtb2', () => {
    let logWarnSpy;

    beforeEach(function () {
      logWarnSpy = sinon.spy(utils, 'logWarn');
    });

    afterEach(function () {
      utils.logWarn.restore();
    });

    it('should properly sync fields if both present', () => {
      const adUnit = {
        mediaTypes: {
          banner: {
            format: [{w: 100, h: 100}],
            btype: [1, 2, 34], // should be overwritten with value from ortb2Imp
            battr: [3, 4],
            maxduration: 'omitted_value' // should be omitted during copying - not part of banner obj spec
          }
        },
        ortb2Imp: {
          banner: {
            request: '{payload: true}',
            pos: 5,
            btype: [999, 999],
            vcm: 0,
            foobar: 'omitted_value' // should be omitted during copying - not part of banner obj spec
          }
        }
      };

      const expected = {
        mediaTypes: {
          banner: {
            format: [{w: 100, h: 100}],
            btype: [999, 999],
            pos: 5,
            battr: [3, 4],
            vcm: 0,
            maxduration: 'omitted_value'
          }
        },
        ortb2Imp: {
          banner: {
            format: [{w: 100, h: 100}],
            request: '{payload: true}',
            pos: 5,
            btype: [999, 999],
            battr: [3, 4],
            vcm: 0,
            foobar: 'omitted_value'
          }
        }
      };

      syncOrtb2(adUnit, 'banner');
      expect(adUnit).to.deep.eql(expected);

      assert.ok(logWarnSpy.calledOnce, 'expected warning was logged due to conflicting btype');
    });

    it('should not warn if fields match', () => {
      const adUnit = {
        mediaTypes: {
          banner: {
            format: [{wratio: 1, hratio: 1}]
          }
        },
        ortb2Imp: {
          banner: {
            format: [{wratio: 1, hratio: 1}]
          }
        }
      }
      syncOrtb2(adUnit, 'banner');
      sinon.assert.notCalled(logWarnSpy);
    })

    it('should omit sync if mediaType not present on adUnit', () => {
      const adUnit = {
        mediaTypes: {
          video: {
            fieldToOmit: 'omitted_value'
          }
        },
        ortb2Imp: {
          video: {
            fieldToOmit2: 'omitted_value'
          }
        }
      };

      syncOrtb2(adUnit, 'banner');

      expect(adUnit.ortb2Imp.banner).to.be.undefined;
      expect(adUnit.mediaTypes.banner).to.be.undefined;
    });

    it('should properly sync if mediaTypes is not present on any of side', () => {
      const adUnit = {
        mediaTypes: {
          banner: {
            format: [{w: 100, h: 100}],
            btype: [999, 999],
            pos: 5,
            battr: [3, 4],
            vcm: 0,
            maxduration: 'omitted_value'
          }
        },
      };

      const expected1 = {
        mediaTypes: {
          banner: {
            format: [{w: 100, h: 100}],
            btype: [999, 999],
            pos: 5,
            battr: [3, 4],
            vcm: 0,
            maxduration: 'omitted_value'
          }
        },
        ortb2Imp: {
          banner: {
            format: [{w: 100, h: 100}],
            btype: [999, 999],
            pos: 5,
            battr: [3, 4],
            vcm: 0,
          }
        }
      };

      syncOrtb2(adUnit, 'banner');
      expect(adUnit).to.deep.eql(expected1);

      const adUnit2 = {
        mediaTypes: {},
        ortb2Imp: {
          banner: {
            format: [{w: 100, h: 100}],
            btype: [999, 999],
            pos: 5,
            battr: [3, 4],
            vcm: 0,
            maxduration: 'omitted_value'
          }
        }
      };

      const expected2 = {
        mediaTypes: {
          banner: {
            format: [{w: 100, h: 100}],
            btype: [999, 999],
            pos: 5,
            battr: [3, 4],
            vcm: 0,
          }
        },
        ortb2Imp: {
          banner: {
            format: [{w: 100, h: 100}],
            btype: [999, 999],
            pos: 5,
            battr: [3, 4],
            vcm: 0,
            maxduration: 'omitted_value'
          }
        }
      };

      syncOrtb2(adUnit2, 'banner');
      expect(adUnit2).to.deep.eql(expected2);
    });

    it('should not create empty banner object on ortb2Imp if there was nothing to copy', () => {
      const adUnit2 = {
        mediaTypes: {
          banner: {
            noOrtbBannerField1: 'value',
            noOrtbBannerField2: 'value'
          }
        },
        ortb2Imp: {
          // lack of banner field
        }
      };
      syncOrtb2(adUnit2, 'banner');
      expect(adUnit2.ortb2Imp.banner).to.be.undefined
    });
  });
})
