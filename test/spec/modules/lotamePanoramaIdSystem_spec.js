import {
  lotamePanoramaIdSubmodule,
  storage,
} from 'modules/lotamePanoramaIdSystem.js';
import { uspDataHandler } from 'src/adapterManager.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import sinon from 'sinon';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';

const responseHeader = { 'Content-Type': 'application/json' };

describe('LotameId', function() {
  let logErrorStub;
  let getCookieStub;
  let setCookieStub;
  let getLocalStorageStub;
  let setLocalStorageStub;
  let removeFromLocalStorageStub;
  let timeStampStub;
  let uspConsentDataStub;
  let requestHost;

  const nowTimestamp = new Date().getTime();
  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
    getCookieStub = sinon.stub(storage, 'getCookie');
    setCookieStub = sinon.stub(storage, 'setCookie');
    getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    setLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
    removeFromLocalStorageStub = sinon.stub(
      storage,
      'removeDataFromLocalStorage'
    );
    timeStampStub = sinon.stub(utils, 'timestamp').returns(nowTimestamp);
    uspConsentDataStub = sinon.stub(uspDataHandler, 'getConsentData');
    if (navigator.userAgent && navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
      requestHost = 'https://c.ltmsphrcl.net/id';
    } else {
      requestHost = 'https://id.crwdcntrl.net/id';
    }
  });

  afterEach(function () {
    logErrorStub.restore();
    getCookieStub.restore();
    setCookieStub.restore();
    getLocalStorageStub.restore();
    setLocalStorageStub.restore();
    removeFromLocalStorageStub.restore();
    timeStampStub.restore();
    uspConsentDataStub.restore();
  });

  describe('caching initial data received from the remote server', function () {
    let request;
    let callBackSpy = sinon.spy();

    beforeEach(function() {
      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
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
      let callBackSpy = sinon.spy();

      beforeEach(function() {
        let submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
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
      let callBackSpy = sinon.spy();

      beforeEach(function () {
        let submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
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
      let callBackSpy = sinon.spy();

      beforeEach(function () {
        getCookieStub.withArgs('panoramaId_expiry').returns('1000');
        getCookieStub
          .withArgs('panoramaId')
          .returns(
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87d'
          );

        let submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
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
      let callBackSpy = sinon.spy();

      beforeEach(function () {
        getCookieStub.withArgs('panoramaId_expiry').returns('1000');
        getCookieStub
          .withArgs('panoramaId')
          .returns(
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87d'
          );

        let submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
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
    })
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
      let callBackSpy = sinon.spy();

      beforeEach(function () {
        getLocalStorageStub
          .withArgs('panoramaId_expiry')
          .returns('1000');

        let submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
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
    let callBackSpy = sinon.spy();

    beforeEach(function () {
      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}, {
        gdprApplies: true,
        consentString: 'consentGiven'
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

  describe('when gdpr applies and falls back to eupubconsent cookie', function () {
    let request;
    let callBackSpy = sinon.spy();
    let consentData = {
      gdprApplies: true,
      consentString: undefined
    };

    beforeEach(function () {
      getCookieStub
        .withArgs('eupubconsent-v2')
        .returns('consentGiven');

      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}, consentData).callback;
      submoduleCallback(callBackSpy);

      // the contents of the response don't matter for this
      request = server.requests[0];
      request.respond(200, responseHeader, '');
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

  describe('when gdpr applies and falls back to euconsent cookie', function () {
    let request;
    let callBackSpy = sinon.spy();
    let consentData = {
      gdprApplies: true,
      consentString: undefined
    };

    beforeEach(function () {
      getCookieStub
        .withArgs('euconsent-v2')
        .returns('consentGiven');

      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}, consentData).callback;
      submoduleCallback(callBackSpy);

      // the contents of the response don't matter for this
      request = server.requests[0];
      request.respond(200, responseHeader, '');
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
    let callBackSpy = sinon.spy();
    let consentData = {
      gdprApplies: true,
      consentString: undefined
    };

    beforeEach(function () {
      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}, consentData).callback;
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

  describe('when no consentData and falls back to eupubconsent cookie', function () {
    let request;
    let callBackSpy = sinon.spy();
    let consentData;

    beforeEach(function () {
      getCookieStub
        .withArgs('eupubconsent-v2')
        .returns('consentGiven');

      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}, consentData).callback;
      submoduleCallback(callBackSpy);

      // the contents of the response don't matter for this
      request = server.requests[0];
      request.respond(200, responseHeader, '');
    });

    it('should call the remote server when getId is called', function () {
      expect(callBackSpy.calledOnce).to.be.true;
    });

    it('should pass the gdpr consent string back', function() {
      expect(request.url).to.be.eq(
        `${requestHost}?gdpr_consent=consentGiven`
      );
    });
  });

  describe('when no consentData and falls back to euconsent cookie', function () {
    let request;
    let callBackSpy = sinon.spy();
    let consentData;

    beforeEach(function () {
      getCookieStub
        .withArgs('euconsent-v2')
        .returns('consentGiven');

      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}, consentData).callback;
      submoduleCallback(callBackSpy);

      // the contents of the response don't matter for this
      request = server.requests[0];
      request.respond(200, responseHeader, '');
    });

    it('should call the remote server when getId is called', function () {
      expect(callBackSpy.calledOnce).to.be.true;
    });

    it('should pass the gdpr consent string back', function() {
      expect(request.url).to.be.eq(
        `${requestHost}?gdpr_consent=consentGiven`
      );
    });
  });

  describe('when no consentData and no cookies', function () {
    let request;
    let callBackSpy = sinon.spy();
    let consentData;

    beforeEach(function () {
      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}, consentData).callback;
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
    let callBackSpy = sinon.spy();

    beforeEach(function () {
      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
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
    let callBackSpy = sinon.spy();

    beforeEach(function () {
      getCookieStub.withArgs('panoramaId_expiry').returns('1000');
      getCookieStub
        .withArgs('panoramaId')
        .returns(
          'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87d'
        );

      let submoduleCallback = lotamePanoramaIdSubmodule.getId({}).callback;
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
        let callBackSpy = sinon.spy();

        beforeEach(function () {
          uspConsentDataStub.returns('1NNN');
          let submoduleCallback = lotamePanoramaIdSubmodule.getId(
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

        it('should pass the usp consent string and client id back', function () {
          expect(request.url).to.be.eq(
            `${requestHost}?gdpr_applies=false&us_privacy=1NNN&c=1234`
          );
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
      let callBackSpy = sinon.spy();

      beforeEach(function () {
        let submoduleCallback = lotamePanoramaIdSubmodule.getId(
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
  })
});
