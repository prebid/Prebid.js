import {
  lotamePanoramaIdSubmodule,
  storage,
} from 'modules/lotamePanoramaIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import sinon from 'sinon';
import {
  attachIdSystem,
  COOKIE_SUFFIXES,
  coreStorage,
  getConsentHash,
  HTML5_SUFFIXES,
  init,
  setSubmoduleRegistry
} from '../../../modules/userId/index.js';
import { createEidsArray } from '../../../modules/userId/eids.js';
import { config } from 'src/config.js';
import { hook } from 'src/hook.js';
import { getGlobal } from 'src/prebidGlobal.js';
import { allConsent } from 'src/consentHandler.js';
import 'src/prebid.js';

const responseHeader = { 'Content-Type': 'application/json' };

describe('LotameId', function() {
  let sandbox;

  let getCookieStub;
  let setCookieStub;
  let getLocalStorageStub;
  let setLocalStorageStub;
  let removeFromLocalStorageStub;

  let requestHost;

  const nowTimestamp = new Date().getTime();
  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logError');
    getCookieStub = sandbox.stub(storage, 'getCookie');
    setCookieStub = sandbox.stub(storage, 'setCookie');
    getLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage');
    setLocalStorageStub = sandbox.stub(storage, 'setDataInLocalStorage');
    sandbox.stub(storage, 'cookiesAreEnabled').returns(true);
    sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
    removeFromLocalStorageStub = sandbox.stub(
      storage,
      'removeDataFromLocalStorage'
    );
    sandbox.stub(utils, 'timestamp').returns(nowTimestamp);
    if (navigator.userAgent && navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1) {
      requestHost = 'https://c.ltmsphrcl.net/id';
    } else {
      requestHost = 'https://id.crwdcntrl.net/id';
    }
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('caching initial data received from the remote server', function () {
    let request;
    const callBackSpy = sinon.spy();

    beforeEach(function() {
      const submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
      submoduleCallback(callBackSpy);

      request = server.requests[0];

      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          profile_id: '4ec137245858469eb94a4e248f238694',
          expiry_ts: 10,
          core_id:
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a',
        })
      );
    });

    it('should call the remote server when getId is called', function () {
      expect(request.url).to.be.eq(`${requestHost}`);
      expect(callBackSpy.calledOnce).to.be.true;
    });

    it('should save the first party id', function () {
      sinon.assert.calledWith(
        setLocalStorageStub,
        '_cc_id',
        '4ec137245858469eb94a4e248f238694'
      );
      sinon.assert.calledWith(
        setCookieStub,
        '_cc_id',
        '4ec137245858469eb94a4e248f238694'
      );
    });

    it('should save the expiry', function () {
      sinon.assert.calledWith(
        setLocalStorageStub,
        'panoramaId_expiry', 10);

      sinon.assert.calledWith(
        setCookieStub,
        'panoramaId_expiry', 10
      );
    });

    it('should save the id', function () {
      sinon.assert.calledWith(
        setLocalStorageStub,
        'panoramaId',
        'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a'
      );

      sinon.assert.calledWith(
        setCookieStub,
        'panoramaId',
        'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a'
      );
    });
  });

  describe('No stored values', function() {
    describe('and receives the profile id but no panorama id', function() {
      let request;
      const callBackSpy = sinon.spy();

      beforeEach(function() {
        const submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
        submoduleCallback(callBackSpy);
        request = server.requests[0];

        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            profile_id: '4ec137245858469eb94a4e248f238694',
            expiry_ts: 3800000,
          })
        );
      });

      it('should save the profile id', function() {
        sinon.assert.calledWith(
          setLocalStorageStub,
          '_cc_id',
          '4ec137245858469eb94a4e248f238694'
        );
        sinon.assert.calledWith(
          setCookieStub,
          '_cc_id',
          '4ec137245858469eb94a4e248f238694'
        );
      });

      it('should save the panorama id expiry', function () {
        sinon.assert.calledWith(
          setLocalStorageStub,
          'panoramaId_expiry',
          3800000
        );

        sinon.assert.calledWith(setCookieStub, 'panoramaId_expiry', 3800000);
      });

      it('should NOT save the panorama id', function () {
        sinon.assert.neverCalledWith(
          setLocalStorageStub,
          'panoramaId',
          sinon.match.any
        );

        sinon.assert.calledWith(
          removeFromLocalStorageStub,
          'panoramaId'
        );

        sinon.assert.calledWith(
          setCookieStub,
          'panoramaId',
          '',
          'Thu, 01 Jan 1970 00:00:00 GMT',
          'Lax'
        );
      });
    });

    describe('and receives both the profile id and the panorama id', function () {
      let request;
      const callBackSpy = sinon.spy();

      beforeEach(function () {
        const submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
        submoduleCallback(callBackSpy);
        request = server.requests[0];

        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            profile_id: '4ec137245858469eb94a4e248f238694',
            core_id:
              'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87b',
            expiry_ts: 3600000,
          })
        );
      });
      it('should save the profile id', function () {
        sinon.assert.calledWith(
          setLocalStorageStub,
          '_cc_id',
          '4ec137245858469eb94a4e248f238694'
        );
        sinon.assert.calledWith(
          setCookieStub,
          '_cc_id',
          '4ec137245858469eb94a4e248f238694'
        );
      });

      it('should save the panorama id expiry', function () {
        sinon.assert.calledWith(
          setLocalStorageStub,
          'panoramaId_expiry',
          3600000
        );

        sinon.assert.calledWith(setCookieStub, 'panoramaId_expiry', 3600000);
      });

      it('should save the panorama id', function () {
        sinon.assert.calledWith(
          setLocalStorageStub,
          'panoramaId',
          'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87b'
        );

        sinon.assert.calledWith(
          setCookieStub,
          'panoramaId',
          'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87b'
        );
      });
    });
  });

  describe('With a panorama id found', function() {
    describe('and it is too early to try again', function () {
      let submoduleCallback;

      beforeEach(function () {
        getCookieStub
          .withArgs('panoramaId_expiry')
          .returns(String(Date.now() + 100000));
        getCookieStub
          .withArgs('panoramaId')
          .returns(
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87c'
          );

        submoduleCallback = lotamePanoramaIdSubmodule.getId({});
      });

      it('should not call the remote server when getId is called', function () {
        expect(submoduleCallback).to.be.eql({
          id: 'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87c',
        });
      });
    });

    describe('and can try again', function () {
      let request;
      const callBackSpy = sinon.spy();

      beforeEach(function () {
        getCookieStub.withArgs('panoramaId_expiry').returns('1000');
        getCookieStub
          .withArgs('panoramaId')
          .returns(
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87d'
          );

        const submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
        submoduleCallback(callBackSpy);

        request = server.requests[0];

        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            profile_id: '4ec137245858469eb94a4e248f238694',
            core_id:
              'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87d',
            expiry_ts: 3600000
          })
        );
      });

      it('should call the remote server when getId is called', function () {
        expect(callBackSpy.calledOnce).to.be.true;
      });
    });

    describe('receives an optout request', function () {
      let request;
      const callBackSpy = sinon.spy();

      beforeEach(function () {
        getCookieStub.withArgs('panoramaId_expiry').returns('1000');
        getCookieStub
          .withArgs('panoramaId')
          .returns(
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87d'
          );

        const submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
        submoduleCallback(callBackSpy);

        request = server.requests[0];

        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            expiry_ts: Date.now() + (30 * 24 * 60 * 60 * 1000),
          })
        );
      });

      it('should call the remote server when getId is called', function () {
        expect(callBackSpy.calledOnce).to.be.true;
      });

      it('should clear the panorama id', function () {
        sinon.assert.calledWith(
          removeFromLocalStorageStub,
          'panoramaId'
        );

        sinon.assert.calledWith(
          setCookieStub,
          'panoramaId',
          '',
          'Thu, 01 Jan 1970 00:00:00 GMT',
          'Lax'
        );
      });

      it('should clear the profile id', function () {
        sinon.assert.calledWith(removeFromLocalStorageStub, '_cc_id');

        sinon.assert.calledWith(
          setCookieStub,
          '_cc_id',
          '',
          'Thu, 01 Jan 1970 00:00:00 GMT',
          'Lax'
        );
      });
    });
  });

  describe('With no panorama id found', function() {
    beforeEach(function() {
      getCookieStub.withArgs('panoramaId').returns(null);
      getLocalStorageStub.withArgs('panoramaId').returns(null);
    });
    describe('and it is too early to try again', function () {
      let submoduleCallback;

      beforeEach(function () {
        getCookieStub
          .withArgs('panoramaId_expiry')
          .returns(String(Date.now() + 100000));

        submoduleCallback = lotamePanoramaIdSubmodule.getId({});
      });

      it('should not call the remote server when getId is called', function () {
        expect(submoduleCallback).to.be.eql({
          id: null
        });
      });
    });

    describe('and can try again', function () {
      let request;
      const callBackSpy = sinon.spy();

      beforeEach(function () {
        getLocalStorageStub
          .withArgs('panoramaId_expiry')
          .returns('1000');

        const submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
        submoduleCallback(callBackSpy);

        request = server.requests[0];

        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            profile_id: '4ec137245858469eb94a4e248f238694',
            core_id:
              'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87e',
            expiry_ts: 3600000
          })
        );
      });

      it('should call the remote server when getId is called', function () {
        expect(callBackSpy.calledOnce).to.be.true;
      });
    });
  });

  describe('when gdpr applies', function () {
    let request;
    const callBackSpy = sinon.spy();

    beforeEach(function () {
      const submoduleCallback = lotamePanoramaIdSubmodule.getId({}, {
        gdpr: {
          gdprApplies: true,
          consentString: 'consentGiven'
        }
      }).callback;
      submoduleCallback(callBackSpy);

      request = server.requests[0];

      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          profile_id: '4ec137245858469eb94a4e248f238694',
          core_id:
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87f',
          expiry_ts: 3600000,
        })
      );
    });

    it('should call the remote server when getId is called', function () {
      expect(callBackSpy.calledOnce).to.be.true;
    });

    it('should pass the gdpr consent string back', function() {
      expect(request.url).to.be.eq(
        `${requestHost}?gdpr_applies=true&gdpr_consent=consentGiven`
      );
    });
  });

  describe('when gdpr applies but no consent string is available', function () {
    let request;
    const callBackSpy = sinon.spy();
    const consentData = {
      gdpr: {
        gdprApplies: true,
        consentString: undefined
      }
    };

    beforeEach(function () {
      const submoduleCallback = lotamePanoramaIdSubmodule.getId({}, consentData).callback;
      submoduleCallback(callBackSpy);

      // the contents of the response don't matter for this
      request = server.requests[0];
      request.respond(200, responseHeader, '');
    });

    it('should call the remote server when getId is called', function () {
      expect(callBackSpy.calledOnce).to.be.true;
    });

    it('should not include the gdpr consent string on the url', function() {
      expect(request.url).to.be.eq(
        `${requestHost}?gdpr_applies=true`
      );
    });
  });

  describe('when no consentData and no cookies', function () {
    let request;
    const callBackSpy = sinon.spy();
    let consentData;

    beforeEach(function () {
      const submoduleCallback = lotamePanoramaIdSubmodule.getId({}, consentData).callback;
      submoduleCallback(callBackSpy);

      // the contents of the response don't matter for this
      request = server.requests[0];
      request.respond(200, responseHeader, '');
    });

    it('should call the remote server when getId is called', function () {
      expect(callBackSpy.calledOnce).to.be.true;
    });

    it('should pass the gdpr consent string back', function() {
      expect(request.url).to.be.eq(`${requestHost}`);
    });
  });

  describe('with an empty cache, ignore profile id for error 111', function () {
    let request;
    const callBackSpy = sinon.spy();

    beforeEach(function () {
      const submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
      submoduleCallback(callBackSpy);

      request = server.requests[0];

      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          profile_id: '4ec137245858469eb94a4e248f238694',
          expiry_ts: 10,
          errors: [111],
          core_id:
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a',
        })
      );
    });

    it('should not save the first party id', function () {
      sinon.assert.neverCalledWith(
        setLocalStorageStub,
        '_cc_id',
        '4ec137245858469eb94a4e248f238694'
      );
      sinon.assert.neverCalledWith(
        setCookieStub,
        '_cc_id',
        '4ec137245858469eb94a4e248f238694'
      );
    });

    it('should save the expiry', function () {
      sinon.assert.calledWith(setLocalStorageStub, 'panoramaId_expiry', 10);

      sinon.assert.calledWith(setCookieStub, 'panoramaId_expiry', 10);
    });

    it('should save the id', function () {
      sinon.assert.calledWith(
        setLocalStorageStub,
        'panoramaId',
        'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a'
      );

      sinon.assert.calledWith(
        setCookieStub,
        'panoramaId',
        'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a'
      );
    });
  });

  describe('receives an optout request with an error 111', function () {
    let request;
    const callBackSpy = sinon.spy();

    beforeEach(function () {
      getCookieStub.withArgs('panoramaId_expiry').returns('1000');
      getCookieStub
        .withArgs('panoramaId')
        .returns(
          'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87d'
        );

      const submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
      submoduleCallback(callBackSpy);

      request = server.requests[0];

      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          errors: [111],
          expiry_ts: Date.now() + 30 * 24 * 60 * 60 * 1000,
        })
      );
    });

    it('should call the remote server when getId is called', function () {
      expect(callBackSpy.calledOnce).to.be.true;
    });

    it('should clear the panorama id', function () {
      sinon.assert.calledWith(removeFromLocalStorageStub, 'panoramaId');

      sinon.assert.calledWith(
        setCookieStub,
        'panoramaId',
        '',
        'Thu, 01 Jan 1970 00:00:00 GMT',
        'Lax'
      );
    });

    it('should not clear the profile id', function () {
      sinon.assert.neverCalledWith(removeFromLocalStorageStub, '_cc_id');

      sinon.assert.neverCalledWith(
        setCookieStub,
        '_cc_id',
        '',
        'Thu, 01 Jan 1970 00:00:00 GMT',
        'Lax'
      );
    });
  });

  describe('with a custom client id', function () {
    describe('with a client expiry set', function () {
      beforeEach(function () {
        getCookieStub
          .withArgs('panoramaId_expiry_1234')
          .returns(String(Date.now() + 500 * 1000));
      });

      describe('and an existing pano id', function() {
        let submoduleCallback;
        beforeEach(function () {
          getCookieStub
            .withArgs('panoramaId_expiry')
            .returns(String(Date.now() + 100000));
          getCookieStub
            .withArgs('panoramaId')
            .returns(
              'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87c'
            );
          submoduleCallback = lotamePanoramaIdSubmodule.getId(
            {
              params: {
                clientId: '1234',
              },
            },
            {
              gdprApplies: false,
            }
          );
        });

        it('should not call the remote server when getId is called nor get an id', function () {
          expect(submoduleCallback).to.be.eql({
            id: undefined,
            reason: 'NO_CLIENT_CONSENT',
          });
        });
      });

      describe('and no existing pano id', function () {
        let submoduleCallback;

        beforeEach(function () {
          // Let the panoramaId_expiry be empty

          submoduleCallback = lotamePanoramaIdSubmodule.getId(
            {
              params: {
                clientId: '1234',
              },
            },
            {
              gdprApplies: false,
            }
          );
        });

        it('should not call the remote server nor return an id', function () {
          expect(submoduleCallback).to.be.eql({
            id: undefined,
            reason: 'NO_CLIENT_CONSENT',
          });
        });
      });
    });

    describe('with no client expiry set', function () {
      describe('and no existing pano id', function () {
        let request;
        const callBackSpy = sinon.spy();

        beforeEach(function () {
          const submoduleCallback = lotamePanoramaIdSubmodule.getId(
            {
              params: {
                clientId: '1234',
              },
            },
            {
              gdprApplies: false,
            }
          ).callback;
          submoduleCallback(callBackSpy);

          request = server.requests[0];

          request.respond(
            200,
            responseHeader,
            JSON.stringify({
              profile_id: '4ec137245858469eb94a4e248f238694',
              core_id:
                'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87f',
              expiry_ts: 3600000,
            })
          );
        });

        it('should call the remote server when getId is called', function () {
          expect(callBackSpy.calledOnce).to.be.true;
        });

        it('should NOT set an expiry for the client', function () {
          sinon.assert.neverCalledWith(
            setCookieStub,
            'panoramaId_expiry_1234',
            sinon.match.number
          );
        });
      });

      describe('and an existing pano id', function () {
        let submoduleCallback;

        beforeEach(function () {
          getCookieStub
            .withArgs('panoramaId_expiry')
            .returns(String(Date.now() + 100000));
          getCookieStub
            .withArgs('panoramaId')
            .returns(
              'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87c'
            );
          submoduleCallback = lotamePanoramaIdSubmodule.getId(
            {
              params: {
                clientId: '1234',
              },
            },
            {
              gdprApplies: false,
            }
          );
        });

        it('should not call the remote server but use the cached value', function () {
          expect(submoduleCallback).to.be.eql({
            id: 'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87c',
          });
        });

        it('should NOT set an expiry for the client', function () {
          sinon.assert.neverCalledWith(
            setCookieStub,
            'panoramaId_expiry_1234',
            sinon.match.number
          );
        });
      });
    });
    describe('when client consent has errors', function () {
      let request;
      const callBackSpy = sinon.spy();

      beforeEach(function () {
        const submoduleCallback = lotamePanoramaIdSubmodule.getId(
          {
            params: {
              clientId: '1234',
            },
          },
          {
            gdpr: {
              gdprApplies: false,
            }
          }
        ).callback;
        submoduleCallback(callBackSpy);

        request = server.requests[0];

        request.respond(
          200,
          responseHeader,
          JSON.stringify({
            expiry_ts: 3600000,
            errors: [111],
            no_consent: 'CLIENT',
          })
        );
      });

      it('should call the remote server when getId is called', function () {
        expect(callBackSpy.calledOnce).to.be.true;
      });

      it('should pass client id back', function () {
        expect(request.url).to.be.eq(
          `${requestHost}?gdpr_applies=false&c=1234`
        );
      });

      it('should set the received expiry for the client', function() {
        sinon.assert.calledWith(
          setCookieStub,
          'panoramaId_expiry_1234',
          3600000
        );
      });

      it('should not clear the cache for the panorama id', function() {
        sinon.assert.neverCalledWith(
          setCookieStub,
          'panoramaId',
          sinon.match.any
        );
      });

      it('should not clear the cache for the panorama id expiry', function () {
        sinon.assert.neverCalledWith(
          setCookieStub,
          'panoramaId_expiry',
          sinon.match.any
        );
      });
    });
  });

  describe('storage handle', function () {
    const CACHED_ID = 'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87c';
    const NEW_ID = 'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87f';
    const STORAGE = { name: 'panoramaId', type: 'cookie&html5', expires: 7 };
    let handle;

    beforeEach(function () {
      handle = {
        get: sinon.stub(),
        manage: sinon.spy(),
        set: sinon.spy(),
        touch: sinon.spy(),
        remove: sinon.spy(),
      };
    });

    function handleWasUsed() {
      return ['get', 'manage', 'set', 'touch', 'remove'].some(method => handle[method].called);
    }

    function freshCache() {
      getCookieStub.withArgs('panoramaId_expiry').returns(String(Date.now() + 100000));
      getCookieStub.withArgs('panoramaId').returns(CACHED_ID);
    }

    function callbackResult(method, config, body) {
      const callback = sinon.spy();
      lotamePanoramaIdSubmodule[method](config, undefined, undefined, handle).callback(callback);
      server.requests[0].respond(200, responseHeader, body == null ? '' : JSON.stringify(body));
      sinon.assert.calledOnce(callback);
      return callback.args[0][0];
    }

    ['getId', 'extendId'].forEach(method => {
      describe(method, function () {
        [
          ['without storage', {}, false],
          ['with storage', { storage: STORAGE }, true],
        ].forEach(([desc, config, managed]) => {
          describe(desc, function () {
            it(`should ${managed ? '' : 'not '}manage storage`, function () {
              freshCache();
              lotamePanoramaIdSubmodule[method](config, undefined, undefined, handle);
              expect(handle.manage.called).to.equal(managed);
              if (!managed) {
                expect(handleWasUsed()).to.be.false;
              }
            });

            it('should return the cached id while it is fresh', function () {
              freshCache();
              expect(lotamePanoramaIdSubmodule[method](config, undefined, undefined, handle)).to.eql({ id: CACHED_ID });
            });

            it('should return no id when the client has not consented', function () {
              getCookieStub.withArgs('panoramaId_expiry_1234').returns(String(Date.now() + 100000));
              freshCache();
              expect(lotamePanoramaIdSubmodule[method]({ ...config, params: { clientId: '1234' } }, undefined, undefined, handle))
                .to.eql({ id: undefined, reason: 'NO_CLIENT_CONSENT' });
            });

            it('should call back with the id the server returns', function () {
              expect(callbackResult(method, config, { profile_id: 'profile', core_id: NEW_ID, expiry_ts: 10 })).to.equal(NEW_ID);
            });

            it('should call back with no id when the server clears it', function () {
              expect(callbackResult(method, config, { profile_id: 'profile', expiry_ts: 10 })).to.be.undefined;
              sinon.assert.calledWith(setCookieStub, 'panoramaId', '');
            });

            it('should call back with no id when the response is empty', function () {
              expect(callbackResult(method, config)).to.be.undefined;
            });

            it('should not write through the handle', function () {
              callbackResult(method, config, { profile_id: 'profile', core_id: NEW_ID, expiry_ts: 10 });
              sinon.assert.notCalled(handle.set);
              sinon.assert.notCalled(handle.touch);
              sinon.assert.notCalled(handle.remove);
            });
          });
        });

        describe('with storage and a copy stored by the User ID module', function () {
          beforeEach(function () {
            getCookieStub.withArgs('panoramaId_cst').returns('hash');
          });

          it('should remove it', function () {
            lotamePanoramaIdSubmodule[method]({ storage: STORAGE }, undefined, undefined, handle);
            sinon.assert.callOrder(handle.manage, handle.remove);
          });

          it('should remove it before reading its own cache', function () {
            freshCache();
            lotamePanoramaIdSubmodule[method]({ storage: STORAGE }, undefined, undefined, handle);
            sinon.assert.callOrder(handle.remove, getCookieStub.withArgs('panoramaId'));
          });

          it('should keep its own localStorage panoramaId, which remove() deletes', function () {
            getLocalStorageStub.withArgs('panoramaId').returns(CACHED_ID);
            lotamePanoramaIdSubmodule[method]({ storage: STORAGE }, undefined, undefined, handle);
            sinon.assert.callOrder(handle.remove, setLocalStorageStub.withArgs('panoramaId', CACHED_ID));
          });

          it('should be detected from localStorage too', function () {
            getCookieStub.withArgs('panoramaId_cst').returns(null);
            getLocalStorageStub.withArgs('panoramaId_cst').returns('hash');
            lotamePanoramaIdSubmodule[method]({ storage: STORAGE }, undefined, undefined, handle);
            sinon.assert.calledOnce(handle.remove);
          });
        });

        it('should not remove anything when the User ID module stored nothing', function () {
          freshCache();
          handle.get.returns(CACHED_ID);
          lotamePanoramaIdSubmodule[method]({ storage: STORAGE }, undefined, undefined, handle);
          sinon.assert.notCalled(handle.remove);
          sinon.assert.neverCalledWith(setLocalStorageStub, 'panoramaId', sinon.match.any);
        });

        it('should not use the handle when the storage name is wrong', function () {
          lotamePanoramaIdSubmodule[method]({ storage: { ...STORAGE, name: 'other' } }, undefined, undefined, handle);
          expect(handleWasUsed()).to.be.false;
        });
      });
    });

    it('should only log an invalid storage type', function () {
      freshCache();
      expect(lotamePanoramaIdSubmodule.getId({ storage: { ...STORAGE, type: 'other' } }, undefined, undefined, handle))
        .to.eql({ id: CACHED_ID });
      sinon.assert.calledOnce(utils.logError);
    });

    it('should not log a missing storage type', function () {
      freshCache();
      lotamePanoramaIdSubmodule.getId({ storage: { name: 'panoramaId' } }, undefined, undefined, handle);
      sinon.assert.notCalled(utils.logError);
    });
  });

  describe('onDataDeletionRequest', function () {
    beforeEach(function () {
      sandbox.stub(lotamePanoramaIdSubmodule, 'findRootDomain').returns('example.com');
    });

    function clearedKeys() {
      const cookies = setCookieStub.args
        .filter(([, value, expires, , domain]) => value === '' && new Date(expires).getTime() === 0 && domain === 'example.com')
        .map(([key]) => key);
      const localStorage = removeFromLocalStorageStub.args.map(([key]) => key);
      expect(cookies).to.have.members(localStorage);
      return localStorage;
    }

    it('should clear its own keys', function () {
      lotamePanoramaIdSubmodule.onDataDeletionRequest({ name: 'lotamePanoramaId' });
      expect(clearedKeys()).to.have.members(['panoramaId', 'panoramaId_expiry', '_cc_id']);
    });

    it('should clear the client expiry', function () {
      lotamePanoramaIdSubmodule.onDataDeletionRequest({ name: 'lotamePanoramaId', params: { clientId: '1234' } });
      expect(clearedKeys()).to.have.members(['panoramaId', 'panoramaId_expiry', '_cc_id', 'panoramaId_expiry_1234']);
    });
  });

  describe('eid', () => {
    before(() => {
      attachIdSystem(lotamePanoramaIdSubmodule);
    });
    it('lotamePanoramaId', function () {
      const userId = {
        lotamePanoramaId: 'some-random-id-value',
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'crwdcntrl.net',
        uids: [{ id: 'some-random-id-value', atype: 1 }],
      });
    });
  });
});

