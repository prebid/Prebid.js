import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

import * as utils from '../../../src/utils.js';
import * as hook from '../../../src/hook.js';
import * as refererDetection from '../../../src/refererDetection.js';

import { __TEST__ } from '../../../modules/panxoRtdProvider.js';

const {
  SUBMODULE_NAME,
  SCRIPT_URL,
  main,
  load,
  onImplLoaded,
  onImplMessage,
  onGetBidRequestData,
  flushPendingCallbacks
} = __TEST__;

describe('panxo RTD module', function () {
  let sandbox;

  const stubUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const panxoBridgeId = `panxo_${stubUuid}`;
  const stubWindow = { [panxoBridgeId]: undefined };

  const validSiteId = 'a1b2c3d4e5f67890';

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'getWindowSelf').returns(stubWindow);
    sandbox.stub(utils, 'generateUUID').returns(stubUuid);
    sandbox.stub(refererDetection, 'getRefererInfo').returns({ domain: 'example.com' });
  });
  afterEach(function() {
    sandbox.restore();
  });

  describe('Initialization step', function () {
    let sandbox2;
    let connectSpy;
    beforeEach(function() {
      sandbox2 = sinon.createSandbox();
      connectSpy = sandbox.spy();
      // Simulate: once the impl script is loaded, it registers the bridge API
      sandbox2.stub(stubWindow, panxoBridgeId).value({ connect: connectSpy });
    });
    afterEach(function () {
      sandbox2.restore();
    });

    it('should accept valid configuration with siteId', function () {
      expect(() => load({ params: { siteId: validSiteId } })).to.not.throw();
    });

    it('should throw an Error when siteId is missing', function () {
      expect(() => load({})).to.throw();
      expect(() => load({ params: {} })).to.throw();
      expect(() => load({ params: { siteId: '' } })).to.throw();
    });

    it('should throw an Error when siteId is not a valid hex string', function () {
      expect(() => load({ params: { siteId: 'abc' } })).to.throw();
      expect(() => load({ params: { siteId: 123 } })).to.throw();
      expect(() => load({ params: { siteId: 'zzzzzzzzzzzzzzzz' } })).to.throw();
      expect(() => load({ params: { siteId: 'a1b2c3d4e5f6789' } })).to.throw(); // 15 chars
      expect(() => load({ params: { siteId: 'a1b2c3d4e5f678901' } })).to.throw(); // 17 chars
    });

    it('should insert implementation script with correct URL', () => {
      load({ params: { siteId: validSiteId } });

      expect(loadExternalScriptStub.calledOnce).to.be.true;

      const args = loadExternalScriptStub.getCall(0).args;
      expect(args[0]).to.be.equal(
        `${SCRIPT_URL}?siteId=${validSiteId}&session=${stubUuid}&r=example.com`
      );
      expect(args[2]).to.be.equal(SUBMODULE_NAME);
      expect(args[3]).to.be.equal(onImplLoaded);
    });

    it('should connect to the implementation script once it loads', function () {
      load({ params: { siteId: validSiteId } });

      expect(loadExternalScriptStub.calledOnce).to.be.true;
      expect(connectSpy.calledOnce).to.be.true;

      const args = connectSpy.getCall(0).args;
      expect(args[0]).to.haveOwnProperty('cmd'); // pbjs global
      expect(args[0]).to.haveOwnProperty('que');
      expect(args[1]).to.be.equal(onImplMessage);
    });

    it('should flush pending callbacks when bridge is unavailable', function () {
      sandbox2.restore();
      // Bridge is not registered on the window -- onImplLoaded should fail open
      sandbox2 = sinon.createSandbox();
      sandbox2.stub(stubWindow, panxoBridgeId).value(undefined);

      load({ params: { siteId: validSiteId } });

      const callbackSpy = sandbox2.spy();
      const reqBidsConfig = { ortb2Fragments: { bidder: {}, global: {} } };

      // Queue a callback before bridge fails
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      // onImplLoaded already ran (bridge undefined) and flushed
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('should not throw when bridge message is null', function () {
      load({ params: { siteId: validSiteId } });
      expect(() => onImplMessage(null)).to.not.throw();
      expect(() => onImplMessage(undefined)).to.not.throw();
    });
  });

  describe('Bid enrichment step', function () {
    const signalData = {
      device: { v1: 'session-token-123' },
      site: { ai: true, src: 'chatgpt', conf: 0.95, seg: 'technology', co: 'US' }
    };

    let sandbox2;
    let callbackSpy;
    let reqBidsConfig;
    beforeEach(function() {
      sandbox2 = sinon.createSandbox();
      callbackSpy = sandbox2.spy();
      reqBidsConfig = { ortb2Fragments: { bidder: {}, global: {} } };
      // Prevent onImplLoaded from firing automatically so tests can
      // control module readiness via onImplMessage directly.
      loadExternalScriptStub.callsFake(() => {});
    });
    afterEach(function () {
      loadExternalScriptStub.reset();
      sandbox2.restore();
    });

    it('should defer callback when implementation has not sent a signal yet', () => {
      load({ params: { siteId: validSiteId } });

      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      // Callback is deferred until the implementation script sends its first signal
      expect(callbackSpy.notCalled).to.be.true;
    });

    it('should flush deferred callback once a signal arrives', () => {
      load({ params: { siteId: validSiteId } });

      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      expect(callbackSpy.notCalled).to.be.true;

      // First signal arrives -- deferred callback should now fire
      onImplMessage({ type: 'signal', data: { device: { v1: 'tok' }, site: {} } });
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('should flush all deferred callbacks when the first signal arrives', () => {
      load({ params: { siteId: validSiteId } });

      const spy1 = sandbox2.spy();
      const spy2 = sandbox2.spy();
      const cfg1 = { ortb2Fragments: { bidder: {}, global: {} } };
      const cfg2 = { ortb2Fragments: { bidder: {}, global: {} } };

      onGetBidRequestData(cfg1, spy1, { params: {} }, {});
      onGetBidRequestData(cfg2, spy2, { params: {} }, {});
      expect(spy1.notCalled).to.be.true;
      expect(spy2.notCalled).to.be.true;

      onImplMessage({ type: 'signal', data: { device: { v1: 'tok' }, site: {} } });
      expect(spy1.calledOnce).to.be.true;
      expect(spy2.calledOnce).to.be.true;
    });

    it('should call callback immediately once implementation is ready', () => {
      load({ params: { siteId: validSiteId } });

      // Mark implementation as ready via a signal
      onImplMessage({ type: 'signal', data: { device: { v1: 'tok' }, site: {} } });

      // Subsequent calls should resolve immediately
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('should call callback when implementation reports an error', () => {
      load({ params: { siteId: validSiteId } });

      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      expect(callbackSpy.notCalled).to.be.true;

      // An error still unblocks the auction
      onImplMessage({ type: 'error', data: 'some error' });
      expect(callbackSpy.calledOnce).to.be.true;
      // No device or site should be added since panxoData is empty
    });

    it('should add device.ext.panxo with session token when signal is received', () => {
      load({ params: { siteId: validSiteId } });

      onImplMessage({ type: 'signal', data: signalData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.have.own.property('device');
      expect(reqBidsConfig.ortb2Fragments.global.device).to.have.own.property('ext');
      expect(reqBidsConfig.ortb2Fragments.global.device.ext).to.have.own.property('panxo')
        .which.is.an('object')
        .that.deep.equals(signalData.device);
    });

    it('should add site.ext.data.panxo with AI classification data', () => {
      load({ params: { siteId: validSiteId } });

      onImplMessage({ type: 'signal', data: signalData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.have.own.property('site');
      expect(reqBidsConfig.ortb2Fragments.global.site).to.have.own.property('ext');
      expect(reqBidsConfig.ortb2Fragments.global.site.ext).to.have.own.property('data');
      expect(reqBidsConfig.ortb2Fragments.global.site.ext.data).to.have.own.property('panxo')
        .which.is.an('object')
        .that.deep.equals(signalData.site);
    });

    it('should update panxo data when new signal is received', () => {
      load({ params: { siteId: validSiteId } });

      const updatedData = {
        device: { v1: 'updated-token' },
        site: { ai: true, src: 'perplexity', conf: 0.88, seg: 'finance', co: 'UK' }
      };

      onImplMessage({ type: 'signal', data: { device: { v1: 'old-token' }, site: {} } });
      onImplMessage({ type: 'signal', data: updatedData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global.device.ext.panxo)
        .to.deep.equal(updatedData.device);
      expect(reqBidsConfig.ortb2Fragments.global.site.ext.data.panxo)
        .to.deep.equal(updatedData.site);
    });

    it('should not add site data when site object is empty', () => {
      load({ params: { siteId: validSiteId } });

      onImplMessage({ type: 'signal', data: { device: { v1: 'token' }, site: {} } });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global.device.ext.panxo)
        .to.deep.equal({ v1: 'token' });
      // site should not have panxo data since it was empty
      expect(reqBidsConfig.ortb2Fragments.global).to.not.have.own.property('site');
    });
  });

  describe('Submodule execution', function() {
    let sandbox2;
    let submoduleStub;
    beforeEach(function() {
      sandbox2 = sinon.createSandbox();
      submoduleStub = sandbox2.stub(hook, 'submodule');
    });
    afterEach(function () {
      sandbox2.restore();
    });

    function getModule() {
      main();

      expect(submoduleStub.calledOnceWith('realTimeData')).to.equal(true);

      const submoduleDef = submoduleStub.getCall(0).args[1];
      expect(submoduleDef).to.be.an('object');
      expect(submoduleDef).to.have.own.property('name', SUBMODULE_NAME);
      expect(submoduleDef).to.have.own.property('init').that.is.a('function');
      expect(submoduleDef).to.have.own.property('getBidRequestData').that.is.a('function');

      return submoduleDef;
    }

    it('should register panxo RTD submodule provider', function () {
      getModule();
    });

    it('should refuse initialization when siteId is missing', function () {
      const { init } = getModule();
      expect(init({ params: {} })).to.equal(false);
      expect(loadExternalScriptStub.notCalled).to.be.true;
    });

    it('should refuse initialization when siteId is invalid', function () {
      const { init } = getModule();
      expect(init({ params: { siteId: 'invalid' } })).to.equal(false);
      expect(loadExternalScriptStub.notCalled).to.be.true;
    });

    it('should commence initialization with valid siteId', function () {
      const { init } = getModule();
      expect(init({ params: { siteId: validSiteId } })).to.equal(true);
      expect(loadExternalScriptStub.calledOnce).to.be.true;
    });
  });
});
