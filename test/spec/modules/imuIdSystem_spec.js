import { imuIdSubmodule, storage } from 'modules/imuIdSystem.js';

describe('imuId module', function () {
  let getLocalStorageStub;

  beforeEach(function (done) {
    getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    done();
  });

  afterEach(function () {
    getLocalStorageStub.restore();
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

  it('getId() should return the uid when it exists in local storages', function () {
    getLocalStorageStub.withArgs('__im_uid').returns('testUid');
    const id = imuIdSubmodule.getId(configParamTestCase);
    expect(id).to.be.deep.equal({id: 'testUid'});
  });

  storageTestCasesForEmpty.forEach(testCase => it('getId() should return the callback when it not exists in local storages', function () {
    getLocalStorageStub.withArgs('__im_uid').returns(testCase);
    const id = imuIdSubmodule.getId(configParamTestCase);
    expect(id).have.all.keys('callback');
  }))

  it('decode() should return the uid when it exists in local storages', function () {
    const id = imuIdSubmodule.decode('testDecode');
    expect(id).to.be.deep.equal({imuid: 'testDecode'});
  });
});
