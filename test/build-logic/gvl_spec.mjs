import {expect} from 'chai';
import {describe, it} from 'mocha';
import {isValidGvlId} from '../../metadata/gvl.mjs';

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
        }
        expect(await isValidGvlId(123, getGvl)).to.be.false;
      })
    })
  })
})
