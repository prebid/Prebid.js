import {attachIdSystem} from '../../../modules/userId/index.js';
import {unifiedIdSubmodule} from '../../../modules/unifiedIdSystem.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

describe('Unified ID', () => {
  describe('eid', () => {
    before(() => {
      attachIdSystem(unifiedIdSubmodule);
    });
    it('unifiedId: ext generation', function() {
      const userId = {
        tdid: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'adserver.org',
        uids: [{id: 'some-random-id-value', atype: 1, ext: { rtiPartner: 'TDID' }}]
      });
    });

    it('unifiedId: ext generation with provider', function() {
      const userId = {
        tdid: {'id': 'some-sample_id', 'ext': {'provider': 'some.provider.com'}}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'adserver.org',
        uids: [{id: 'some-sample_id', atype: 1, ext: { rtiPartner: 'TDID', provider: 'some.provider.com' }}]
      });
    });
  });
});
