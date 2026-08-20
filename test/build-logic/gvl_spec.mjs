import { expect } from 'chai';
import { describe, it } from 'mocha';
import { getPurposes, isValidGvlId } from '../../metadata/gvl.mjs';
import { validatePurposeDeclarations } from '../../libraries/purposeDeclarations/validate.mjs';

describe('gvl build time checks', () => {
  let gvl;
  beforeEach(() => {
    gvl = null;
  });

  function getGvl() {
    return Promise.resolve(gvl);
  }

  describe('validateGvlId', async () => {
    Object.entries({
      'missing': null,
      'deleted': {
        deletedDate: '2024-06-11T00:00:00Z'
      }
    }).forEach(([t, vendor]) => {
      it(`should reject gvl id when its vendor is ${t}`, async () => {
        gvl = {
          vendors: {
            "123": vendor
          }
        };
        expect(await isValidGvlId(123, getGvl)).to.be.false;
      });
    });
  });

  describe('getPurposes', () => {
    it('should return purposes from gvl', async () => {
      const purposes = {
        purposes: [1],
        legIntPurposes: [2],
        flexiblePurposes: [3],
        specialFeatures: [4]
      };
      gvl = {
        vendors: {
          123: {
            ...purposes
          }
        }
      };
      expect(await getPurposes(123, getGvl)).to.eql(purposes);
    });
  });

  describe('validatePurposeDeclarations', () => {
    Object.entries({
      'flexiblePurpose without corresponding purpose / LI': {
        flexiblePurposes: [1],
        purposes: [],
        legIntPurposes: [],
      },
      'both consent as LI as legal basis': {
        purposes: [1],
        legIntPurposes: [1],
        flexiblePurposes: [],
      }
    }).forEach(([t, purposes]) => {
      it(`should fail on ${t}`, () => {
        expect(validatePurposeDeclarations(purposes)).to.be.a('string');
      });
    });
  });
});
