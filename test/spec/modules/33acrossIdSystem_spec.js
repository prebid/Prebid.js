import { thirthyThreeAcrossIdSubmodule } from 'modules/33acrossIdSystem.js';
import * as utils from 'src/utils.js';

import { server } from 'test/mocks/xhr.js';
import { uspDataHandler } from 'src/adapterManager.js';

describe('33acrossIdSystem', () => {
  describe('name', () => {
    it('should expose the name of the submodule', () => {
      expect(thirthyThreeAcrossIdSubmodule.name).to.equal('33acrossId');
    });
  });

  describe('gvlid', () => {
    it('should expose the vendor id', () => {
      expect(thirthyThreeAcrossIdSubmodule.gvlid).to.equal(58);
    });
  });

  describe('getId', () => {
    it('should call endpoint and handle valid response', () => {
      const completeCallback = sinon.spy();

      const { callback } = thirthyThreeAcrossIdSubmodule.getId({
        params: {
          pid: '12345'
        }
      });

      callback(completeCallback);

      const [request] = server.requests;

      request.respond(200, {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        succeeded: true,
        data: {
          envelope: 'foo'
        },
        expires: 1645667805067
      }));

      expect(request.method).to.equal('GET');
      expect(request.withCredentials).to.be.true;
      expect(request.url).to.contain('https://lexicon.33across.com/v1/envelope?pid=12345');
      expect(completeCallback.calledOnceWithExactly('foo')).to.be.true;
    });

    context('when GDPR applies', () => {
      it('should call endpoint with \'gdpr=1\'', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        }, {
          gdprApplies: true
        });

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('gdpr=1');
      });

      context('and the consent string is given', () => {
        it('should call endpoint with the GDPR consent string', () => {
          [
            { consentString: '', expected: '' },
            { consentString: undefined, expected: '' },
            { consentString: 'foo', expected: 'foo' }
          ].forEach(({ consentString, expected }, index) => {
            const completeCallback = () => {};
            const { callback } = thirthyThreeAcrossIdSubmodule.getId({
              params: {
                pid: '12345'
              }
            }, {
              gdprApplies: true,
              consentString
            });

            callback(completeCallback);

            expect(server.requests[index].url).to.contain(`gdpr_consent=${expected}`);
          });
        });
      });
    });

    context('when GDPR doesn\'t apply', () => {
      it('should call endpoint with \'gdpr=0\' and no GDPR consent string parameter', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        }, {
          gdprApplies: false,
          consentString: 'foo'
        });

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('gdpr=0');
        expect(request.url).not.to.contain('gdpr_consent');
      });
    });

    context('when a valid US Privacy string is given', () => {
      it('should call endpoint with the US Privacy parameter', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        sinon.stub(uspDataHandler, 'getConsentData').returns('1YYY');

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('us_privacy=1YYY');

        uspDataHandler.getConsentData.restore();
      });
    });

    context('when an invalid US Privacy is given', () => {
      it('should call endpoint without the US Privacy parameter', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        // null or any other falsy value is considered invalid.
        sinon.stub(uspDataHandler, 'getConsentData').returns(null);

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).not.to.contain('us_privacy');

        uspDataHandler.getConsentData.restore();
      });
    });

    context('when the partner ID is not given', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');

        thirthyThreeAcrossIdSubmodule.getId({
          params: { /* No 'pid' param */ }
        });

        expect(logErrorSpy.calledOnceWithExactly('33acrossId: Submodule requires a partner ID to be defined')).to.be.true;

        logErrorSpy.restore();
      });
    });

    context('when the partner ID has an incorrect format', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');

        thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: 123456 // PID must be a string
          }
        });

        expect(logErrorSpy.calledOnceWithExactly('33acrossId: Submodule requires a partner ID to be defined')).to.be.true;

        logErrorSpy.restore();
      });
    });

    context('when the server JSON is invalid', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');
        const completeCallback = () => {};

        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(200, {
          'Content-Type': 'application/json'
        }, 'invalid response');

        expect(logErrorSpy.lastCall.args[0]).to.eq(`${thirthyThreeAcrossIdSubmodule.name}: ID reading error:`);

        logErrorSpy.restore();
      });

      it('should execute complete callback with undefined value', () => {
        const completeCallback = sinon.spy();

        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(200, {
          'Content-Type': 'application/json'
        }, 'invalid response');

        expect(completeCallback.calledOnceWithExactly(undefined)).to.be.true;
      });
    });

    context('when an endpoint override is given', () => {
      it('should call that endpoint', () => {
        const completeCallback = sinon.spy();
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345',
            apiUrl: 'https://staging-lexicon.33across.com/v1/envelope'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          succeeded: true,
          data: {
            envelope: 'foo'
          },
          expires: 1645667805067
        }));

        expect(request.url).to.contain('https://staging-lexicon.33across.com/v1/envelope?pid=12345');
      });
    });

    context('when the server returns an unsuccessful response', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');
        const completeCallback = () => {};

        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          succeeded: false,
          error: 'foo'
        }));

        expect(logErrorSpy.calledOnceWithExactly(`${thirthyThreeAcrossIdSubmodule.name}: Unsuccessful response`)).to.be.true;

        logErrorSpy.restore();
      });

      it('should execute complete callback with undefined value', () => {
        const completeCallback = sinon.spy();

        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          succeeded: false,
          error: 'foo'
        }));

        expect(completeCallback.calledOnceWithExactly(undefined)).to.be.true;
      });
    });

    context('when the server returns a successful response but without ID', () => {
      it('should log a message', () => {
        const logMessageSpy = sinon.spy(utils, 'logMessage');
        const completeCallback = () => {};

        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          succeeded: true,
          data: {}
        }));

        expect(logMessageSpy.calledOnceWithExactly(`${thirthyThreeAcrossIdSubmodule.name}: No envelope was received`)).to.be.true;

        logMessageSpy.restore();
      });

      it('should execute complete callback with undefined value', () => {
        const completeCallback = sinon.spy();

        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          succeeded: true,
          data: {}
        }));

        expect(completeCallback.calledOnceWithExactly(undefined)).to.be.true;
      });
    });

    context('when the server returns an error status code', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');
        const completeCallback = () => {};

        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(404);

        expect(logErrorSpy.calledOnceWithExactly(`${thirthyThreeAcrossIdSubmodule.name}: ID error response`, 'Not Found')).to.be.true;

        logErrorSpy.restore();
      });

      it('should execute complete callback without any value', () => {
        const completeCallback = sinon.spy();

        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(404);

        expect(completeCallback.calledOnceWithExactly()).to.be.true;
      });
    })
  })

  describe('decode', () => {
    it('should wrap the given value inside an object literal', () => {
      expect(thirthyThreeAcrossIdSubmodule.decode('foo')).to.deep.equal({
        [thirthyThreeAcrossIdSubmodule.name]: {
          envelope: 'foo'
        }
      });
    });
  });
});
