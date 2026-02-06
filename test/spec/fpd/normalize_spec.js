import {normalizeEIDs, normalizeFPD, normalizeSchain} from '../../../src/fpd/normalize.js';
import * as utils from '../../../src/utils.js';

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
  describe('schain', () => {
    it('should move schain to ext.schain', () => {
      const fpd = {
        source: {
          schain: 'foo'
        }
      }
      expect(normalizeSchain(fpd)).to.deep.equal({
        source: {
          ext: {
            schain: 'foo'
          }
        }
      })
    });
    it('should warn on conflict', () => {
      const fpd = {
        source: {
          schain: 'foo',
          ext: {
            schain: 'bar'
          }
        },
      }
      expect(normalizeSchain(fpd)).to.eql({
        source: {
          ext: {
            schain: 'foo'
          }
        }
      });
      sinon.assert.called(utils.logWarn);
    });

    it('should do nothing if there is no schain', () => {
      expect(normalizeSchain({})).to.eql({});
    })
  })
})
