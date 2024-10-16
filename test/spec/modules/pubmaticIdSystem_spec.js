import { pubmaticIdSubmodule, storage } from 'modules/pubmaticIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler } from 'src/adapterManager.js';
import { expect } from 'chai/index.mjs';
import { attachIdSystem } from '../../../modules/userId/index.js';

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
      const completeCallback = sinon.spy();

      const { callback } = pubmaticIdSubmodule.getId({
        params: {
          publisherId: 12345
        }
      });

      callback(completeCallback);

      const [request] = server.requests;

      request.respond(200, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        succeeded: true,
        id: 'foo',
        expires: 1645667805067
      }));

      expect(request.method).to.equal('GET');
      expect(request.withCredentials).to.be.true;

      const regExp = new RegExp('https://image6.pubmatic.com/AdServer/UCookieSetPug\\?oid=5&p=12345&gdpr=\\d&src=pubmaticId&ver=1');

      expect(request.url).to.match(regExp);
      expect(completeCallback.calledOnceWithExactly('foo')).to.be.true;
    });

    // below test case is not expected to work.... we don't want such behavior
    context('when GDPR applies', () => {
      it('should log a warning and not call the endpoint', () => {
        const logWarnSpy = sinon.spy(utils, 'logWarn');

        const result = pubmaticIdSubmodule.getId({
          params: {
            publisherId: 12345
          }
        }, {
          gdprApplies: true
        });

        expect(logWarnSpy.calledOnceWithExactly('pubmaticId: Submodule cannot be used where GDPR applies')).to.be.true;
        expect(result).to.be.undefined;

        logWarnSpy.restore();
      });
    });

    context('when GDPR doesn\'t apply', () => {
      it('should call endpoint with \'gdpr=0\'', () => {
        const completeCallback = () => {};
        const { callback } = pubmaticIdSubmodule.getId({
          params: {
            publisherId: 12345
          }
        }, {
          gdprApplies: false
        });

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('gdpr=0');
      });

      context('but the GDPR consent string is given', () => {
        it('should call endpoint with the GDPR consent string', () => {
          const completeCallback = () => {};
          const { callback } = pubmaticIdSubmodule.getId({
            params: {
              publisherId: 12345
            }
          }, {
            gdprApplies: false,
            consentString: 'foo'
          });

          callback(completeCallback);

          const [request] = server.requests;

          expect(request.url).to.contain('gdpr_consent=foo');
        });
      });
    });

    context('when a valid US Privacy string is given', () => {
      it('should call endpoint with the US Privacy parameter', () => {
        const completeCallback = () => {};
        const { callback } = pubmaticIdSubmodule.getId({
          params: {
            publisherId: 12345
          }
        });

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
        const { callback } = pubmaticIdSubmodule.getId({
          params: {
            publisherId: 12345
          }
        });

        sinon.stub(coppaDataHandler, 'getCoppa').returns(true);

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('coppa=1');

        coppaDataHandler.getCoppa.restore();
      });
    });

    context('when a GPP consent string is given', () => {
      beforeEach(() => {
        sinon.stub(gppDataHandler, 'getConsentData');
      });

      afterEach(() => {
        gppDataHandler.getConsentData.restore();
      });

      it('should call endpoint with the GPP consent string', () => {
        [
          { gppString: '', expected: '' },
          { gppString: undefined, expected: '' },
          { gppString: 'foo', expected: 'foo' },
        ].forEach(({ gppString, expected }, index) => {
          const completeCallback = () => {};
          const { callback } = pubmaticIdSubmodule.getId({
            params: {
              publisherId: 12345
            }
          });

          gppDataHandler.getConsentData.onCall(index).returns({
            gppString
          });

          callback(completeCallback);

          expect(server.requests[index].url).to.contain(`gpp=${expected}`);
        });
      });

      it('should call endpoint with the GPP applicable sections', () => {
        const gppString = 'foo';

        [
          { applicableSections: [], expected: '' },
          { applicableSections: undefined, expected: '' },
          { applicableSections: ['1'], expected: '1' },
          { applicableSections: ['1', '2'], expected: '1%2C2' },
        ].forEach(({ applicableSections, expected }, index) => {
          const completeCallback = () => {};
          const { callback } = pubmaticIdSubmodule.getId({
            params: {
              publisherId: 12345
            }
          });

          gppDataHandler.getConsentData.onCall(index).returns({
            gppString: 'foo',
            applicableSections
          });

          callback(completeCallback);

          expect(server.requests[index].url).to.contain(`gpp_sid=${expected}`);
        });
      });
    });

    // Additional tests for storage mechanisms, third-party IDs, and configuration errors can follow the same pattern
  });

  describe('decode', () => {
    it('should wrap the given value inside an object literal', () => {
      expect(pubmaticIdSubmodule.decode('foo')).to.deep.equal({
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
        source: 'pubmatic.com',
        uids: [{
          id: 'some-random-id-value',
          atype: 1
        }]
      });
    });
  });
});