import * as utils from 'src/utils.js';
import * as idImportlibrary from 'modules/idImportLibrary.js';

var expect = require('chai').expect;

describe('currency', function () {
  let fakeCurrencyFileServer;
  let sandbox;
  let clock;

  let fn = sinon.spy();

  beforeEach(function () {
    fakeCurrencyFileServer = sinon.fakeServer.create();
    sinon.stub(utils, 'logInfo');
    sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    utils.logInfo.restore();
    utils.logError.restore();
    fakeCurrencyFileServer.restore();
    idImportlibrary.setConfig({});
  });

  describe('setConfig', function () {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      clock = sinon.useFakeTimers(1046952000000); // 2003-03-06T12:00:00Z
    });

    afterEach(function () {
      sandbox.restore();
      clock.restore();
    });

    it('results when no config available', function () {
      idImportlibrary.setConfig({});
      sinon.assert.called(utils.logError);
    });
    it('results with config available', function () {
      idImportlibrary.setConfig({ 'url': 'URL' });
      sinon.assert.called(utils.logInfo);
    });
    it('results with config default debounce ', function () {
      let config = { 'url': 'URL' }
      idImportlibrary.setConfig(config);
      expect(config.debounce).to.be.equal(250);
    });
    it('results with config default fullscan ', function () {
      let config = { 'url': 'URL' }
      idImportlibrary.setConfig(config);
      expect(config.fullscan).to.be.equal(false);
    });
    it('results with config fullscan ', function () {
      let config = { 'url': 'URL', 'fullscan': true }
      idImportlibrary.setConfig(config);
      expect(config.fullscan).to.be.equal(true);
    });
  });
});
