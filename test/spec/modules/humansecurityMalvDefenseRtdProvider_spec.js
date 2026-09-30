import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import * as utils from '../../../src/utils.js';
import * as adloader from '../../../src/adloader.js';
import * as hook from '../../../src/hook.js';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';

import { __TEST__ } from '../../../modules/humansecurityMalvDefenseRtdProvider.js';
import { MODULE_TYPE_RTD } from '../../../src/activities/modules.js';

const {
  readConfig,
  ConfigError,
  pageInitStepPreloadScript,
  pageInitStepProtectPage,
  bidWrapStepAugmentHtml,
  bidWrapStepProtectByWrapping,
  beforeInit
} = __TEST__;

sinon.assert.expose(chai.assert, { prefix: 'sinon' });

const fakeScriptURL = 'https://example.com/script.js';

function makeFakeBidResponse() {
  return {
    ad: '<body>hello ad</body>',
    bidderCode: 'BIDDER',
    creativeId: 'CREATIVE',
    cpm: 1.23,
  };
}

describe('humansecurityMalvDefense RTD module', function () {
  describe('readConfig()', function() {
    it('should throw ConfigError on invalid configurations', function() {
      expect(() => readConfig({})).to.throw(ConfigError);
      expect(() => readConfig({ params: {} })).to.throw(ConfigError);
      expect(() => readConfig({ params: { protectionMode: 'bids' } })).to.throw(ConfigError);
      expect(() => readConfig({ params: { cdnUrl: 'abc' } })).to.throw(ConfigError);
      expect(() => readConfig({ params: { cdnUrl: 'abc', protectionMode: 'bids' } })).to.throw(ConfigError);
      expect(() => readConfig({ params: { cdnUrl: 'https://cadmus.script.ac/abc1234567890/script.js', protectionMode: '123' } })).to.throw(ConfigError);
    });

    it('should accept valid configurations', function() {
      expect(() => readConfig({ params: { cdnUrl: 'https://cadmus.script.ac/abc1234567890/script.js', protectionMode: 'full' } })).to.not.throw();
      expect(() => readConfig({ params: { cdnUrl: 'https://cadmus.script.ac/abc1234567890/script.js', protectionMode: 'bids' } })).to.not.throw();
      expect(() => readConfig({ params: { cdnUrl: 'https://cadmus.script.ac/abc1234567890/script.js', protectionMode: 'bids-nowait' } })).to.not.throw();
    });
  });

  describe('Module initialization step', function() {
    let insertElementStub;
    beforeEach(function() {
      insertElementStub = sinon.stub(utils, 'insertElement');
    });
    afterEach(function() {
      utils.insertElement.restore();
    });

    it('pageInitStepPreloadScript() should insert link/preload element', function() {
      pageInitStepPreloadScript(fakeScriptURL);

      sinon.assert.calledOnce(insertElementStub);
      sinon.assert.calledWith(insertElementStub, sinon.match(elem => elem.tagName === 'LINK'));
      sinon.assert.calledWith(insertElementStub, sinon.match(elem => elem.rel === 'preload'));
      sinon.assert.calledWith(insertElementStub, sinon.match(elem => elem.as === 'script'));
      sinon.assert.calledWith(insertElementStub, sinon.match(elem => elem.href === fakeScriptURL));
    });

    it('pageInitStepProtectPage() should insert script element', function() {
      pageInitStepProtectPage(fakeScriptURL, 'humansecurityMalvDefense');

      sinon.assert.calledOnce(loadExternalScriptStub);
      sinon.assert.calledWith(loadExternalScriptStub, fakeScriptURL, MODULE_TYPE_RTD, 'humansecurityMalvDefense');
    });
  });

  function ensurePrependToBidResponse(fakeBidResponse) {
    expect(fakeBidResponse).to.have.own.property('ad').which.is.a('string');
    expect(fakeBidResponse.ad).to.contain('<!-- pbad://creativeId=CREATIVE&bidderCode=BIDDER&cpm=1.23 -->');
  }

  function ensureWrapBidResponse(fakeBidResponse, scriptUrl) {
    expect(fakeBidResponse).to.have.own.property('ad').which.is.a('string');
    expect(fakeBidResponse.ad).to.contain(`src="${scriptUrl}"`);
    expect(fakeBidResponse.ad).to.contain('agent.put(ad)');
  }

  describe('Bid processing step', function() {
    it('bidWrapStepAugmentHtml() should prepend bid-specific information in a comment', function() {
      const fakeBidResponse = makeFakeBidResponse();
      bidWrapStepAugmentHtml(fakeBidResponse);
      ensurePrependToBidResponse(fakeBidResponse);
    });

    it('bidWrapStepProtectByWrapping() should wrap payload into a script tag', function() {
      const fakeBidResponse = makeFakeBidResponse();
      bidWrapStepProtectByWrapping(fakeScriptURL, 0, fakeBidResponse);
      ensureWrapBidResponse(fakeBidResponse, fakeScriptURL);
    });
  });

  describe('Submodule execution', function() {
    let submoduleStub;
    let preloadStub;
    beforeEach(function () {
      submoduleStub = sinon.stub(hook, 'submodule');
      preloadStub = sinon.stub(adloader, 'preloadExternalScript').callsFake(() => new Promise(() => {}));
    });
    afterEach(function () {
      preloadStub.restore();
      submoduleStub.restore();
    });

    function getModule() {
      beforeInit('humansecurityMalvDefense');

      expect(submoduleStub.calledOnceWith('realTimeData')).to.equal(true);

      const registeredSubmoduleDefinition = submoduleStub.getCall(0).args[1];
      expect(registeredSubmoduleDefinition).to.be.an('object');
      expect(registeredSubmoduleDefinition).to.have.own.property('name', 'humansecurityMalvDefense');
      expect(registeredSubmoduleDefinition).to.have.own.property('init').that.is.a('function');
      expect(registeredSubmoduleDefinition).to.have.own.property('onBidResponseEvent').that.is.a('function');

      return registeredSubmoduleDefinition;
    }

    it('should register humansecurityMalvDefense RTD submodule provider', function () {
      getModule();
    });

    it('should refuse initialization with incorrect parameters', function () {
      const { init } = getModule();
      expect(init({ params: { cdnUrl: 'abc', protectionMode: 'full' } }, {})).to.equal(false); // too short distribution name
      sinon.assert.notCalled(loadExternalScriptStub);
    });

    it('should initialize in full (page) protection mode', function () {
      const { init, onBidResponseEvent } = getModule();
      expect(init({ params: { cdnUrl: 'https://cadmus.script.ac/abc1234567890/script.js', protectionMode: 'full' } }, {})).to.equal(true);
      sinon.assert.calledOnce(loadExternalScriptStub);
      sinon.assert.calledWith(loadExternalScriptStub, 'https://cadmus.script.ac/abc1234567890/script.js', MODULE_TYPE_RTD, 'humansecurityMalvDefense');

      const fakeBidResponse = makeFakeBidResponse();
      onBidResponseEvent(fakeBidResponse, {}, {});
      ensurePrependToBidResponse(fakeBidResponse);
    });

    it('should iniitalize in bids (frame) protection mode', function () {
      const { init, onBidResponseEvent } = getModule();
      expect(init({ params: { cdnUrl: 'https://cadmus.script.ac/abc1234567890/script.js', protectionMode: 'bids' } }, {})).to.equal(true);
      sinon.assert.called(preloadStub);
      const fakeBidResponse = makeFakeBidResponse();
      onBidResponseEvent(fakeBidResponse, {}, {});
      ensureWrapBidResponse(fakeBidResponse, 'https://cadmus.script.ac/abc1234567890/script.js');
    });

    describe('should respect preload status in bids-nowait protection mode', function () {
      let success, fail, promise, onBidResponseEvent;
      beforeEach(() => {
        preloadStub.callsFake(() => {
          const inner = new Promise((resolve, reject) => {
            success = resolve;
            fail = reject;
          });
          promise = inner.then(() => Promise.resolve(), () => Promise.resolve());
          return inner;
        });
        const module = getModule();
        onBidResponseEvent = module.onBidResponseEvent;
        expect(module.init({
          params: {
            cdnUrl: 'https://cadmus.script.ac/abc1234567890/script.js',
            protectionMode: 'bids-nowait'
          }
        }, {})).to.equal(true);
        sinon.assert.calledOnce(preloadStub);
        const fakeBidResponse1 = makeFakeBidResponse();
        onBidResponseEvent(fakeBidResponse1, {}, {});
        ensurePrependToBidResponse(fakeBidResponse1);
      });
      it('load success', async () => {
        success();
        await promise;
        const fakeBidResponse2 = makeFakeBidResponse();
        onBidResponseEvent(fakeBidResponse2, {}, {});
        ensureWrapBidResponse(fakeBidResponse2, 'https://cadmus.script.ac/abc1234567890/script.js');
      });
      it('load fail', async () => {
        fail();
        await promise;
        // Now we should fallback to just prepending
        const fakeBidResponse3 = makeFakeBidResponse();
        onBidResponseEvent(fakeBidResponse3, {}, {});
        ensurePrependToBidResponse(fakeBidResponse3);
      });
    });

    it('should send billable event per bid won event', function () {
      const { init } = getModule();
      expect(init({ params: { cdnUrl: 'https://cadmus.script.ac/abc1234567890/script.js', protectionMode: 'full' } }, {})).to.equal(true);

      const eventCounter = { registerHumansecurityMalvDefenseBillingEvent: function() {} };
      sinon.spy(eventCounter, 'registerHumansecurityMalvDefenseBillingEvent');

      events.on(EVENTS.BILLABLE_EVENT, (evt) => {
        if (evt.vendor === 'humansecurityMalvDefense') {
          eventCounter.registerHumansecurityMalvDefenseBillingEvent();
        }
      });

      events.emit(EVENTS.BID_WON, {});
      events.emit(EVENTS.BID_WON, {});
      events.emit(EVENTS.BID_WON, {});
      events.emit(EVENTS.BID_WON, {});

      sinon.assert.callCount(eventCounter.registerHumansecurityMalvDefenseBillingEvent, 4);
    });
  });
});
