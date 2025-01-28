import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

import * as utils from '../../../src/utils.js';
import * as hook from '../../../src/hook.js';
import * as refererDetection from '../../../src/refererDetection.js';

import { __TEST__ } from '../../../modules/humansecurityRtdProvider.js';

const {
  SUBMODULE_NAME,
  SCRIPT_URL,
  main,
  load,
  onImplLoaded,
  onImplMessage,
  onGetBidRequestData
} = __TEST__;

describe('humansecurity RTD module', function () {
  let sandbox;

  const stubUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const sonarStubId = `sonar_${stubUuid}`;
  const stubWindow = { [sonarStubId]: undefined };

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
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
      sandbox2 = sinon.sandbox.create();
      connectSpy = sandbox.spy();
      // Once the impl script is loaded, it registers the API using session ID
      sandbox2.stub(stubWindow, sonarStubId).value({ connect: connectSpy });
    });
    afterEach(function () {
      sandbox2.restore();
    });

    it('should accept valid configurations', function () {
      // Default configuration - empty
      expect(() => load({})).to.not.throw();
      expect(() => load({ params: {} })).to.not.throw();
      // Configuration with clientId
      expect(() => load({ params: { clientId: 'customer123' } })).to.not.throw();
    });

    it('should throw an Error on invalid configuration', function () {
      expect(() => load({ params: { clientId: 123 } })).to.throw();
      expect(() => load({ params: { clientId: 'abc.def' } })).to.throw();
      expect(() => load({ params: { clientId: '1' } })).to.throw();
      expect(() => load({ params: { clientId: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' } })).to.throw();
    });

    it('should insert implementation script', () => {
      load({ });

      expect(loadExternalScriptStub.calledOnce).to.be.true;

      const args = loadExternalScriptStub.getCall(0).args;
      expect(args[0]).to.be.equal(`${SCRIPT_URL}?r=example.com`);
      expect(args[1]).to.be.equal(SUBMODULE_NAME);
      expect(args[2]).to.be.equal(onImplLoaded);
      expect(args[3]).to.be.equal(null);
      expect(args[4]).to.be.deep.equal({ 'data-sid': 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' });
    });

    it('should insert external script element with "customerId" info from config', () => {
      load({ params: { clientId: 'customer123' } });

      expect(loadExternalScriptStub.calledOnce).to.be.true;

      const args = loadExternalScriptStub.getCall(0).args;
      expect(args[0]).to.be.equal(`${SCRIPT_URL}?r=example.com&c=customer123`);
    });

    it('should connect to the implementation script once it loads', function () {
      load({ });

      expect(loadExternalScriptStub.calledOnce).to.be.true;
      expect(connectSpy.calledOnce).to.be.true;

      const args = connectSpy.getCall(0).args;
      expect(args[0]).to.haveOwnProperty('cmd'); // pbjs global
      expect(args[0]).to.haveOwnProperty('que');
      expect(args[1]).to.be.equal(onImplMessage);
    });
  });

  describe('Bid enrichment step', function () {
    const hmnsData = { 'v1': 'sometoken' };

    let sandbox2;
    let callbackSpy;
    let reqBidsConfig;
    beforeEach(function() {
      sandbox2 = sinon.sandbox.create();
      callbackSpy = sandbox2.spy();
      reqBidsConfig = { ortb2Fragments: { bidder: {}, global: {} } };
    });
    afterEach(function () {
      sandbox2.restore();
    });

    it('should add empty device.ext.hmns to global ortb2 when data is yet to be received from the impl script', () => {
      load({ });

      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.have.own.property('device');
      expect(reqBidsConfig.ortb2Fragments.global.device).to.have.own.property('ext');
      expect(reqBidsConfig.ortb2Fragments.global.device.ext).to.have.own.property('hmns').which.is.an('object').that.deep.equals({});
    });

    it('should add the default device.ext.hmns to global ortb2 when no "hmns" data was yet received', () => {
      load({ });

      onImplMessage({ type: 'info', data: 'not a hmns message' });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.have.own.property('device');
      expect(reqBidsConfig.ortb2Fragments.global.device).to.have.own.property('ext');
      expect(reqBidsConfig.ortb2Fragments.global.device.ext).to.have.own.property('hmns').which.is.an('object').that.deep.equals({});
    });

    it('should add device.ext.hmns with received tokens to global ortb2 when the data was received', () => {
      load({ });

      onImplMessage({ type: 'hmns', data: hmnsData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.have.own.property('device');
      expect(reqBidsConfig.ortb2Fragments.global.device).to.have.own.property('ext');
      expect(reqBidsConfig.ortb2Fragments.global.device.ext).to.have.own.property('hmns').which.is.an('object').that.deep.equals(hmnsData);
    });

    it('should update device.ext.hmns with new data', () => {
      load({ });

      onImplMessage({ type: 'hmns', data: { 'v1': 'should be overwritten' } });
      onImplMessage({ type: 'hmns', data: hmnsData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.have.own.property('device');
      expect(reqBidsConfig.ortb2Fragments.global.device).to.have.own.property('ext');
      expect(reqBidsConfig.ortb2Fragments.global.device.ext).to.have.own.property('hmns').which.is.an('object').that.deep.equals(hmnsData);
    });
  });

  describe('Sumbodule execution', function() {
    let sandbox2;
    let submoduleStub;
    beforeEach(function() {
      sandbox2 = sinon.sandbox.create();
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

    it('should register humansecurity RTD submodule provider', function () {
      getModule();
    });

    it('should refuse initialization on invalid customer id configuration', function () {
      const { init } = getModule();
      expect(init({ params: { clientId: 123 } })).to.equal(false);
      expect(loadExternalScriptStub.notCalled).to.be.true;
    });

    it('should commence initialization on valid initialization', function () {
      const { init } = getModule();
      expect(init({ params: { clientId: 'customer123' } })).to.equal(true);
      expect(loadExternalScriptStub.calledOnce).to.be.true;
    });

    it('should commence initialization on default initialization', function () {
      const { init } = getModule();
      expect(init({ })).to.equal(true);
      expect(loadExternalScriptStub.calledOnce).to.be.true;
    });
  });
});
