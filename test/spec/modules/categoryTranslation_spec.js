import { getFreeWheelCategoryHook, initTranslation } from 'modules/categoryTranslation';
import { config } from 'src/config';
import * as utils from 'src/utils';
import { expect } from 'chai';

describe('category translation', function () {
  let fakeTranslationServer;
  let getLocalStorageStub;

  beforeEach(function () {
    fakeTranslationServer = sinon.fakeServer.create();
    getLocalStorageStub = sinon.stub(utils, 'getDataFromLocalStorage');
  });

  afterEach(function() {
    getLocalStorageStub.restore();
    config.resetConfig();
  });

  it('should translate iab category to adserver category', function () {
    getLocalStorageStub.returns(JSON.stringify({
      mapping: {
        'iab-1': '1'
      }
    }));
    let bid = {
      meta: {
        iabSubCatId: 'iab-1'
      }
    }
    getFreeWheelCategoryHook(sinon.spy(), 'code', bid);
    expect(bid.meta.adServerCatId).to.equal('1');
  });

  it('should not make ajax call to update mapping file if data found in localstorage and is not expired', function () {
    let clock = sinon.useFakeTimers(utils.timestamp());
    getLocalStorageStub.returns(JSON.stringify({
      lastUpdated: utils.timestamp(),
      mapping: {
        'iab-1': '1'
      }
    }));
    initTranslation();
    expect(fakeTranslationServer.requests.length).to.equal(0);
    clock.restore();
  });

  it('should use default mapping file if publisher has not defined in config', function () {
    getLocalStorageStub.returns(null);
    initTranslation();
    expect(fakeTranslationServer.requests.length).to.equal(1);
    expect(fakeTranslationServer.requests[0].url).to.equal('https://api.myjson.com/bins/j5d0k');
  });

  it('should use publisher defined defined mapping file', function () {
    config.setConfig({
      'brandCategoryTranslation': {
        'translationFile': 'http://sample.com'
      }
    });
    getLocalStorageStub.returns(null);
    initTranslation();
    expect(fakeTranslationServer.requests.length).to.equal(1);
    expect(fakeTranslationServer.requests[0].url).to.equal('http://sample.com');
  });
});
