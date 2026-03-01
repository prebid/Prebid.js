import paywallsAnalytics, {
  getVaiClassification,
  computeMetrics,
  emitMetrics,
  ensureVai,
  adapterConfig,
  resetForTesting,
  DEFAULT_SCRIPT_URL,
  VAI_WINDOW_KEY,
} from 'modules/paywallsAnalyticsAdapter.js';
import {expect} from 'chai';
import {expectEvents} from '../../helpers/analytics.js';
import {EVENTS} from 'src/constants.js';
import sinon from 'sinon';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

const adapterManager = require('src/adapterManager').default;
const events = require('src/events');

describe('PaywallsAnalyticsAdapter', function () {
  let sandbox;
  let clock;

  before(function () {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers(1896134400000);
  });

  after(function () {
    clock.restore();
    sandbox.restore();
  });

  // -----------------------------------------------------------------------
  // Registration & event tracking
  // -----------------------------------------------------------------------

  describe('registration', function () {
    beforeEach(function () {
      sandbox.stub(events, 'getEvents').returns([]);
      resetForTesting();
      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {output: 'callback', callback: function () {}}
      });
    });

    afterEach(function () {
      events.getEvents.restore();
      paywallsAnalytics.disableAnalytics();
      resetForTesting();
      delete window[VAI_WINDOW_KEY];
    });

    it('should register with the analytics adapter manager', function () {
      expect(paywallsAnalytics.enableAnalytics).to.be.a('function');
    });

    it('should catch all events', function () {
      sandbox.spy(paywallsAnalytics, 'track');
      expectEvents().to.beTrackedBy(paywallsAnalytics.track);
    });
  });

  // -----------------------------------------------------------------------
  // VAI loading
  // -----------------------------------------------------------------------

  describe('VAI loading', function () {
    afterEach(function () {
      delete window[VAI_WINDOW_KEY];
      resetForTesting();
    });

    it('should detect VAI when window.__PW_VAI__ is present', function () {
      window[VAI_WINDOW_KEY] = {vat: 'HUMAN', act: 'ACT-1'};
      const result = getVaiClassification();
      expect(result).to.deep.equal({vat: 'HUMAN', act: 'ACT-1'});
    });

    it('should return null when window.__PW_VAI__ is absent', function () {
      delete window[VAI_WINDOW_KEY];
      const result = getVaiClassification();
      expect(result).to.be.null;
    });

    it('should return null for invalid VAI (missing vat)', function () {
      window[VAI_WINDOW_KEY] = {act: 'ACT-1'};
      expect(getVaiClassification()).to.be.null;
    });

    it('should return null for invalid VAI (missing act)', function () {
      window[VAI_WINDOW_KEY] = {vat: 'HUMAN'};
      expect(getVaiClassification()).to.be.null;
    });

    it('should return null for expired VAI', function () {
      const nowSec = Math.floor(Date.now() / 1000);
      window[VAI_WINDOW_KEY] = {vat: 'HUMAN', act: 'ACT-1', exp: nowSec - 1};
      expect(getVaiClassification()).to.be.null;
    });

    it('should skip VAI injection when __PW_VAI__ is already present', function () {
      window[VAI_WINDOW_KEY] = {vat: 'HUMAN', act: 'ACT-1'};
      sandbox.stub(events, 'getEvents').returns([]);
      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {output: 'callback', callback: function () {}}
      });
      expect(window[VAI_WINDOW_KEY].vat).to.equal('HUMAN');
      events.getEvents.restore();
      paywallsAnalytics.disableAnalytics();
    });
  });

  // -----------------------------------------------------------------------
  // Metrics computation
  // -----------------------------------------------------------------------

  describe('computeMetrics', function () {
    afterEach(function () {
      delete window[VAI_WINDOW_KEY];
    });

    it('should return vat and act when VAI is present', function () {
      window[VAI_WINDOW_KEY] = {vat: 'HUMAN', act: 'ACT-1'};
      const result = computeMetrics();
      expect(result).to.deep.equal({vai_vat: 'HUMAN', vai_act: 'ACT-1'});
    });

    it('should return UNKNOWN when VAI is absent', function () {
      delete window[VAI_WINDOW_KEY];
      const result = computeMetrics();
      expect(result).to.deep.equal({vai_vat: 'UNKNOWN', vai_act: 'UNKNOWN'});
    });

    it('should return UNKNOWN when VAI is expired', function () {
      const nowSec = Math.floor(Date.now() / 1000);
      window[VAI_WINDOW_KEY] = {vat: 'HUMAN', act: 'ACT-1', exp: nowSec - 1};
      const result = computeMetrics();
      expect(result).to.deep.equal({vai_vat: 'UNKNOWN', vai_act: 'UNKNOWN'});
    });

    it('should only contain vai_vat and vai_act keys', function () {
      window[VAI_WINDOW_KEY] = {vat: 'AI_AGENT', act: 'ACT-2'};
      const result = computeMetrics();
      expect(Object.keys(result)).to.have.lengthOf(2);
      expect(result).to.have.all.keys('vai_vat', 'vai_act');
    });
  });

  // -----------------------------------------------------------------------
  // Output modes
  // -----------------------------------------------------------------------

  describe('output modes', function () {
    afterEach(function () {
      delete window[VAI_WINDOW_KEY];
      resetForTesting();
    });

    describe('gtag', function () {
      it('should call gtag with event and KVPs', function () {
        const gtagStub = sandbox.stub();
        window.gtag = gtagStub;

        const kvps = {vai_vat: 'HUMAN', vai_act: 'ACT-1'};
        adapterConfig.output = 'gtag';
        emitMetrics(kvps);

        expect(gtagStub.calledOnce).to.be.true;
        expect(gtagStub.firstCall.args[0]).to.equal('event');
        expect(gtagStub.firstCall.args[1]).to.equal('vai_auction');
        expect(gtagStub.firstCall.args[2]).to.deep.include({vai_vat: 'HUMAN'});

        delete window.gtag;
      });

      it('should warn when gtag is not present', function () {
        delete window.gtag;
        adapterConfig.output = 'gtag';
        emitMetrics({vai_vat: 'HUMAN', vai_act: 'ACT-1'});
      });
    });

    describe('dataLayer', function () {
      it('should push to dataLayer with event name and KVPs', function () {
        window.dataLayer = [];
        adapterConfig.output = 'dataLayer';

        const kvps = {vai_vat: 'HUMAN', vai_act: 'ACT-1'};
        emitMetrics(kvps);

        expect(window.dataLayer.length).to.equal(1);
        expect(window.dataLayer[0].event).to.equal('vai_auction');
        expect(window.dataLayer[0].vai_vat).to.equal('HUMAN');
        expect(window.dataLayer[0].vai_act).to.equal('ACT-1');

        delete window.dataLayer;
      });

      it('should create dataLayer if not present', function () {
        delete window.dataLayer;
        adapterConfig.output = 'dataLayer';

        emitMetrics({vai_vat: 'HUMAN', vai_act: 'ACT-1'});

        expect(window.dataLayer).to.be.an('array');
        expect(window.dataLayer.length).to.equal(1);

        delete window.dataLayer;
      });
    });

    describe('callback', function () {
      it('should call the provided callback with KVPs', function () {
        const cb = sandbox.stub();
        adapterConfig.output = 'callback';
        adapterConfig.callback = cb;

        const kvps = {vai_vat: 'HUMAN', vai_act: 'ACT-1'};
        emitMetrics(kvps);

        expect(cb.calledOnce).to.be.true;
        expect(cb.firstCall.args[0]).to.deep.equal(kvps);
      });

      it('should handle callback errors gracefully', function () {
        adapterConfig.output = 'callback';
        adapterConfig.callback = function () { throw new Error('test error'); };
        emitMetrics({vai_vat: 'HUMAN', vai_act: 'ACT-1'});
      });

      it('should warn when callback is not a function', function () {
        adapterConfig.output = 'callback';
        adapterConfig.callback = null;
        emitMetrics({vai_vat: 'HUMAN', vai_act: 'ACT-1'});
      });
    });
  });

  // -----------------------------------------------------------------------
  // End-to-end event flow
  // -----------------------------------------------------------------------

  describe('event correlation', function () {
    let callbackSpy;

    beforeEach(function () {
      callbackSpy = sandbox.stub();
      sandbox.stub(events, 'getEvents').returns([]);
      resetForTesting();
      window[VAI_WINDOW_KEY] = {vat: 'HUMAN', act: 'ACT-1'};

      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {
          output: 'callback',
          callback: callbackSpy,
          scriptUrl: '/fake/vai.js',
        }
      });
    });

    afterEach(function () {
      events.getEvents.restore();
      paywallsAnalytics.disableAnalytics();
      resetForTesting();
      delete window[VAI_WINDOW_KEY];
    });

    it('should emit vat and act on auctionEnd', function () {
      events.emit(EVENTS.AUCTION_END, {auctionId: 'test-001'});
      clock.tick(200);

      expect(callbackSpy.calledOnce).to.be.true;
      const kvps = callbackSpy.firstCall.args[0];
      expect(kvps.vai_vat).to.equal('HUMAN');
      expect(kvps.vai_act).to.equal('ACT-1');
      expect(Object.keys(kvps)).to.have.lengthOf(2);
    });

    it('should emit once per auction (de-dup)', function () {
      events.emit(EVENTS.AUCTION_END, {auctionId: 'test-dedup'});
      clock.tick(200);
      events.emit(EVENTS.AUCTION_END, {auctionId: 'test-dedup'});
      clock.tick(200);

      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('should emit separately for different auctions', function () {
      events.emit(EVENTS.AUCTION_END, {auctionId: 'auction-A'});
      clock.tick(200);
      events.emit(EVENTS.AUCTION_END, {auctionId: 'auction-B'});
      clock.tick(200);

      expect(callbackSpy.calledTwice).to.be.true;
      expect(callbackSpy.firstCall.args[0].vai_vat).to.equal('HUMAN');
      expect(callbackSpy.secondCall.args[0].vai_vat).to.equal('HUMAN');
    });

    it('should ignore events without auctionId', function () {
      events.emit(EVENTS.AUCTION_END, {});
      clock.tick(200);

      expect(callbackSpy.called).to.be.false;
    });

    it('should ignore non-AUCTION_END events', function () {
      events.emit(EVENTS.BID_RESPONSE, {auctionId: 'test-001', cpm: 2.50});
      events.emit(EVENTS.BID_WON, {auctionId: 'test-001'});
      events.emit(EVENTS.NO_BID, {auctionId: 'test-001'});
      clock.tick(200);

      expect(callbackSpy.called).to.be.false;
    });
  });

  // -----------------------------------------------------------------------
  // Sampling
  // -----------------------------------------------------------------------

  describe('sampling', function () {
    afterEach(function () {
      delete window[VAI_WINDOW_KEY];
      resetForTesting();
    });

    it('should skip emission when sampled out', function () {
      const cb = sandbox.stub();
      sandbox.stub(events, 'getEvents').returns([]);
      window[VAI_WINDOW_KEY] = {vat: 'HUMAN', act: 'ACT-1'};

      sandbox.stub(Math, 'random').returns(0.5);
      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {
          output: 'callback',
          callback: cb,
          samplingRate: 0.1
        }
      });

      events.emit(EVENTS.AUCTION_END, {auctionId: 'sampled-out'});
      clock.tick(200);

      expect(cb.called).to.be.false;

      Math.random.restore();
      events.getEvents.restore();
      paywallsAnalytics.disableAnalytics();
    });

    it('should not load vai.js when sampled out', function () {
      const cb = sandbox.stub();
      sandbox.stub(events, 'getEvents').returns([]);
      delete window[VAI_WINDOW_KEY];
      loadExternalScriptStub.resetHistory();

      sandbox.stub(Math, 'random').returns(0.9);
      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {
          output: 'callback',
          callback: cb,
          samplingRate: 0.1,
          scriptUrl: '/pw/vai.js'
        }
      });

      expect(loadExternalScriptStub.called).to.be.false;

      Math.random.restore();
      events.getEvents.restore();
      paywallsAnalytics.disableAnalytics();
    });

    it('should emit when sampled in', function () {
      const cb = sandbox.stub();
      sandbox.stub(events, 'getEvents').returns([]);
      window[VAI_WINDOW_KEY] = {vat: 'HUMAN', act: 'ACT-1'};

      sandbox.stub(Math, 'random').returns(0.01);
      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {
          output: 'callback',
          callback: cb,
          samplingRate: 0.5
        }
      });

      events.emit(EVENTS.AUCTION_END, {auctionId: 'sampled-in'});
      clock.tick(200);

      expect(cb.calledOnce).to.be.true;

      Math.random.restore();
      events.getEvents.restore();
      paywallsAnalytics.disableAnalytics();
    });
  });

  // -----------------------------------------------------------------------
  // Bug reproductions (from bot review feedback)
  // -----------------------------------------------------------------------

  describe('bug reproductions', function () {
    afterEach(function () {
      delete window[VAI_WINDOW_KEY];
      resetForTesting();
    });

    it('ensureVai should inject script when __PW_VAI__ is truthy but invalid', function () {
      // Bug: ensureVai() checks `if (window[VAI_WINDOW_KEY])` which is truthy
      // for objects missing vat/act, preventing injection
      window[VAI_WINDOW_KEY] = { invalid: true };
      resetForTesting();
      loadExternalScriptStub.resetHistory();

      // Call ensureVai directly — it should detect the invalid payload and inject
      ensureVai('/pw/vai.js');

      // Proves the object is invalid for classification
      const classification = getVaiClassification();
      expect(classification).to.be.null;

      // With the bug, loadExternalScript would NOT be called because
      // ensureVai saw a truthy window.__PW_VAI__ and returned early.
      // After fix, it should call loadExternalScript.
      expect(loadExternalScriptStub.called).to.be.true;
    });
  });

  // -----------------------------------------------------------------------
  // Graceful degradation
  // -----------------------------------------------------------------------

  describe('graceful degradation', function () {
    it('should emit UNKNOWN when VAI is unavailable', function () {
      const cb = sandbox.stub();
      sandbox.stub(events, 'getEvents').returns([]);
      resetForTesting();
      delete window[VAI_WINDOW_KEY];

      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {
          output: 'callback',
          callback: cb,
          scriptUrl: '/nonexistent-vai.js'
        }
      });

      events.emit(EVENTS.AUCTION_END, {auctionId: 'degraded'});
      clock.tick(200);

      expect(cb.calledOnce).to.be.true;
      const kvps = cb.firstCall.args[0];
      expect(kvps.vai_vat).to.equal('UNKNOWN');
      expect(kvps.vai_act).to.equal('UNKNOWN');

      events.getEvents.restore();
      paywallsAnalytics.disableAnalytics();
    });
  });

  // -----------------------------------------------------------------------
  // Config parsing
  // -----------------------------------------------------------------------

  describe('configuration', function () {
    beforeEach(function () {
      sandbox.stub(events, 'getEvents').returns([]);
      resetForTesting();
    });

    afterEach(function () {
      events.getEvents.restore();
      paywallsAnalytics.disableAnalytics();
      resetForTesting();
      delete window[VAI_WINDOW_KEY];
    });

    it('should use default scriptUrl when not provided', function () {
      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {output: 'callback', callback: function () {}}
      });
      expect(adapterConfig.scriptUrl).to.equal(DEFAULT_SCRIPT_URL);
    });

    it('should use custom scriptUrl when provided', function () {
      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {
          output: 'callback',
          callback: function () {},
          scriptUrl: 'https://cdn.example.com/vai.js'
        }
      });
      expect(adapterConfig.scriptUrl).to.equal('https://cdn.example.com/vai.js');
    });

    it('should default samplingRate to 1.0', function () {
      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {output: 'callback', callback: function () {}}
      });
      expect(adapterConfig.samplingRate).to.equal(1.0);
    });

    it('should default output to callback', function () {
      adapterManager.enableAnalytics({
        provider: 'paywalls',
        options: {callback: function () {}}
      });
      expect(adapterConfig.output).to.equal('callback');
    });
  });
});
