import { thirthyThreeAcrossIdSubmodule, storage } from 'modules/33acrossIdSystem.js';
import * as utils from 'src/utils.js';

import { server } from 'test/mocks/xhr.js';
import { uspDataHandler, coppaDataHandler, gppDataHandler } from 'src/adapterManager.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';
import {attachIdSystem} from '../../../modules/userId/index.js';

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

      const regExp = new RegExp('https://lexicon.33across.com/v1/envelope\\?pid=12345&gdpr=\\d&src=pbjs&ver=$prebid.version$');

      expect(request.url).to.match(regExp);
      expect(completeCallback.calledOnceWithExactly('foo')).to.be.true;
    });

    context('if the use of a first-party ID has been enabled', () => {
      context('and the response includes a first-party ID', () => {
        context('and the storage type is "cookie"', () => {
          it('should store the provided first-party ID in a cookie', () => {
            const completeCallback = () => {};

            const { callback } = thirthyThreeAcrossIdSubmodule.getId({
              params: {
                pid: '12345',
                storeFpid: true
              },
              storage: {
                type: 'cookie',
                expires: 30
              }
            });

            callback(completeCallback);

            const [request] = server.requests;

            const setCookie = sinon.stub(storage, 'setCookie');
            const cookiesAreEnabled = sinon.stub(storage, 'cookiesAreEnabled').returns(true);

            request.respond(200, {
              'Content-Type': 'application/json'
            }, JSON.stringify({
              succeeded: true,
              data: {
                envelope: 'foo',
                fp: 'bar'
              },
              expires: 1645667805067
            }));

            expect(setCookie.calledOnceWithExactly('33acrossIdFp', 'bar', sinon.match.string, 'Lax')).to.be.true;

            setCookie.restore();
            cookiesAreEnabled.restore();
          });
        });

        context('and the storage type is "html5"', () => {
          it('should store the provided first-party ID in local storage', () => {
            const completeCallback = () => {};

            const { callback } = thirthyThreeAcrossIdSubmodule.getId({
              params: {
                pid: '12345',
                storeFpid: true
              },
              storage: {
                type: 'html5'
              }
            });

            callback(completeCallback);

            const [request] = server.requests;

            const setDataInLocalStorage = sinon.stub(storage, 'setDataInLocalStorage');

            request.respond(200, {
              'Content-Type': 'application/json'
            }, JSON.stringify({
              succeeded: true,
              data: {
                envelope: 'foo',
                fp: 'bar'
              },
              expires: 1645667805067
            }));

            expect(setDataInLocalStorage.calledOnceWithExactly('33acrossIdFp', 'bar')).to.be.true;

            setDataInLocalStorage.restore();
          });
        });
      });

      context('and the response lacks a first-party ID', () => {
        it('should wipe any existing first-party ID from storage', () => {
          const completeCallback = () => {};

          const { callback } = thirthyThreeAcrossIdSubmodule.getId({
            params: {
              pid: '12345',
              storeFpid: true
            },
            storage: {
              type: 'html5'
            }
          });

          callback(completeCallback);

          const [request] = server.requests;

          const removeDataFromLocalStorage = sinon.stub(storage, 'removeDataFromLocalStorage');
          const setCookie = sinon.stub(storage, 'setCookie');
          const cookiesAreEnabled = sinon.stub(storage, 'cookiesAreEnabled').returns(true);

          request.respond(200, {
            'Content-Type': 'application/json'
          }, JSON.stringify({
            succeeded: true,
            data: {
              envelope: 'foo' // no 'fp' field
            },
            expires: 1645667805067
          }));

          expect(removeDataFromLocalStorage.calledOnceWithExactly('33acrossIdFp')).to.be.true;
          expect(setCookie.calledOnceWithExactly('33acrossIdFp', '', sinon.match.string, 'Lax')).to.be.true;

          removeDataFromLocalStorage.restore();
          setCookie.restore();
          cookiesAreEnabled.restore();
        });
      });
    });

    context('if the use of a first-party ID has been disabled (default value)', () => {
      context('and the response includes a first-party ID', () => {
        it('should not store the provided first-party ID in a cookie', () => {
          const completeCallback = () => {};

          const { callback } = thirthyThreeAcrossIdSubmodule.getId({
            params: {
              pid: '12345'
              // no storeFpid param
            },
            storage: {
              type: 'cookie',
              expires: 30
            }
          });

          callback(completeCallback);

          const [request] = server.requests;

          const setCookie = sinon.stub(storage, 'setCookie');
          const cookiesAreEnabled = sinon.stub(storage, 'cookiesAreEnabled').returns(true);

          request.respond(200, {
            'Content-Type': 'application/json'
          }, JSON.stringify({
            succeeded: true,
            data: {
              envelope: 'foo',
              fp: 'bar'
            },
            expires: 1645667805067
          }));

          expect(setCookie.calledOnceWithExactly('33acrossIdFp', 'bar', sinon.match.string, 'Lax')).to.be.false;

          setCookie.restore();
          cookiesAreEnabled.restore();
        });

        it('should not store the provided first-party ID in local storage', () => {
          const completeCallback = () => {};

          const { callback } = thirthyThreeAcrossIdSubmodule.getId({
            params: {
              pid: '12345'
              // no storeFpid param
            },
            storage: {
              type: 'html5'
            }
          });

          callback(completeCallback);

          const [request] = server.requests;

          const setDataInLocalStorage = sinon.stub(storage, 'setDataInLocalStorage');

          request.respond(200, {
            'Content-Type': 'application/json'
          }, JSON.stringify({
            succeeded: true,
            data: {
              envelope: 'foo',
              fp: 'bar'
            },
            expires: 1645667805067
          }));

          expect(setDataInLocalStorage.calledOnceWithExactly('33acrossIdFp', 'bar')).to.be.false;

          setDataInLocalStorage.restore();
        });
      });
    });

    context('if the response lacks the 33across "envelope" ID', () => {
      it('should wipe any existing "envelope" ID from storage', () => {
        const completeCallback = () => {};

        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          },
          storage: {
            type: 'html5'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        const removeDataFromLocalStorage = sinon.stub(storage, 'removeDataFromLocalStorage');
        const setCookie = sinon.stub(storage, 'setCookie');
        const cookiesAreEnabled = sinon.stub(storage, 'cookiesAreEnabled').returns(true);

        request.respond(200, {
          'Content-Type': 'application/json'
        }, JSON.stringify({
          succeeded: true,
          data: {
            envelope: '' // no 'envelope' field
          },
          expires: 1645667805067
        }));

        expect(removeDataFromLocalStorage.calledWith('33acrossId')).to.be.true;
        expect(setCookie.calledWith('33acrossId', '', sinon.match.string, 'Lax')).to.be.true;

        removeDataFromLocalStorage.restore();
        setCookie.restore();
        cookiesAreEnabled.restore();
      });
    });

    context('when GDPR applies', () => {
      it('should log a warning and don\'t expect a call to the endpoint', () => {
        const logWarnSpy = sinon.spy(utils, 'logWarn');

        const result = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        }, {
          gdprApplies: true
        });

        expect(logWarnSpy.calledOnceWithExactly('33acrossId: Submodule cannot be used where GDPR applies')).to.be.true;
        expect(result).to.be.undefined;

        logWarnSpy.restore();
      });
    });

    context('when GDPR doesn\'t apply', () => {
      it('should call endpoint with \'gdpr=0\'', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
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

          expect(request.url).to.contain('gdpr_consent=foo');
        });
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

    context('when coppa is enabled', () => {
      it('should call endpoint with an enabled coppa signal', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        sinon.stub(coppaDataHandler, 'getCoppa').returns(true);

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('coppa=1');

        coppaDataHandler.getCoppa.restore();
      });
    });

    context('when coppa is not enabled', () => {
      it('should call endpoint with coppa signal not enabled', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        sinon.stub(coppaDataHandler, 'getCoppa').returns(false);

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('coppa=0');

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
          const { callback } = thirthyThreeAcrossIdSubmodule.getId({
            params: {
              pid: '12345'
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
          const { callback } = thirthyThreeAcrossIdSubmodule.getId({
            params: {
              pid: '12345'
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

    context('when a first-party ID is present in local storage', () => {
      it('should call endpoint with the encoded first-party ID included', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          },
          storage: {
            type: 'html5'
          }
        });

        sinon.stub(storage, 'getDataFromLocalStorage')
          .withArgs('33acrossIdFp')
          .returns('33acrossIdFpValue+');

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('fp=33acrossIdFpValue%2B');

        storage.getDataFromLocalStorage.restore();
      });
    });

    context('when a first-party ID is present in cookie storage', () => {
      it('should call endpoint with the first-party ID included', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          },
          storage: {
            type: 'cookie'
          }
        });

        sinon.stub(storage, 'getCookie')
          .withArgs('33acrossIdFp')
          .returns('33acrossIdFpValue');

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).to.contain('fp=33acrossIdFpValue');

        storage.getCookie.restore();
      });
    });

    context('when a first-party ID is not present in storage', () => {
      it('should not call endpoint with the first-party ID included', () => {
        const completeCallback = () => {};
        const { callback } = thirthyThreeAcrossIdSubmodule.getId({
          params: {
            pid: '12345'
          }
        });

        callback(completeCallback);

        const [request] = server.requests;

        expect(request.url).not.to.contain('fp=');
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

        expect(logErrorSpy.calledOnceWithExactly(`${thirthyThreeAcrossIdSubmodule.name}: Unsuccessful response foo`)).to.be.true;

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
  describe('eid', () => {
    before(() => {
      attachIdSystem(thirthyThreeAcrossIdSubmodule);
    })
    it('33acrossId', function() {
      const userId = {
        '33acrossId': {
          envelope: 'some-random-id-value'
        }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: '33across.com',
        uids: [{
          id: 'some-random-id-value',
          atype: 1
        }]
      });
    });
  })
});
