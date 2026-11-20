import { pubmaticIdSubmodule } from 'modules/pubmaticIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler, gdprDataHandler } from 'src/adapterManager.js';
import { expect } from 'chai/index.mjs';
import {
  attachIdSystem,
  COOKIE_SUFFIXES,
  coreStorage,
  getConsentHash,
  init,
  setSubmoduleRegistry
} from '../../../modules/userId/index.js';
import { config } from 'src/config.js';
import { hook } from '../../../src/hook.js';
import { getGlobal } from '../../../src/prebidGlobal.js';
import { allConsent } from '../../../src/consentHandler.js';
import { createEidsArray } from '../../../modules/userId/eids.js';

const validCookieConfig = {
  params: {
    publisherId: 12345
  },
  storage: {
    type: 'cookie',
    name: 'pubmaticId',
    expires: 30,
    refreshInSeconds: 24 * 3600 // 24 Hours
  }
};

function mockHandle() {
  return { get: sinon.spy(), manage: sinon.spy(), set: sinon.spy(), touch: sinon.spy(), remove: sinon.spy() };
}

describe('pubmaticIdSystem', () => {
  describe('name', () => {
    it('should expose the name of the submodule', () => {
      expect(pubmaticIdSubmodule.name).to.equal('pubmaticId');
    });
  });

  describe('gvlid', () => {
    it('should expose the vendor id', () => {
      expect(pubmaticIdSubmodule.gvlid).to.equal(76);
    });
  });

  describe('getId', () => {
    it('should call endpoint and handle valid response', () => {
      const completeCallback = sinon.spy(function() {});

      const { callback } = pubmaticIdSubmodule.getId(utils.mergeDeep({}, validCookieConfig));

      callback(completeCallback);

      const [request] = server.requests;

      request.respond(200, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        id: '6C3F0AB9-AE82-45C2-AD6F-9721E542DC4A'
      }));

      expect(request.method).to.equal('GET');
      expect(request.withCredentials).to.be.true;

      const expectedURL = 'https://image6.pubmatic.com/AdServer/UCookieSetPug?oid=5&p=12345&publisherId=12345&gdpr=0&gdpr_consent=&src=pbjs_uid&ver=1&coppa=0&us_privacy=&gpp=&gpp_sid=';
      expect(request.url).to.equal(expectedURL);
      expect(completeCallback.calledOnceWithExactly({ id: '6C3F0AB9-AE82-45C2-AD6F-9721E542DC4A' })).to.be.true;
    });

    describe('response handling', () => {
      let handle, completeCallback;

      beforeEach(() => {
        handle = mockHandle();
        completeCallback = sinon.spy();
        sinon.stub(utils, 'logError');
        pubmaticIdSubmodule.getId(utils.mergeDeep({}, validCookieConfig), undefined, undefined, handle).callback(completeCallback);
      });

      afterEach(() => {
        utils.logError.restore();
      });

      it('should leave storage to the userId module when the response has an ID', () => {
        server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ id: 'some-id' }));
        sinon.assert.calledOnceWithExactly(completeCallback, { id: 'some-id' });
        Object.values(handle).forEach(method => sinon.assert.notCalled(method));
      });

      [
        ['has no ID', JSON.stringify({})],
        ['has an empty ID', JSON.stringify({ id: '' })],
        ['is not JSON', 'not json']
      ].forEach(([desc, body]) => {
        it(`should remove the stored ID and report none when the response ${desc}`, () => {
          server.requests[0].respond(200, { 'Content-Type': 'application/json' }, body);
          sinon.assert.calledOnce(handle.remove);
          sinon.assert.calledOnceWithExactly(completeCallback);
          sinon.assert.callOrder(handle.remove, completeCallback);
        });
      });

      it('should remove the stored ID and report none when the request fails', () => {
        server.requests[0].respond(500, {}, '');
        sinon.assert.calledOnce(handle.remove);
        sinon.assert.calledOnceWithExactly(completeCallback);
        sinon.assert.callOrder(handle.remove, completeCallback);
      });
    });

    it('should log an error if configuration is invalid', () => {
      const logErrorSpy = sinon.spy(utils, 'logError');
      pubmaticIdSubmodule.getId({});
      expect(logErrorSpy.called).to.be.true;
      logErrorSpy.restore();
    });

    describe('gdpr', () => {
      let gdprStub;

      beforeEach(() => {
        gdprStub = sinon.stub(gdprDataHandler, 'getConsentData');
      });

      afterEach(() => {
        gdprStub.restore();
      });

      context('when GDPR applies', () => {
        it('should call endpoint with gdpr=1 when GDPR applies and consent string is provided', () => {
          gdprStub.returns({
            gdprApplies: true,
            consentString: 'foo'
          });

          const completeCallback = sinon.spy();
          const { callback } = pubmaticIdSubmodule.getId(utils.mergeDeep({}, validCookieConfig));

          callback(completeCallback);

          const [request] = server.requests;

          expect(request.url).to.contain('gdpr=1');
          expect(request.url).to.contain('gdpr_consent=foo');
        });
      });

      context('when GDPR doesn\'t apply', () => {
        it('should call endpoint with \'gdpr=0\'', () => {
          gdprStub.returns({
            gdprApplies: false
          });

          const completeCallback = () => {};
          const { callback } = pubmaticIdSubmodule.getId(utils.mergeDeep({}, validCookieConfig));

          callback(completeCallback);

          const [request] = server.requests;

          expect(request.url).to.contain('gdpr=0');
        });
      });
    });

    context('when a valid US Privacy string is given', () => {
      it('should call endpoint with the US Privacy parameter', () => {
        const completeCallback = () => {};
        const { callback } = pubmaticIdSubmodule.getId(utils.mergeDeep({}, validCookieConfig));

        sinon.stub(uspDataHandler, 'getConsentData').returns('1YYY');

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('us_privacy=1YYY');

        uspDataHandler.getConsentData.restore();
      });
    });

    context('when coppa is enabled', () => {
      it('should call endpoint with an enabled coppa signal', () => {
        const completeCallback = () => {};
        const { callback } = pubmaticIdSubmodule.getId(utils.mergeDeep({}, validCookieConfig));

        sinon.stub(coppaDataHandler, 'getCoppa').returns(true);

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('coppa=1');

        coppaDataHandler.getCoppa.restore();
      });
    });

    context('when a GPP consent string is given', () => {
      it('should call endpoint with the GPP consent string and GPP applicable sections', () => {
        const completeCallback = () => {};
        const { callback } = pubmaticIdSubmodule.getId(utils.mergeDeep({}, validCookieConfig));

        sinon.stub(gppDataHandler, 'getConsentData').returns({ gppString: 'foo', applicableSections: ['1', '2'] });

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('gpp=foo&gpp_sid=1%2C2');

        gppDataHandler.getConsentData.restore();
      });

      it('should call endpoint with the GPP consent and GPP applicable sections keys still if both values are not present', () => {
        const completeCallback = () => {};
        const { callback } = pubmaticIdSubmodule.getId(utils.mergeDeep({}, validCookieConfig));

        sinon.stub(gppDataHandler, 'getConsentData').returns({ gppString: undefined, applicableSections: undefined });

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('gpp=&gpp_sid=');

        gppDataHandler.getConsentData.restore();
      });
    });
  });

  describe('through the userId core', () => {
    const STORAGE_NAME = 'pubmaticId';
    const EXPIRED = 'Thu, 01 Jan 1970 00:00:01 GMT';
    const future = () => new Date(Date.now() + 60 * 60 * 1000).toUTCString();
    const twoDaysAgo = () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toUTCString();

    function clearStorage() {
      COOKIE_SUFFIXES.forEach(suffix => coreStorage.setCookie(STORAGE_NAME + suffix, '', EXPIRED));
    }

    function seedStaleCookie(id) {
      coreStorage.setCookie(STORAGE_NAME, JSON.stringify({ id }), future());
      coreStorage.setCookie(`${STORAGE_NAME}_cst`, getConsentHash(), future());
      coreStorage.setCookie(`${STORAGE_NAME}_last`, twoDaysAgo(), future());
    }

    async function refreshAndRespond(respond) {
      init(config);
      setSubmoduleRegistry([pubmaticIdSubmodule]);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          auctionDelay: 100,
          userIds: [{ name: 'pubmaticId', ...utils.mergeDeep({}, validCookieConfig) }]
        }
      });
      const ids = getGlobal().getUserIdsAsync();
      for (let i = 0; i < 20 && server.requests.length === 0; i++) {
        await new Promise(resolve => setTimeout(resolve));
      }
      respond(server.requests[0]);
      await ids;
    }

    before(() => {
      hook.ready();
    });

    beforeEach(() => {
      allConsent.reset();
      clearStorage();
      sinon.stub(utils, 'logError');
    });

    afterEach(() => {
      utils.logError.restore();
      clearStorage();
      config.resetConfig();
      init(config);
    });

    it('should store the ID the server responds with', async () => {
      seedStaleCookie('old-id');
      await refreshAndRespond(req => req.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ id: 'new-id' })));
      expect(getGlobal().getUserIds().pubmaticId).to.equal('new-id');
      expect(JSON.parse(coreStorage.getCookie(STORAGE_NAME))).to.eql({ id: 'new-id' });
    });

    [
      ['responds with no ID', req => req.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({}))],
      ['fails', req => req.respond(500, {}, '')]
    ].forEach(([desc, respond]) => {
      it(`should delete the stored ID and provide none when the server ${desc}`, async () => {
        seedStaleCookie('old-id');
        await refreshAndRespond(respond);
        expect(getGlobal().getUserIds()).to.not.have.property('pubmaticId');
        COOKIE_SUFFIXES.forEach(suffix => expect(coreStorage.getCookie(STORAGE_NAME + suffix)).to.not.be.ok);
      });
    });
  });

  describe('decode', () => {
    it('should wrap the given value inside an object literal', () => {
      expect(pubmaticIdSubmodule.decode({ id: 'foo' })).to.deep.equal({
        [pubmaticIdSubmodule.name]: 'foo'
      });
    });
  });

  describe('eid', () => {
    before(() => {
      attachIdSystem(pubmaticIdSubmodule);
    });

    it('should create the correct EIDs', () => {
      const userId = {
        'pubmaticId': 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'esp.pubmatic.com',
        uids: [{
          id: 'some-random-id-value',
          atype: 1
        }]
      });
    });
  });
});
