import { pubmaticIdSubmodule, storage } from 'modules/pubmaticIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler, gdprDataHandler } from 'src/adapterManager.js';
import { expect } from 'chai/index.mjs';
import { attachIdSystem } from '../../../modules/userId/index.js';
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
      expect(completeCallback.calledOnceWithExactly({id: '6C3F0AB9-AE82-45C2-AD6F-9721E542DC4A'})).to.be.true;
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
