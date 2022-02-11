import { lexiconIdSubmodule } from 'modules/lexiconIdSystem.js';
import * as utils from 'src/utils.js';

import { server } from 'test/mocks/xhr.js';

describe('LexiconIdSystem', () => {
  describe('name', () => {
    it('should expose the name of the submodule', () => {
      expect(lexiconIdSubmodule.name).to.equal('lexicon');
    });
  });

  describe('glvid', () => {
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
      expect(completeCallback.calledOnceWithExactly('foo')).to.be.true
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

        expect(logErrorSpy.lastCall.args[0]).to.eq('lexicon: Response parsing error');

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

        expect(logErrorSpy.calledOnceWithExactly('lexicon: ID fetch encountered an error', 'Not Found')).to.be.true;

        logErrorSpy.restore();
      });
    })
  })

  describe('decode', () => {

  });
});
