import {init} from 'modules/userId/index.js';
import * as utils from 'src/utils.js';
import * as idImportlibrary from 'modules/idImportLibrary.js';
import {getGlobal} from '../../../src/prebidGlobal.js';
import {config} from 'src/config.js';
import {hook} from '../../../src/hook.js';
var expect = require('chai').expect;

const mockMutationObserver = {
  observe: () => {
    return null
  }
}

describe('IdImportLibrary Tests', function () {
  let fakeServer;
  let sandbox;
  let clock;
  let fn = sinon.spy();

  before(() => {
    hook.ready();
    init(config);
  });

  beforeEach(function () {
    fakeServer = sinon.fakeServer.create();
    sinon.stub(utils, 'logInfo');
    sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    utils.logInfo.restore();
    utils.logError.restore();
    fakeServer.restore();
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

    it('results when no config is set', function () {
      idImportlibrary.setConfig();
      sinon.assert.called(utils.logError);
    });
    it('results when config is empty', function () {
      idImportlibrary.setConfig({});
      sinon.assert.called(utils.logError);
    });
    it('results with config available with url and debounce', function () {
      idImportlibrary.setConfig({ 'url': 'URL', 'debounce': 0 });
      sinon.assert.called(utils.logInfo);
    });
    it('results with config debounce ', function () {
      let config = { 'url': 'URL', 'debounce': 300 }
      idImportlibrary.setConfig(config);
      expect(config.debounce).to.be.equal(300);
    });

    it('results with config default debounce ', function () {
      let config = { 'url': 'URL' }
      idImportlibrary.setConfig(config);
      expect(config.debounce).to.be.equal(250);
    });
    it('results with config default fullscan ', function () {
      let config = { 'url': 'URL', 'debounce': 0 }
      idImportlibrary.setConfig(config);
      expect(config.fullscan).to.be.equal(false);
    });
    it('results with config fullscan ', function () {
      let config = { 'url': 'URL', 'fullscan': true, 'debounce': 0 }
      idImportlibrary.setConfig(config);
      expect(config.fullscan).to.be.equal(true);
      expect(config.inputscan).to.be.equal(false);
    });
    it('results with config inputscan ', function () {
      let config = { 'inputscan': true, 'debounce': 0 }
      idImportlibrary.setConfig(config);
      expect(config.inputscan).to.be.equal(true);
    });
  });
  describe('Test with email is found', function () {
    let mutationObserverStub;
    let userId;
    let refreshUserIdSpy;
    beforeEach(function() {
      let sandbox = sinon.createSandbox();
      refreshUserIdSpy = sinon.stub(getGlobal(), 'refreshUserIds');
      clock = sinon.useFakeTimers(1046952000000); // 2003-03-06T12:00:00Z
      mutationObserverStub = sinon.stub(window, 'MutationObserver').returns(mockMutationObserver);
      userId = sandbox.stub(getGlobal(), 'getUserIds').returns({id: {'MOCKID': '1111'}});
      fakeServer.respondWith('POST', 'URL', [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        ''
      ]);
    });
    afterEach(function () {
      sandbox.restore();
      clock.restore();
      userId.restore();
      refreshUserIdSpy.restore();
      mutationObserverStub.restore();
      document.body.innerHTML = '';
    });

    it('results with config fullscan with email found in html ', function () {
      document.body.innerHTML = '<body><div>test@test.com</div></body>';
      let config = { 'url': 'URL', 'fullscan': true, 'debounce': 0 }
      idImportlibrary.setConfig(config);
      expect(config.fullscan).to.be.equal(true);
      expect(config.inputscan).to.be.equal(false);
      expect(refreshUserIdSpy.calledOnce).to.equal(true);
    });

    it('results with config fullscan with no email found in html ', function () {
      document.body.innerHTML = '<body><div>test</div></body>';
      let config = { 'url': 'URL', 'fullscan': true, 'debounce': 0 }
      idImportlibrary.setConfig(config);
      expect(config.fullscan).to.be.equal(true);
      expect(config.inputscan).to.be.equal(false);
      expect(refreshUserIdSpy.calledOnce).to.equal(false);
    });

    it('results with config formElementId without listner ', function () {
      let config = { url: 'testUrl', 'formElementId': 'userid', 'debounce': 0 }
      document.body.innerHTML = '<body><input type="text" id="userid" value="test@test.com"></body>';
      idImportlibrary.setConfig(config);
      expect(config.formElementId).to.be.equal('userid');
      expect(refreshUserIdSpy.calledOnce).to.equal(true);
    });

    it('results with config formElementId with listner ', function () {
      let config = { url: 'testUrl', 'formElementId': 'userid', 'debounce': 0 }
      document.body.innerHTML = '<body><input type="text" id="userid" value=""></body>';
      idImportlibrary.setConfig(config);
      expect(config.formElementId).to.be.equal('userid');
      expect(refreshUserIdSpy.calledOnce).to.equal(false);
    });

    it('results with config target without listner ', function () {
      let config = { url: 'testUrl', 'target': 'userid', 'debounce': 0 }
      document.body.innerHTML = '<body><div id="userid">test@test.com<div></div></body>';
      idImportlibrary.setConfig(config);
      expect(config.target).to.be.equal('userid');
      expect(refreshUserIdSpy.calledOnce).to.equal(true);
    });
    it('results with config target with listner ', function () {
      let config = { url: 'testUrl', 'target': 'userid', 'debounce': 0 }
      document.body.innerHTML = '<body><div id="userid"><div></div></body>';
      idImportlibrary.setConfig(config);

      expect(config.target).to.be.equal('userid');
      expect(refreshUserIdSpy.calledOnce).to.equal(false);
    });

    it('results with config target with listner', function () {
      let config = { url: 'testUrl', 'target': 'userid', 'debounce': 0 }
      idImportlibrary.setConfig(config);
      document.body.innerHTML = '<body><div id="userid">test@test.com<div></div></body>';
      expect(config.target).to.be.equal('userid');
      expect(refreshUserIdSpy.calledOnce).to.equal(false);
    });
    it('results with config fullscan ', function () {
      let config = { url: 'testUrl', 'fullscan': true, 'debounce': 0 }
      idImportlibrary.setConfig(config);
      document.body.innerHTML = '<body><div id="userid"><div></div></body>';
      expect(config.fullscan).to.be.equal(true);
      expect(refreshUserIdSpy.calledOnce).to.equal(false);
    });
    it('results with config inputscan with listner', function () {
      let config = { url: 'testUrl', 'inputscan': true, 'debounce': 0 }
      var input = document.createElement('input');
      input.setAttribute('type', 'text');
      document.body.appendChild(input);
      idImportlibrary.setConfig(config);
      expect(config.inputscan).to.be.equal(true);
      input.setAttribute('value', 'text@text.com');
      const inputEvent = new InputEvent('blur');
      input.dispatchEvent(inputEvent);
      expect(refreshUserIdSpy.calledOnce).to.equal(true);
    });

    it('results with config inputscan with listner and no user ids ', function () {
      let config = { 'url': 'testUrl', 'inputscan': true, 'debounce': 0 }
      document.body.innerHTML = '<body><input  id="userid" value=""></body>';
      idImportlibrary.setConfig(config);
      expect(config.inputscan).to.be.equal(true);
      expect(refreshUserIdSpy.calledOnce).to.equal(false);
    });

    it('results with config inputscan with listner ', function () {
      let config = { 'url': 'testUrl', 'inputscan': true, 'debounce': 0 }
      document.body.innerHTML = '<body><input  id="userid" type=text value=""></body>';
      idImportlibrary.setConfig(config);
      expect(config.inputscan).to.be.equal(true);
      expect(refreshUserIdSpy.calledOnce).to.equal(false);
    });

    it('results with config inputscan without listner ', function () {
      let config = { 'url': 'testUrl', 'inputscan': true, 'debounce': 0 }
      document.body.innerHTML = '<body><input  id="userid" value="test@test.com"></body>';
      idImportlibrary.setConfig(config);
      expect(config.inputscan).to.be.equal(true);
      expect(refreshUserIdSpy.calledOnce).to.equal(true);
    });
  });
  describe('Tests with no user ids', function () {
    let mutationObserverStub;
    let userId;
    let jsonSpy;
    beforeEach(function() {
      let sandbox = sinon.createSandbox();
      clock = sinon.useFakeTimers(1046952000000); // 2003-03-06T12:00:00Z
      mutationObserverStub = sinon.stub(window, 'MutationObserver');
      jsonSpy = sinon.spy(JSON, 'stringify');
      fakeServer.respondWith('POST', 'URL', [200,
        {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        ''
      ]);
    });
    afterEach(function () {
      sandbox.restore();
      clock.restore();
      jsonSpy.restore();
      mutationObserverStub.restore();
    });
    it('results with config inputscan without listner with no user ids #1', function () {
      let config = { 'url': 'testUrl', 'inputscan': true, 'debounce': 0 }
      document.body.innerHTML = '<body><input  id="userid" value="test@test.com"></body>';
      idImportlibrary.setConfig(config);
      expect(config.inputscan).to.be.equal(true);
      expect(jsonSpy.calledOnce).to.equal(false);
    });
    it('results with config inputscan without listner with no user ids #2', function () {
      let config = { 'url': 'testUrl', 'inputscan': true, 'debounce': 0 }
      document.body.innerHTML = '<body><input  id="userid"></body>';
      idImportlibrary.setConfig(config);
      expect(config.inputscan).to.be.equal(true);
      expect(jsonSpy.calledOnce).to.equal(false);
    });
  });
});
