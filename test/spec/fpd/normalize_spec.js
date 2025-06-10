import {normalizeEIDs} from '../../../src/fpd/normalize.js';

describe('FPD normalization', () => {
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
    });
    it('should NOT remove duplicates if they come from the same place', () => {
      const fpd = {
        user: {
          eids: [{source: 'id'}, {source: 'id'}]
        }
      }
      expect(normalizeEIDs(fpd).user.ext.eids.length).to.eql(2);
    })
  })
})
