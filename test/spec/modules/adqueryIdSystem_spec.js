import { adqueryIdSubmodule, storage } from 'modules/adqueryIdSystem.js';
import { server } from 'test/mocks/xhr.js';

describe('AdqueryIdSystem', function () {
  describe('getId', function() {
    let getDataFromLocalStorageStub;

    beforeEach(function() {
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    });

    afterEach(function () {
      getDataFromLocalStorageStub.restore();
    });

    it('gets a adqueryId', function() {
      const config = {
        params: {}
      };
      const callbackSpy = sinon.spy();
      const callback = adqueryIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.eq(`https://bidder.adquery.io/prebid/qid`);
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ qid: 'qid' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({qid: 'qid'});
    });

    it('gets a cached adqueryId', function() {
      const config = {
        params: {}
      };
      getDataFromLocalStorageStub.withArgs('qid').returns('qid');

      const callbackSpy = sinon.spy();
      const callback = adqueryIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({qid: 'qid'});
    });

    it('allows configurable id url', function() {
      const config = {
        params: {
          url: 'https://bidder.adquery.io/prebid/qid'
        }
      };
      const callbackSpy = sinon.spy();
      const callback = adqueryIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.eq('https://bidder.adquery.io/prebid/qid');
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ qid: 'qid' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal({qid: 'qid'});
    });
  });
});
