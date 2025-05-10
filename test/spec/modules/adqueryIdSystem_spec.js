import {adqueryIdSubmodule, storage} from 'modules/adqueryIdSystem.js';
import {server} from 'test/mocks/xhr.js';
import sinon from 'sinon';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

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

    beforeEach(function () {
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    });

    afterEach(function () {
      getDataFromLocalStorageStub.restore();
    });

    it('gets a adqueryId', function () {
      const config = {
        params: {}
      };
      const callbackSpy = sinon.spy();
      const callback = adqueryIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.contain(`https://bidder.adquery.io/prebid/qid`);
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ qid: 'qid_string' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal('qid_string');
    });

    it('allows configurable id url', function () {
      const config = {
        params: {
          url: 'https://bidder2.adquery.io'
        }
      };
      const callbackSpy = sinon.spy();
      const callback = adqueryIdSubmodule.getId(config).callback;
      callback(callbackSpy);
      const request = server.requests[0];
      expect(request.url).to.contains('https://bidder2.adquery.io');
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ qid: 'testqid' }));
      expect(callbackSpy.lastCall.lastArg).to.deep.equal('testqid');
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(adqueryIdSubmodule);
    });
    it('qid', function() {
      const userId = {
        qid: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'adquery.io',
        uids: [{
          id: 'some-random-id-value',
          atype: 1
        }]
      });
    });
  })
});
