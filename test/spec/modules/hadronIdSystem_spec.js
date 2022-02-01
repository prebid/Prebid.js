import { hadronIdSubmodule, storage } from 'modules/hadronIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';

describe('HadronIdSystem', function () {
  describe('getId', function() {
    let getDataFromLocalStorageStub;

    beforeEach(function() {
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    });

    afterEach(function () {
      getDataFromLocalStorageStub.restore();
    });

    it('gets a hadronId', function() {
      const config = {
        params: {}
      };
      const callbackSpy = sinon.spy();
      const callback = hadronIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.eq(`https://id.hadron.ad.gt/api/v1/pbhid`);
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ hadronId: 'testHadronId1' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({hadronId: 'testHadronId1'});
    });

    it('gets a cached hadronid', function() {
      const config = {
        params: {}
      };
      getDataFromLocalStorageStub.withArgs('auHadronId').returns('tstCachedHadronId1');

      const callbackSpy = sinon.spy();
      const callback = hadronIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({hadronId: 'tstCachedHadronId1'});
    });

    it('allows configurable id url', function() {
      const config = {
        params: {
          url: 'https://hadronid.publync.com'
        }
      };
      const callbackSpy = sinon.spy();
      const callback = hadronIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.eq('https://hadronid.publync.com');
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ hadronId: 'testHadronId1' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({hadronId: 'testHadronId1'});
    });
  });
});
