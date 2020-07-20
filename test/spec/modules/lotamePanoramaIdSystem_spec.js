import {
  lotamePanoramaIdSubmodule,
  storage,
} from 'modules/lotamePanoramaIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';

const responseHeader = { 'Content-Type': 'application/json' };

describe('LotameId', function() {
  let logErrorStub;
  let getCookieStub;
  let setCookieStub;
  let getLocalStorageStub;
  let setLocalStorageStub;
  let removeFromLocalStorageStub;
  let timeStampStub;

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
  });

  afterEach(function () {
    logErrorStub.restore();
    getCookieStub.restore();
    setCookieStub.restore();
    getLocalStorageStub.restore();
    setLocalStorageStub.restore();
    removeFromLocalStorageStub.restore();
    timeStampStub.restore();
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
      expect(request.url).to.be.eq('https://id.crwdcntrl.net/id');

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
        'https://id.crwdcntrl.net/id?gdpr_applies=true&gdpr_consent=consentGiven'
      );
    });
  });

  it('should retrieve the id when decode is called', function() {
    var id = lotamePanoramaIdSubmodule.decode('1234');
    expect(id).to.be.eql({
      'lotamePanoramaId': '1234'
    });
  });
});
