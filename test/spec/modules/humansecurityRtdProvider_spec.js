import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

import * as utils from '../../../src/utils.js';
import * as hook from '../../../src/hook.js';
import * as refererDetection from '../../../src/refererDetection.js';

import { __TEST__ } from '../../../modules/humansecurityRtdProvider.js';

const {
  SUBMODULE_NAME,
  SCRIPT_URL,
  main,
  load
} = __TEST__;

describe('humansecurity RTD module', function () {
  let sandbox;

  const stubUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const sonarStubId = `sonar_${stubUuid}`;
  const stubWindow = { [sonarStubId]: undefined };

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'getWindowSelf').returns(stubWindow);
    sandbox.stub(utils, 'generateUUID').returns(stubUuid);
    sandbox.stub(refererDetection, 'getRefererInfo').returns({ domain: 'example.com' });
  });
  afterEach(function () {
    sandbox.restore();
  });

  describe('Initialization step', function () {
    let sandbox2;
    let connectSpy;
    beforeEach(function () {
      sandbox2 = sinon.createSandbox();
      connectSpy = sandbox.spy();
      // Once the impl script is loaded, it registers the API using session ID
      sandbox2.stub(stubWindow, sonarStubId).value({ connect: connectSpy });
    });
    afterEach(function () {
      sandbox2.restore();
    });

    it('should connect to the implementation script once it loads', function () {
      load({});

      expect(loadExternalScriptStub.calledOnce).to.be.true;
      const callback = loadExternalScriptStub.getCall(0).args[3];
      expect(callback).to.be.a('function');
      const args = connectSpy.getCall(0).args;
      expect(args[0]).to.haveOwnProperty('cmd'); // pbjs global
      expect(args[0]).to.haveOwnProperty('que');
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
      load({});

      expect(loadExternalScriptStub.calledOnce).to.be.true;

      const args = loadExternalScriptStub.getCall(0).args;
      expect(args[0]).to.include(`${SCRIPT_URL}?r=example.com`);
      const mvMatch = args[0].match(/[?&]mv=([^&]+)/);
      expect(mvMatch).to.not.equal(null);
      const mvValue = Number(mvMatch[1]);
      expect(Number.isFinite(mvValue)).to.equal(true);
      expect(mvValue).to.be.greaterThan(0);
      expect(args[2]).to.be.equal(SUBMODULE_NAME);
      expect(args[3]).to.be.a('function');
      expect(args[4]).to.be.equal(null);
      expect(args[5]).to.be.deep.equal({ 'data-sid': 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' });
    });

    it('should insert external script element with "customerId" info from config', () => {
      load({ params: { clientId: 'customer123' } });

      expect(loadExternalScriptStub.calledOnce).to.be.true;

      const args = loadExternalScriptStub.getCall(0).args;
      expect(args[0]).to.include(`${SCRIPT_URL}?r=example.com&c=customer123`);
    });
  });

  describe('Submodule execution', function () {
    let sandbox2;
    let submoduleStub;
    beforeEach(function () {
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
      expect(init({})).to.equal(true);
      expect(loadExternalScriptStub.calledOnce).to.be.true;
    });
  });
});
