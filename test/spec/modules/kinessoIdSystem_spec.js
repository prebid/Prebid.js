import {attachIdSystem} from '../../../modules/userId/index.js';
import {kinessoIdSubmodule} from '../../../modules/kinessoIdSystem.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

describe('kinesso ID', () => {
  describe('eid', () => {
    before(() => {
      attachIdSystem(kinessoIdSubmodule);
    });
    it('kpuid', function() {
      const userId = {
        kpuid: 'Sample_Token'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'kpuid.com',
        uids: [{
          id: 'Sample_Token',
          atype: 3
        }]
      });
    });
  });
});
