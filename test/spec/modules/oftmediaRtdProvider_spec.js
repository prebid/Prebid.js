import {
  config
} from 'src/config.js';
import * as oftmediaRtd from 'modules/oftmediaRtdProvider.js';
import {
  loadExternalScriptStub
} from 'test/mocks/adloaderStub.js';
import * as userAgentUtils from '../../../libraries/userAgentUtils/index.js';

const RTD_CONFIG = {
  dataProviders: [{
    name: 'oftmedia',
    waitForIt: true,
    params: {
      publisherId: '0653b3fc-a645-4bcc-bfee-b8982974dd53',
      keywords: ['red', 'blue', 'white'],
      bidderCode: 'appnexus',
      enrichRequest: true
    },
  }, ],
};

const TIMEOUT = 10;

describe('oftmedia RTD Submodule', function() {
  let sandbox;
  let loadExternalScriptTag;
  let localStorageIsEnabledStub;
  let clock;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers();
    config.resetConfig();

    loadExternalScriptTag = document.createElement('script');

    loadExternalScriptStub.callsFake((_url, _moduleName, _type, callback) => {
      if (typeof callback === 'function') {
        setTimeout(callback, 10);
      }

      setTimeout(() => {
        if (loadExternalScriptTag.onload) {
          loadExternalScriptTag.onload();
        }
        loadExternalScriptTag.dispatchEvent(new Event('load'));
      }, 10);

      return loadExternalScriptTag;
    });

    localStorageIsEnabledStub = sandbox.stub(oftmediaRtd.storageManager, 'localStorageIsEnabled');
    localStorageIsEnabledStub.callsFake((cback) => cback(true));

    sandbox.stub(userAgentUtils, 'getDeviceType').returns(1);
    sandbox.stub(userAgentUtils, 'getOS').returns(1);
    sandbox.stub(userAgentUtils, 'getBrowser').returns(2);

    if (oftmediaRtd.__testing__.moduleState && typeof oftmediaRtd.__testing__.moduleState.reset === 'function') {
      oftmediaRtd.__testing__.moduleState.reset();
    }
  });

  afterEach(function() {
    sandbox.restore();
    clock.restore();
  });

  describe('Module initialization', function() {
    it('should initialize and return true when publisherId is provided', function() {
      const result = oftmediaRtd.oftmediaRtdSubmodule.init(RTD_CONFIG.dataProviders[0]);
      expect(result).to.equal(true);
    });

    it('should return false when publisherId is not provided', function() {
      const invalidConfig = {
        params: {
          bidderCode: 'appnexus',
          enrichRequest: true
        }
      };
      const result = oftmediaRtd.oftmediaRtdSubmodule.init(invalidConfig);
      expect(result).to.equal(false);
    });

    it('should return false when publisherId is not a string', function() {
      const invalidConfig = {
        params: {
          publisherId: 12345,
          bidderCode: 'appnexus',
          enrichRequest: true
        }
      };
      const result = oftmediaRtd.oftmediaRtdSubmodule.init(invalidConfig);
      expect(result).to.equal(false);
    });

    it('should set initTimestamp when initialized', function() {
      const result = oftmediaRtd.oftmediaRtdSubmodule.init(RTD_CONFIG.dataProviders[0]);
      expect(result).to.equal(true);
      expect(oftmediaRtd.__testing__.moduleState.initTimestamp).to.be.a('number');
    });
  });

  describe('ModuleState class functionality', function() {
    it('should mark module as ready and execute callbacks', function() {
      const moduleState = oftmediaRtd.__testing__.moduleState;
      const callbackSpy = sinon.spy();

      moduleState.onReady(callbackSpy);
      expect(callbackSpy.called).to.be.false;

      moduleState.markReady();
      expect(callbackSpy.calledOnce).to.be.true;

      const secondCallbackSpy = sinon.spy();
      moduleState.onReady(secondCallbackSpy);
      expect(secondCallbackSpy.calledOnce).to.be.true;
    });

    it('should reset module state properly', function() {
      const moduleState = oftmediaRtd.__testing__.moduleState;

      moduleState.initTimestamp = 123;
      moduleState.scriptLoadPromise = Promise.resolve();
      moduleState.isReady = true;

      moduleState.reset();

      expect(moduleState.initTimestamp).to.be.null;
      expect(moduleState.scriptLoadPromise).to.be.null;
      expect(moduleState.isReady).to.be.false;
      expect(moduleState.readyCallbacks).to.be.an('array').that.is.empty;
    });
  });

  describe('Helper functions', function() {
    it('should create a timeout promise that resolves after specified time', function(done) {
      let promiseResolved = false;

      oftmediaRtd.oftmediaRtdSubmodule.init(RTD_CONFIG.dataProviders[0]);

      const testPromise = new Promise(resolve => {
        setTimeout(() => {
          promiseResolved = true;
          resolve('test-result');
        }, 100);
      });

      const racePromise = oftmediaRtd.__testing__.raceWithTimeout(testPromise, 50);

      racePromise.then(result => {
        expect(promiseResolved).to.be.false;
        expect(result).to.be.undefined;
        done();
      }).catch(done);

      clock.tick(60);
    });

    it('should create a timeout promise that resolves with undefined after specified time', function(done) {
      const neverResolvingPromise = new Promise(() => {});

      const raceWithTimeout = oftmediaRtd.__testing__.raceWithTimeout;
      const result = raceWithTimeout(neverResolvingPromise, 200);

      let resolved = false;

      result.then(value => {
        resolved = true;
        expect(value).to.be.undefined;
        done();
      }).catch(done);

      expect(resolved).to.be.false;
      clock.tick(100);
      expect(resolved).to.be.false;

      clock.tick(150);
    });

    it('should return promise result when promise resolves before timeout', function(done) {
      const raceWithTimeout = oftmediaRtd.__testing__.raceWithTimeout;
      const fastPromise = Promise.resolve('success-result');

      const result = raceWithTimeout(fastPromise, 100);

      result.then(value => {
        expect(value).to.equal('success-result');
        done();
      }).catch(done);

      clock.tick(10);
    });

    it('should handle rejecting promises correctly', function(done) {
      const raceWithTimeout = oftmediaRtd.__testing__.raceWithTimeout;
      const rejectingPromise = Promise.reject(new Error('expected rejection'));

      const result = raceWithTimeout(rejectingPromise, 100);

      result.then(() => {
        done(new Error('Promise should have been rejected'));
      }).catch(error => {
        expect(error.message).to.equal('expected rejection');
        done();
      });

      clock.tick(10);
    });

    it('should calculate remaining time correctly', function() {
      const calculateRemainingTime = oftmediaRtd.__testing__.calculateRemainingTime;

      const startTime = Date.now() - 300;
      const maxDelay = 1000;

      const result = calculateRemainingTime(startTime, maxDelay);

      expect(result).to.be.closeTo(400, 10);

      const lateStartTime = Date.now() - 800;
      const lateResult = calculateRemainingTime(lateStartTime, maxDelay);
      expect(lateResult).to.equal(0);
    });

    it('should convert device types for specific bidders', function() {
      const convertDeviceTypeForBidder = oftmediaRtd.__testing__.convertDeviceTypeForBidder;

      expect(convertDeviceTypeForBidder(0, 'oftmedia')).to.equal(2);
      expect(convertDeviceTypeForBidder(1, 'oftmedia')).to.equal(4);
      expect(convertDeviceTypeForBidder(2, 'oftmedia')).to.equal(5);
      expect(convertDeviceTypeForBidder(1, 'appnexus')).to.equal(4);
      expect(convertDeviceTypeForBidder(1, 'pubmatic')).to.equal(1);
      expect(convertDeviceTypeForBidder(99, 'oftmedia')).to.equal(99);
      expect(convertDeviceTypeForBidder("1", 'oftmedia')).to.equal(4);
    });
  });

  describe('Script loading functionality', function() {
    it('should load script successfully with valid publisher ID', function(done) {
      localStorageIsEnabledStub.callsFake(cback => cback(true));

      const loadOftmediaScript = oftmediaRtd.__testing__.loadOftmediaScript;

      const scriptPromise = loadOftmediaScript(RTD_CONFIG.dataProviders[0]);

      scriptPromise.then(result => {
        expect(result).to.be.true;
        done();
      }).catch(done);

      clock.tick(20);
    });

    it('should reject when localStorage is not available', function(done) {
      localStorageIsEnabledStub.callsFake(cback => cback(false));

      const loadOftmediaScript = oftmediaRtd.__testing__.loadOftmediaScript;

      const scriptPromise = loadOftmediaScript(RTD_CONFIG.dataProviders[0]);

      scriptPromise.then(() => {
        done(new Error('Promise should be rejected when localStorage is not available'));
      }).catch(error => {
        expect(error.message).to.include('localStorage is not available');
        done();
      });

      clock.tick(20);
    });

    it('should reject when publisher ID is missing', function(done) {
      const loadOftmediaScript = oftmediaRtd.__testing__.loadOftmediaScript;

      const scriptPromise = loadOftmediaScript({
        params: {}
      });

      scriptPromise.then(() => {
        done(new Error('Promise should be rejected when publisher ID is missing'));
      }).catch(error => {
        expect(error.message).to.include('Publisher ID is required');
        done();
      });

      clock.tick(20);
    });
  });

  describe('ORTB2 data building', function() {
    it('should build valid ORTB2 data object with device and keywords', function() {
      const buildOrtb2Data = oftmediaRtd.__testing__.buildOrtb2Data;

      const result = buildOrtb2Data(RTD_CONFIG.dataProviders[0]);

      expect(result).to.be.an('object');
      expect(result.bidderCode).to.equal('appnexus');
      expect(result.ortb2Data).to.be.an('object');
      expect(result.ortb2Data.device.devicetype).to.equal(4);
      expect(result.ortb2Data.device.os).to.equal('1');
      expect(result.ortb2Data.site.keywords).to.include('red');
      expect(result.ortb2Data.site.keywords).to.include('blue');
      expect(result.ortb2Data.site.keywords).to.include('white');
      expect(result.ortb2Data.site.keywords).to.include('deviceBrowser=2');
    });

    it('should return null when enrichRequest is false', function() {
      const buildOrtb2Data = oftmediaRtd.__testing__.buildOrtb2Data;

      const result = buildOrtb2Data({
        params: {
          publisherId: '0653b3fc-a645-4bcc-bfee-b8982974dd53',
          bidderCode: 'appnexus',
          enrichRequest: false
        }
      });

      expect(result).to.be.null;
    });

    it('should return null when bidderCode is missing', function() {
      const buildOrtb2Data = oftmediaRtd.__testing__.buildOrtb2Data;

      const result = buildOrtb2Data({
        params: {
          publisherId: '0653b3fc-a645-4bcc-bfee-b8982974dd53',
          enrichRequest: true
        }
      });

      expect(result).to.be.null;
    });
  });

  describe('Bid request processing', function() {
    it('should process bid request and enrich it with ORTB2 data', function(done) {
      oftmediaRtd.oftmediaRtdSubmodule.init(RTD_CONFIG.dataProviders[0]);

      oftmediaRtd.__testing__.moduleState.markReady();

      const bidConfig = {
        ortb2Fragments: {
          bidder: {
            appnexus: {}
          }
        }
      };

      oftmediaRtd.oftmediaRtdSubmodule.getBidRequestData(bidConfig, () => {
        expect(bidConfig.ortb2Fragments.bidder.appnexus.device).to.be.an('object');
        expect(bidConfig.ortb2Fragments.bidder.appnexus.device.devicetype).to.equal(4);
        expect(bidConfig.ortb2Fragments.bidder.appnexus.device.os).to.equal('1');
        expect(bidConfig.ortb2Fragments.bidder.appnexus.site.keywords).to.include('deviceBrowser=2');
        done();
      }, RTD_CONFIG.dataProviders[0]);
    });

    it('should handle invalid bid request structure', function(done) {
      oftmediaRtd.oftmediaRtdSubmodule.init(RTD_CONFIG.dataProviders[0]);
      oftmediaRtd.__testing__.moduleState.markReady();
      const invalidBidConfig = {};

      oftmediaRtd.oftmediaRtdSubmodule.getBidRequestData(invalidBidConfig, () => {
        expect(invalidBidConfig.ortb2Fragments).to.be.undefined;
        done();
      }, RTD_CONFIG.dataProviders[0]);
    });
  });

  describe('Bid request enrichment', function() {
    it('should enrich bid request with keywords, OS and device when enrichRequest is true', function(done) {
      const bidConfig = {
        ortb2Fragments: {
          bidder: {
            appnexus: {}
          }
        }
      };

      const initResult = oftmediaRtd.oftmediaRtdSubmodule.init(RTD_CONFIG.dataProviders[0]);
      expect(initResult).to.equal(true);

      oftmediaRtd.__testing__.moduleState.markReady();

      oftmediaRtd.oftmediaRtdSubmodule.getBidRequestData(bidConfig, function(error) {
        if (error) return done(error);

        try {
          expect(bidConfig.ortb2Fragments.bidder.appnexus).to.have.nested.property('site.keywords');
          expect(bidConfig.ortb2Fragments.bidder.appnexus.device).to.be.an('object');
          expect(bidConfig.ortb2Fragments.bidder.appnexus.device.devicetype).to.equal(4);
          expect(bidConfig.ortb2Fragments.bidder.appnexus.device.os).to.equal('1');
          done();
        } catch (e) {
          done(e);
        }
      }, RTD_CONFIG.dataProviders[0]);
    });

    it('should not enrich bid request when enrichRequest is false', function(done) {
      const configWithEnrichFalse = {
        params: {
          publisherId: '0653b3fc-a645-4bcc-bfee-b8982974dd53',
          keywords: ['red', 'blue', 'white'],
          bidderCode: 'appnexus',
          enrichRequest: false
        }
      };

      const bidConfig = {
        ortb2Fragments: {
          bidder: {
            appnexus: {}
          }
        }
      };

      const initResult = oftmediaRtd.oftmediaRtdSubmodule.init(configWithEnrichFalse);
      expect(initResult).to.equal(true);

      oftmediaRtd.__testing__.moduleState.markReady();

      oftmediaRtd.oftmediaRtdSubmodule.getBidRequestData(bidConfig, function(error) {
        if (error) return done(error);

        try {
          expect(bidConfig.ortb2Fragments.bidder.appnexus).to.deep.equal({});
          done();
        } catch (e) {
          done(e);
        }
      }, configWithEnrichFalse);
    });
  });
});
