import {makeNormalizer, normalizeEIDs, normalizeFPD, normalizeSchain} from '../../../src/fpd/normalize.js';
import * as utils from '../../../src/utils.js';
import {deepClone, deepSetValue} from '../../../src/utils.js';
import deepAccess from 'dlv/index.js';

describe('FPD normalization', () => {
  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logWarn');
  });
  afterEach(() => {
    sandbox.restore();
  })

  describe('EIDs', () => {
    it('should merge user.eids into user.ext.eids', () => {
      const fpd = {
        user: {
          eids: [{source: 'idA'}],
          ext: {eids: [{source: 'idB'}]}
        }
      };
      const result = normalizeEIDs(fpd);
      expect(result.user.eids).to.not.exist;
      expect(result.user.ext.eids).to.deep.have.members([
        {source: 'idA'},
        {source: 'idB'}
      ])
    });
    it('should remove duplicates', () => {
      const fpd = {
        user: {
          eids: [{source: 'id'}],
          ext: {eids: [{source: 'id'}]}
        }
      }
      expect(normalizeEIDs(fpd).user.ext.eids).to.eql([
        {source: 'id'}
      ])
      sinon.assert.called(utils.logWarn);
    });
    it('should NOT remove duplicates if they come from the same place', () => {
      const fpd = {
        user: {
          eids: [{source: 'id'}, {source: 'id'}]
        }
      }
      expect(normalizeEIDs(fpd).user.ext.eids.length).to.eql(2);
    });
    it('should do nothing if there are no eids', () => {
      expect(normalizeEIDs({})).to.eql({});
    })
  })

  describe('makeNormalizer', () => {
    let ortb2;
    beforeEach(() => {
      ortb2 = {};
    });

    Object.entries({
      'preferred path': 'preferred.path',
      'fallback path': 'fallback.path'
    }).forEach(([t, dest]) => {
      describe(`when the destination path is the ${t}`, () => {
        let normalizer, expected;
        beforeEach(() => {
          normalizer = makeNormalizer('preferred.path', 'fallback.path', dest);
          expected = {};
          deepSetValue(expected, dest, ['data']);
        })

        function check() {
          expect(deepAccess(ortb2, dest)).to.eql(deepAccess(expected, dest));
          if (dest === 'preferred.path') {
            expect(ortb2.fallback?.path).to.not.exist;
          } else {
            expect(ortb2.preferred?.path).to.not.exist;
          }
        }

        it('should do nothing if there is neither preferred nor fallback data', () => {
          ortb2.unrelated = ['data'];
          normalizer(ortb2);
          expect(ortb2).to.eql({unrelated: ['data']});
        })

        it(`should leave fpd unchanged if data is only in the ${t}`, () => {
          deepSetValue(ortb2, dest, ['data']);
          normalizer(ortb2);
          expect(ortb2).to.eql(expected);
        });

        it('should move data when it is in the fallback path', () => {
          ortb2.fallback = {path: ['data']};
          normalizer(ortb2);
          check();
        });

        it('should move data when it is in the preferred path', () => {
          ortb2.preferred = {path: ['data']};
          normalizer(ortb2);
          expect(deepAccess(ortb2, dest)).to.eql(deepAccess(expected, dest));
          check();
        });

        it('should warn on conflict', () => {
          ortb2.preferred = {path: ['data']};
          ortb2.fallback = {path: ['fallback']};
          normalizer(ortb2);
          sinon.assert.called(utils.logWarn);
          check();
        })
      });
    });
  })
})
