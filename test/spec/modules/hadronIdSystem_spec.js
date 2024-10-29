import {hadronIdSubmodule, storage, LS_TAM_KEY} from 'modules/hadronIdSystem.js';
import {server} from 'test/mocks/xhr.js';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

describe('HadronIdSystem', function () {
  const HADRON_TEST = 'tstCachedHadronId1';
  describe('getId', function () {
    let getDataFromLocalStorageStub;

    beforeEach(function () {
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    });

    afterEach(function () {
      getDataFromLocalStorageStub.restore();
    });

    it('gets a cached hadronid', function () {
      const config = {
        params: {}
      };
      getDataFromLocalStorageStub.withArgs(LS_TAM_KEY).returns(HADRON_TEST);
      const result = hadronIdSubmodule.getId(config);
      expect(result).to.deep.equal({id: HADRON_TEST});
    });

    it('allows configurable id url', function () {
      const config = {
        params: {
          url: 'https://hadronid.publync.com'
        }
      };
      getDataFromLocalStorageStub.withArgs(LS_TAM_KEY).returns(null);
      const callbackSpy = sinon.spy();
      const callback = hadronIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.match(/^https:\/\/hadronid\.publync\.com\//);
    });
  });

  describe('eids', () => {
    before(() => {
      attachIdSystem(hadronIdSubmodule);
    });
    it('hadronId', function () {
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
