import { hadronIdSubmodule, storage, HADRONID_LOCAL_NAME } from 'modules/hadronIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

describe('HadronIdSystem', function () {
  const HADRON_TEST = 'tstCachedHadronId1';
  describe('getId', function() {
    let getDataFromLocalStorageStub;

    beforeEach(function() {
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    });

    afterEach(function () {
      getDataFromLocalStorageStub.restore();
    });

    it('gets a cached hadronid', function() {
      const config = {
        params: {}
      };
      getDataFromLocalStorageStub.withArgs(HADRONID_LOCAL_NAME).returns(HADRON_TEST);
      const result = hadronIdSubmodule.getId(config);
      expect(result).to.deep.equal({ id: { hadronId: HADRON_TEST } });
    });

    it('allows configurable id url', function() {
      const config = {
        params: {
          url: 'https://hadronid.publync.com'
        }
      };
      getDataFromLocalStorageStub.withArgs(HADRONID_LOCAL_NAME).returns(null);
      const callbackSpy = sinon.spy();
      const callback = hadronIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.match(/^https:\/\/hadronid\.publync\.com\//);
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ hadronId: 'testHadronId1' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({ id: { hadronId: 'testHadronId1' } });
    });
  });

  describe('eids', () => {
    before(() => {
      attachIdSystem(hadronIdSubmodule);
    });
    it('hadronId', function() {
      const userId = {
        hadronId: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'audigent.com',
        uids: [{
          id: 'some-random-id-value',
          atype: 1
        }]
      });
    });
  })
});
