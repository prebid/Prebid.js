import { getAdserverCategoryHook, initTranslation, storage } from 'modules/categoryTranslation.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import { expect } from 'chai';

describe('category translation', function () {
  let fakeTranslationServer;
  let getLocalStorageStub;

  beforeEach(function () {
    fakeTranslationServer = sinon.fakeServer.create();
    getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
  });

  afterEach(function() {
    fakeTranslationServer.reset();
    getLocalStorageStub.restore();
    config.resetConfig();
  });

  it('should translate iab category to adserver category', function () {
    config.setConfig({
      'adpod': {
        'brandCategoryExclusion': true
      }
    });
    getLocalStorageStub.returns(JSON.stringify({
      'mapping': {
        'iab-1': {
          'id': 1,
          'name': 'sample'
        }
      }
    }));
    let bid = {
      meta: {
        primaryCatId: 'iab-1'
      }
    }
    getAdserverCategoryHook(sinon.spy(), 'code', bid);
    expect(bid.meta.adServerCatId).to.equal(1);
  });

  it('should set adserverCatId to undefined if not found in mapping file', function() {
    config.setConfig({
      'adpod': {
        'brandCategoryExclusion': true
      }
    });
    getLocalStorageStub.returns(JSON.stringify({
      'mapping': {
        'iab-1': {
          'id': 1,
          'name': 'sample'
        }
      }
    }));
    let bid = {
      meta: {
        primaryCatId: 'iab-2'
      }
    }
    getAdserverCategoryHook(sinon.spy(), 'code', bid);
    expect(bid.meta.adServerCatId).to.equal(undefined);
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

  it('should make ajax call to update mapping file if data found in localstorage is expired', function () {
    let clock = sinon.useFakeTimers(utils.timestamp());
    getLocalStorageStub.returns(JSON.stringify({
      lastUpdated: utils.timestamp() - 2 * 24 * 60 * 60 * 1000,
      mapping: {
        'iab-1': '1'
      }
    }));
    initTranslation();
    expect(fakeTranslationServer.requests.length).to.equal(1);
    clock.restore();
  });

  it('should use default mapping file if publisher has not defined in config', function () {
    getLocalStorageStub.returns(null);
    initTranslation('http://sample.com', 'somekey');
    expect(fakeTranslationServer.requests.length).to.equal(1);
    expect(fakeTranslationServer.requests[0].url).to.equal('http://sample.com');
  });

  it('should use publisher defined mapping file', function () {
    config.setConfig({
      'brandCategoryTranslation': {
        'translationFile': 'http://sample.com'
      }
    });
    getLocalStorageStub.returns(null);
    initTranslation('http://sample.com', 'somekey');
    expect(fakeTranslationServer.requests.length).to.equal(2);
    expect(fakeTranslationServer.requests[0].url).to.equal('http://sample.com');
  });
});