describe('LotameId through the User ID module with storage configured', function () {
  const STALE_ID = 'stale-panorama-id';
  const NEW_ID = 'new-panorama-id';
  const STORAGE_NAME = 'panoramaId';
  const EXPIRED = new Date(0).toUTCString();
  const LOTAME_KEYS = ['panoramaId_expiry', 'panoramaId_expiry_1234', '_cc_id'];
  let sandbox;

  function clearStorage() {
    COOKIE_SUFFIXES.forEach(suffix => coreStorage.setCookie(STORAGE_NAME + suffix, '', EXPIRED));
    HTML5_SUFFIXES.forEach(suffix => coreStorage.removeDataFromLocalStorage(STORAGE_NAME + suffix));
    LOTAME_KEYS.forEach(key => {
      coreStorage.setCookie(key, '', EXPIRED);
      coreStorage.removeDataFromLocalStorage(key);
    });
  }

  function seedCoreCopy(id) {
    const future = new Date(Date.now() + 60 * 60 * 1000).toUTCString();
    coreStorage.setCookie(STORAGE_NAME, id, future);
    coreStorage.setCookie(`${STORAGE_NAME}_cst`, getConsentHash(), future);
    coreStorage.setDataInLocalStorage(STORAGE_NAME, id);
    coreStorage.setDataInLocalStorage(`${STORAGE_NAME}_exp`, future);
    coreStorage.setDataInLocalStorage(`${STORAGE_NAME}_cst`, getConsentHash());
  }

  function startUserId(params) {
    init(config);
    setSubmoduleRegistry([lotamePanoramaIdSubmodule]);
    config.setConfig({
      userSync: {
        syncDelay: 0,
        auctionDelay: 100,
        userIds: [{
          name: 'lotamePanoramaId',
          params,
          storage: { name: STORAGE_NAME, type: 'cookie&html5', expires: 7 }
        }]
      }
    });
  }

  async function waitForRequest() {
    for (let i = 0; i < 20 && server.requests.length === 0; i++) {
      await new Promise(resolve => setTimeout(resolve));
    }
  }

  function expectCoreCopyRemoved() {
    expect(coreStorage.getCookie(`${STORAGE_NAME}_cst`)).to.not.be.ok;
    expect(coreStorage.getDataFromLocalStorage(`${STORAGE_NAME}_cst`)).to.not.be.ok;
    expect(coreStorage.getDataFromLocalStorage(`${STORAGE_NAME}_exp`)).to.not.be.ok;
    expect(coreStorage.getCookie(STORAGE_NAME)).to.not.equal(STALE_ID);
  }

  before(function () {
    hook.ready();
  });

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logInfo');
    allConsent.reset();
    clearStorage();
  });

  afterEach(function () {
    sandbox.restore();
    clearStorage();
    config.resetConfig();
    init(config);
  });

  it(`should use the id from Lotame's server instead of a stale stored copy, and remove that copy`, async function () {
    seedCoreCopy(STALE_ID);
    startUserId();
    const ids = getGlobal().getUserIdsAsync();
    await waitForRequest();

    expect(getGlobal().getUserIds().lotamePanoramaId).to.be.undefined;
    expectCoreCopyRemoved();
    server.requests[0].respond(200, responseHeader, JSON.stringify({
      profile_id: 'profile',
      core_id: NEW_ID,
      expiry_ts: Date.now() + 60 * 60 * 1000,
    }));
    await ids;

    expect(getGlobal().getUserIds().lotamePanoramaId).to.equal(NEW_ID);
    expect(coreStorage.getDataFromLocalStorage(STORAGE_NAME)).to.equal(NEW_ID);
    expectCoreCopyRemoved();
  });

  it(`should drop a stale stored copy when Lotame's server clears the id`, async function () {
    seedCoreCopy(STALE_ID);
    startUserId();
    const ids = getGlobal().getUserIdsAsync();
    await waitForRequest();
    server.requests[0].respond(200, responseHeader, JSON.stringify({
      profile_id: 'profile',
      expiry_ts: Date.now() + 60 * 60 * 1000,
    }));
    await ids;

    expect(getGlobal().getUserIds().lotamePanoramaId).to.be.undefined;
    expectCoreCopyRemoved();
  });

  it('should not serve a stale stored copy without client consent', async function () {
    seedCoreCopy(STALE_ID);
    coreStorage.setDataInLocalStorage('panoramaId_expiry', String(Date.now() + 60 * 60 * 1000));
    coreStorage.setDataInLocalStorage('panoramaId_expiry_1234', String(Date.now() + 60 * 60 * 1000));
    startUserId({ clientId: '1234' });
    await getGlobal().getUserIdsAsync();

    expect(server.requests.length).to.equal(0);
    expect(getGlobal().getUserIds().lotamePanoramaId).to.be.undefined;
    expectCoreCopyRemoved();
  });
});
