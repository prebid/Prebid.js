import * as utils from 'src/utils.js';
import * as idlibrary from 'modules/idLibrary.js';

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
    idlibrary.setConfig({});
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
      idlibrary.setConfig({});
      sinon.assert.called(utils.logError);
    });
    it('results with config available', function () {
      idlibrary.setConfig({ 'url': 'URL' });
      sinon.assert.called(utils.logInfo);
    });
    it('results with config default debounce ', function () {
      let config = { 'url': 'URL' }
      idlibrary.setConfig(config);
      expect(config.debounce).to.be.equal(250);
    });
    it('results with config default fullscan ', function () {
      let config = { 'url': 'URL' }
      idlibrary.setConfig(config);
      expect(config.fullscan).to.be.equal(true);
    });
    it('results with config fullscan ', function () {
      let config = { 'url': 'URL', 'fullscan': false }
      idlibrary.setConfig(config);
      expect(config.fullscan).to.be.equal(false);
    });
  });
});
