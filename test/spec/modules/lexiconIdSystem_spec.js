import { lexiconIdSubmodule } from 'modules/lexiconIdSystem.js';
import * as utils from 'src/utils.js';

import { server } from 'test/mocks/xhr.js';

const name = lexiconIdSubmodule.name;

describe('LexiconIdSystem', () => {
  describe('name', () => {
    it('should expose the name of the submodule', () => {
      expect(lexiconIdSubmodule.name).to.equal('lexicon');
    });
  });

  describe('gvlid', () => {
    it('should expose the vendor id', () => {
      expect(lexiconIdSubmodule.gvlid).to.equal(58);
    });
  });

  describe('getId', () => {
    it('should call endpoint and handle valid response', () => {
      const completeCallback = sinon.spy();

      const { callback } = lexiconIdSubmodule.getId({
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
      expect(request.url).to.eq('https://api-lexicon.33across.com/v1/envelope?pid=12345');
      expect(completeCallback.calledOnceWithExactly('foo')).to.be.true;
    });

    context('when the partner ID is not given', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');

        lexiconIdSubmodule.getId({
          params: { /* No 'pid' param */ }
        });

        expect(logErrorSpy.calledOnceWithExactly('Lexicon ID submodule requires a partner ID to be defined')).to.be.true;

        logErrorSpy.restore();
      });
    });

    context('when the partner ID has an incorrect format', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');

        lexiconIdSubmodule.getId({
          params: {
            pid: 123456 // PID must be a string
          }
        });

        expect(logErrorSpy.calledOnceWithExactly('Lexicon ID submodule requires a partner ID to be defined')).to.be.true;

        logErrorSpy.restore();
      });
    });

    context('when the server JSON is invalid', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');
        const completeCallback = sinon.spy();

        const { callback } = lexiconIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(200, {
          'Content-Type': 'application/json'
        }, 'invalid response');

        expect(logErrorSpy.lastCall.args[0]).to.eq(`${lexiconIdSubmodule.name}: ID reading error`);

        logErrorSpy.restore();
      });
    });

    context('when an endpoint override is given', () => {
      it('should call that endpoint', () => {
        const completeCallback = sinon.spy();
        const { callback } = lexiconIdSubmodule.getId({
          params: {
            pid: '12345',
            apiUrl: 'https://staging-api-lexicon.33across.com/v1/envelope'
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

        expect(request.url).to.eq('https://staging-api-lexicon.33across.com/v1/envelope?pid=12345');
      });
    });

    context('when the server returns an unsuccessful response', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');
        const completeCallback = sinon.spy();

        const { callback } = lexiconIdSubmodule.getId({
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

        expect(logErrorSpy.calledOnceWithExactly(`${lexiconIdSubmodule.name}: `, 'foo')).to.be.true;

        logErrorSpy.restore();
      });
    });

    context('when the server returns a successful response but without ID', () => {
      it('should log a message', () => {
        const logMessageSpy = sinon.spy(utils, 'logMessage');
        const completeCallback = sinon.spy();

        const { callback } = lexiconIdSubmodule.getId({
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

        expect(logMessageSpy.calledOnceWithExactly(`${lexiconIdSubmodule.name}: No envelope was received`)).to.be.true;

        logMessageSpy.restore();
      });
    });

    context('when the server returns an error status code', () => {
      it('should log an error', () => {
        const logErrorSpy = sinon.spy(utils, 'logError');
        const completeCallback = sinon.spy();

        const { callback } = lexiconIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        request.respond(404);

        expect(logErrorSpy.calledOnceWithExactly(`${lexiconIdSubmodule.name}: ID error response`, 'Not Found')).to.be.true;

        logErrorSpy.restore();
      });
    })
  })

  describe('decode', () => {
    it('should wrap the given value inside an object literal', () => {
      expect(lexiconIdSubmodule.decode('foo')).to.deep.equal({
        [lexiconIdSubmodule.name]: {
          envelope: 'foo'
        }
      });
    });
  });
});
