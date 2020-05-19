import {lotameIdSubmodule, storage} from 'modules/lotameIdSystem.js';
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

    this.beforeEach(function() {
      let submoduleCallback = lotameIdSubmodule.getId({}).callback;
      submoduleCallback(callBackSpy);

      request = server.requests[0];

      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          profile_id: '4ec137245858469eb94a4e248f238694',
          expiry_ms: 10,
          core_id:
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a',
        })
      );
    });

    it('should call the remote server when getId is called', function () {
      expect(request.url).to.be.eq(
        'https://mconrad.dev.lotame.com:5555/id'
      );

      expect(callBackSpy.calledOnce).to.be.true;
    });

    it('should save the last update date', function () {
      // Check the calls to storage
      sinon.assert.calledWith(setLocalStorageStub, '_lota_last');
      sinon.assert.calledWith(setCookieStub, '_lota_last');
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
        '_lota_expiry', 10);

      sinon.assert.calledWith(
        setCookieStub,
        '_lota_expiry', 10
      );
    });

    it('should save the id', function () {
      sinon.assert.calledWith(
        setLocalStorageStub,
        '_lota_pano',
        'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a'
      );

      sinon.assert.calledWith(
        setCookieStub,
        '_lota_pano',
        'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a'
      );
    });
  });

  describe('a non-expired id found', function () {
    let submoduleCallback;

    this.beforeEach(function () {
      getLocalStorageStub.withArgs('_lota_expiry').returns(Date.now() + 100000);
      getCookieStub
        .withArgs('_lota_pano')
        .returns(
          'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a'
        );

      submoduleCallback = lotameIdSubmodule.getId({});
    });

    it('should not call the remote server when getId is called', function () {
      expect(submoduleCallback).to.be.eql({
        id: 'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a',
      });
    });
  });

  describe('an expired id found', function () {
    let request;
    let callBackSpy = sinon.spy();

    this.beforeEach(function () {
      getLocalStorageStub
        .withArgs('_lota_expiry')
        .returns(1000);
      getLocalStorageStub
        .withArgs('_lota_pano')
        .returns(
          'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a'
        );

      let submoduleCallback = lotameIdSubmodule.getId({}).callback;
      submoduleCallback(callBackSpy);

      request = server.requests[0];

      request.respond(
        200,
        responseHeader,
        JSON.stringify({
          profile_id: '4ec137245858469eb94a4e248f238694',
          core_id:
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a',
          expiry_ms: 3600000
        })
      );
    });

    it('should call the remote server when getId is called', function () {
      expect(callBackSpy.calledOnce).to.be.true;
    });
  });

  describe('gdpr applies', function () {
    let request;
    let callBackSpy = sinon.spy();

    this.beforeEach(function () {
      let submoduleCallback = lotameIdSubmodule.getId({}, {
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
            'ca22992567e3cd4d116a5899b88a55d0d857a23610db939ae6ac13ba2335d87a',
          expiry_ms: 3600000,
        })
      );
    });

    it('should call the remote server when getId is called', function () {
      expect(callBackSpy.calledOnce).to.be.true;
    });

    it('should pass the gdpr consent string back', function() {
      expect(request.url).to.be.eq(
        'https://mconrad.dev.lotame.com:5555/id?gdpr_consent=consentGiven'
      );
    });
  });

  it('should retrieve the id when decode is called', function() {
    var id = lotameIdSubmodule.decode('1234');
    expect(id).to.be.eql('1234');
  });
});
