import { haloIdSubmodule, storage } from 'modules/haloIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';

describe('HaloIdSystem', function () {
  describe('getId', function() {
    let getDataFromLocalStorageStub;

    beforeEach(function() {
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    });

    afterEach(function () {
      getDataFromLocalStorageStub.restore();
    });

    it('gets a haloId', function() {
      const config = {
        params: {}
      };
      const callbackSpy = sinon.spy();
      const callback = haloIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.eq(`https://id.halo.ad.gt/api/v1/pbhid`);
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ haloId: 'testHaloId1' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({haloId: 'testHaloId1'});
    });

    it('gets a cached haloid', function() {
      const config = {
        params: {}
      };
      getDataFromLocalStorageStub.withArgs('auHaloId').returns('tstCachedHaloId1');

      const callbackSpy = sinon.spy();
      const callback = haloIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({haloId: 'tstCachedHaloId1'});
    });

    it('allows configurable id url', function() {
      const config = {
        params: {
          url: 'https://haloid.publync.com'
        }
      };
      const callbackSpy = sinon.spy();
      const callback = haloIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.eq('https://haloid.publync.com');
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ haloId: 'testHaloId1' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({haloId: 'testHaloId1'});
    });
  });
});
