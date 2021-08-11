import {
  imuIdSubmodule,
  storage,
  getApiUrl,
  apiSuccessProcess,
  getLocalData,
  callImuidApi,
  getApiCallback,
  storageKey,
  cookieKey,
  apiUrl
} from 'modules/imuIdSystem.js';

import * as utils from 'src/utils.js';

describe('imuId module', function () {
  // let setLocalStorageStub;
  let getLocalStorageStub;
  let getCookieStub;
  // let ajaxBuilderStub;

  beforeEach(function (done) {
    // setLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
    getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    getCookieStub = sinon.stub(storage, 'getCookie');
    // ajaxBuilderStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(mockResponse('{}'));
    done();
  });

  afterEach(function () {
    getLocalStorageStub.restore();
    getCookieStub.restore();
    // ajaxBuilderStub.restore();
  });

  const storageTestCasesForEmpty = [
    undefined,
    null,
    ''
  ]

  const configParamTestCase = {
    params: {
      cid: 5126
    }
  }

  describe('getId()', function () {
    it('should return the uid when it exists in local storages', function () {
      getLocalStorageStub.withArgs(storageKey).returns('testUid');
      const id = imuIdSubmodule.getId(configParamTestCase);
      expect(id).to.be.deep.equal({id: 'testUid'});
    });

    storageTestCasesForEmpty.forEach(testCase => it('should return the callback when it not exists in local storages', function () {
      getLocalStorageStub.withArgs(storageKey).returns(testCase);
      const id = imuIdSubmodule.getId(configParamTestCase);
      expect(id).have.all.keys('callback');
    }));

    it('should return "undefined" when empty param', function () {
      const id = imuIdSubmodule.getId();
      expect(id).to.be.deep.equal(undefined);
    });

    it('should return the callback when it not exists in local storages (and has vid)', function () {
      getCookieStub.withArgs(cookieKey).returns('test');
      const id = imuIdSubmodule.getId(configParamTestCase);
      expect(id).have.all.keys('callback');
    });
  });

  describe('getApiUrl()', function () {
    it('should return default url when cid only', function () {
      const url = getApiUrl(5126);
      expect(url).to.be.equal(`${apiUrl}?cid=5126`);
    });

    it('should return param url when set url', function () {
      const url = getApiUrl(5126, 'testurl');
      expect(url).to.be.equal('testurl?cid=5126');
    });
  });

  describe('decode()', function () {
    it('should return the uid when it exists in local storages', function () {
      const id = imuIdSubmodule.decode('testDecode');
      expect(id).to.be.deep.equal({imuid: 'testDecode'});
    });

    it('should return the undefined when decode id is not "string"', function () {
      const id = imuIdSubmodule.decode(1);
      expect(id).to.equal(undefined);
    });
  });

  describe('getLocalData()', function () {
    it('always have the same key', function () {
      getLocalStorageStub.withArgs(storageKey).returns('testid');
      getCookieStub.withArgs(cookieKey).returns('testvid');
      getLocalStorageStub.withArgs(`${storageKey}_mt`).returns(new Date(utils.timestamp()).toUTCString());
      const localData = getLocalData();
      expect(localData).to.be.deep.equal({
        id: 'testid',
        vid: 'testvid',
        expired: false
      });
    });

    it('should return expired is true', function () {
      getLocalStorageStub.withArgs(`${storageKey}_mt`).returns(0);
      const localData = getLocalData();
      expect(localData).to.be.deep.equal({
        id: undefined,
        vid: undefined,
        expired: true
      });
    });
  });

  describe('apiSuccessProcess()', function () {
    it('should return the undefined when success response', function () {
      const res = apiSuccessProcess({
        uid: 'test',
        vid: 'test'
      });
      expect(res).to.equal(undefined);
    });

    it('should return the undefined when empty response', function () {
      const res = apiSuccessProcess();
      expect(res).to.equal(undefined);
    });

    it('should return the undefined when error response', function () {
      const res = apiSuccessProcess({
        error: 'error response'
      });
      expect(res).to.equal(undefined);
    });
  });

  describe('callImuidApi()', function () {
    it('should return function when set url', function () {
      const res = callImuidApi(`${apiUrl}?cid=5126`);
      expect(res).to.exist.and.to.be.a('function');
    });
  });

  describe('getApiCallback()', function () {
    it('should return success and error functions', function () {
      const res = getApiCallback();
      expect(res.success).to.exist.and.to.be.a('function');
      expect(res.error).to.exist.and.to.be.a('function');
    });

    it('should return "undefined" success', function () {
      const res = getApiCallback(function(uid) { return uid });
      expect(res.success('{"uid": "testid"}')).to.equal(undefined);
      expect(res.error()).to.equal(undefined);
    });

    it('should return "undefined" catch error response', function () {
      const res = getApiCallback(function(uid) { return uid });
      expect(res.success('error response')).to.equal(undefined);
    });
  });
});
