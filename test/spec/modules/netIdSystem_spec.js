import {attachIdSystem} from '../../../modules/userId/index.js';
import {netIdSubmodule} from '../../../modules/netIdSystem.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

describe('Net ID', () => {
  describe('eid', () => {
    before(() => {
      attachIdSystem(netIdSubmodule);
    });
    it('NetId', function () {
      const userId = {
        netId: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'netid.de',
        uids: [{id: 'some-random-id-value', atype: 1}]
      });
    });
  });
});
