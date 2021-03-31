import { haloIdSubmodule } from 'modules/haloIdSystem.js';
import * as utils from 'src/utils.js';

import { server } from 'test/mocks/xhr.js';

describe('HaloIdSystem', function () {
  describe('getId', function() {
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
  });
});
