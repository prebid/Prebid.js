import {attachIdSystem} from '../../../modules/userId/index.js';
import {unifiedIdSubmodule} from '../../../modules/unifiedIdSystem.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';
import {server} from 'test/mocks/xhr.js';

describe('Unified ID', () => {
  describe('getId', () => {
    it('should use provided URL', () => {
      unifiedIdSubmodule.getId({params: {url: 'https://given-url/'}}).callback();
      expect(server.requests[0].url).to.eql('https://given-url/');
    });
    it('should use partner URL', () => {
      unifiedIdSubmodule.getId({params: {partner: 'rubicon'}}).callback();
      expect(server.requests[0].url).to.equal('https://match.adsrvr.org/track/rid?ttd_pid=rubicon&fmt=json');
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(unifiedIdSubmodule);
    });
    it('unifiedId: ext generation', function () {
      const userId = {
        tdid: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'adserver.org',
        uids: [{id: 'some-random-id-value', atype: 1, ext: {rtiPartner: 'TDID'}}]
      });
    });

    it('unifiedId: ext generation with provider', function () {
      const userId = {
        tdid: {'id': 'some-sample_id', 'ext': {'provider': 'some.provider.com'}}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'adserver.org',
        uids: [{id: 'some-sample_id', atype: 1, ext: {rtiPartner: 'TDID', provider: 'some.provider.com'}}]
      });
    });
  });
});
