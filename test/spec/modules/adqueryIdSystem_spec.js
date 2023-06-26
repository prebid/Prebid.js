import {adqueryIdSubmodule, storage} from 'modules/adqueryIdSystem.js';
import {server} from 'test/mocks/xhr.js';
import * as utils from '../../../src/utils';
import sinon from 'sinon';

const config = {
  storage: {
    type: 'html5',
  },
};

describe('AdqueryIdSystem', function () {
  describe('qid submodule', () => {
    it('should expose a "name" property containing qid', () => {
      expect(adqueryIdSubmodule.name).to.equal('qid');
    });

    it('should expose a "gvlid" property containing the GVL ID 902', () => {
      expect(adqueryIdSubmodule.gvlid).to.equal(902);
    });
  });

  describe('getId', function () {
    let getDataFromLocalStorageStub;
    let getUniqueIdentifierStrStub;

    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    getUniqueIdentifierStrStub = sinon.stub(utils, 'getUniqueIdentifierStr').returns('9');

    it('gets a adqueryId', function () {
      const config = {
        params: {
          url: 'test_url'
        }
      };
      const callbackSpy = sinon.spy();
      const callback = adqueryIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.eq(`https://bidder.adquery.io/prebid/2`);
      request.respond(200, {'Content-Type': 'application/json'}, JSON.stringify({qid: '6dd9eab7df9ca5763001fb'}));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal('3');
    });

    it('allows configurable id url', function () {
      const config = {
        params: {
          url: 'https://another_bidder.adquery.io/qid'
        }
      };
      const callbackSpy = sinon.spy();
      const callback = adqueryIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.contains('https://another_bidder.adquery.io');
      request.respond(200, {'Content-Type': 'application/json'}, JSON.stringify({qid: 'testqid'}));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal('testqid');
    });
  });
});
