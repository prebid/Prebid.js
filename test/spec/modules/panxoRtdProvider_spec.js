import { loadExternalScript, loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

import * as utils from '../../../src/utils.js';
import * as hook from '../../../src/hook.js';
import * as events from '../../../src/events.js';
import * as activityRules from '../../../src/activities/rules.js';
import { EVENTS } from '../../../src/constants.js';
import * as rtdModule from '../../../modules/rtdModule/index.js';

import { __TEST__ } from '../../../modules/panxoRtdProvider.js';

const {
  SUBMODULE_NAME,
  SCRIPT_URL,
  main,
  load,
  onImplLoaded,
  onImplMessage,
  onGetBidRequestData
} = __TEST__;

// Existing lifecycle cases advance the asynchronous preload explicitly. The
// configuration-task cases below leave init pending to exercise its ordering.
let initialTaskClock;
function loadAndPreload(config) {
  const result = load(config);
  initialTaskClock.tick(0);
  return result;
}

describe('panxo RTD module', function () {
  let sandbox;

  const stubUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const panxoBridgeId = `panxo_${stubUuid}`;
  const stubWindow = { [panxoBridgeId]: undefined };

  const validSiteId = 'a1b2c3d4e5f67890';

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    initialTaskClock = sandbox.useFakeTimers();
    sandbox.stub(utils, 'getWindowSelf').returns(stubWindow);
    sandbox.stub(utils, 'generateUUID').returns(stubUuid);
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
      expect(() => loadAndPreload({ params: { siteId: validSiteId } })).to.not.throw();
    });

    it('should throw an Error when siteId is missing', function () {
      expect(() => loadAndPreload({})).to.throw();
      expect(() => loadAndPreload({ params: {} })).to.throw();
      expect(() => loadAndPreload({ params: { siteId: '' } })).to.throw();
    });

    it('should throw an Error when siteId is not a valid hex string', function () {
      expect(() => loadAndPreload({ params: { siteId: 'abc' } })).to.throw();
      expect(() => loadAndPreload({ params: { siteId: 123 } })).to.throw();
      expect(() => loadAndPreload({ params: { siteId: 'zzzzzzzzzzzzzzzz' } })).to.throw();
      expect(() => loadAndPreload({ params: { siteId: 'a1b2c3d4e5f6789' } })).to.throw(); // 15 chars
      expect(() => loadAndPreload({ params: { siteId: 'a1b2c3d4e5f678901' } })).to.throw(); // 17 chars
    });

    it('should insert implementation script with correct URL', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      expect(loadExternalScriptStub.calledOnce).to.be.true;

      const args = loadExternalScriptStub.getCall(0).args;
      expect(args[0]).to.be.equal(
        `${SCRIPT_URL}?siteId=${validSiteId}&session=${stubUuid}`
      );
      expect(args[2]).to.be.equal(SUBMODULE_NAME);
      expect(args[3]).to.be.a('function');
      expect(args[4]).to.equal(undefined);
      expect(args[5]).to.deep.equal({ crossorigin: 'anonymous', referrerpolicy: 'no-referrer' });
    });

    it('should connect to the implementation script once it loads', function () {
      loadAndPreload({ params: { siteId: validSiteId } });

      expect(loadExternalScriptStub.calledOnce).to.be.true;
      expect(connectSpy.calledOnce).to.be.true;

      const args = connectSpy.getCall(0).args;
      expect(Object.keys(args[0])).to.deep.equal([]);
      expect(Object.isFrozen(args[0])).to.be.true;
      expect(args[1]).to.be.a('function');
    });

    it('should flush pending callbacks when bridge is unavailable', function () {
      sandbox2.restore();
      // Bridge is not registered on the window -- onImplLoaded should fail open
      sandbox2 = sinon.createSandbox();
      sandbox2.stub(stubWindow, panxoBridgeId).value(undefined);

      loadAndPreload({ params: { siteId: validSiteId } });

      const callbackSpy = sandbox2.spy();
      const reqBidsConfig = { ortb2Fragments: { bidder: {}, global: {} } };

      // Queue a callback before bridge fails
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      // onImplLoaded already ran (bridge undefined) and flushed
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('should not throw when bridge message is null', function () {
      loadAndPreload({ params: { siteId: validSiteId } });
      expect(() => onImplMessage(null)).to.not.throw();
      expect(() => onImplMessage(undefined)).to.not.throw();
    });
  });

  describe('Bid enrichment step', function () {
    const signalData = {
      device: { v1: 'session-token-123' },
      site: { ai: true, src: 'chatgpt', conf: 0.95, seg: 'technology', co: 'US' },
      user: {
        data: [{
          name: 'panxo.ai',
          ext: { segtax: null },
          segment: [
            { id: '1001' },
            { id: '3401' }
          ]
        }, {
          name: 'publisher.example',
          segment: [{ id: 'publisher-first-party' }]
        }, {
          name: 'curator.example',
          ext: {
            panxo: {
              audience_laboratory_envelope: { package: 'aud_review', revision: 'rev_1' }
            }
          },
          segment: [{ id: 'governed-curator-entry' }]
        }]
      }
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
      loadExternalScriptStub.callsFake(() => document.createElement('script'));
    });
    afterEach(function () {
      loadExternalScriptStub.reset();
      sandbox2.restore();
    });

    it('should release pending work when the loaded bridge is null', () => {
      loadAndPreload({ params: { siteId: validSiteId } });
      sandbox2.stub(stubWindow, panxoBridgeId).value(null);
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      expect(() => onImplLoaded()).to.not.throw();
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('should stop using cached signals after a bridge error', () => {
      loadAndPreload({ params: { siteId: validSiteId } });
      onImplMessage({ type: 'signal', data: signalData });
      onImplMessage({ type: 'error', data: 'signal unavailable' });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.deep.equal({});
    });

    it('should release an expired auction and leave it unchanged when a signal arrives later', () => {
      const clock = initialTaskClock;
      loadAndPreload({ params: { siteId: validSiteId } });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {}, 25);
      clock.tick(26);
      expect(callbackSpy.calledOnce).to.be.true;
      onImplMessage({ type: 'signal', data: signalData });
      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.deep.equal({});
    });

    it('should defer callback when implementation has not sent a signal yet', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      // Callback is deferred until the implementation script sends its first signal
      expect(callbackSpy.notCalled).to.be.true;
    });

    it('should flush deferred callback once a signal arrives', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      expect(callbackSpy.notCalled).to.be.true;

      // First signal arrives -- deferred callback should now fire
      onImplMessage({ type: 'signal', data: { device: { v1: 'tok' }, site: {} } });
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('should flush all deferred callbacks when the first signal arrives', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

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
      loadAndPreload({ params: { siteId: validSiteId } });

      // Mark implementation as ready via a signal
      onImplMessage({ type: 'signal', data: { device: { v1: 'tok' }, site: {} } });

      // Subsequent calls should resolve immediately
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      expect(callbackSpy.calledOnce).to.be.true;
    });

    it('should call callback when implementation reports an error', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
      expect(callbackSpy.notCalled).to.be.true;

      // An error still unblocks the auction
      onImplMessage({ type: 'error', data: 'some error' });
      expect(callbackSpy.calledOnce).to.be.true;
      // No device or site should be added since panxoData is empty
    });

    it('should discard device identity from the signal', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      onImplMessage({ type: 'signal', data: signalData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.not.have.own.property('device');
    });

    it('should add site.ext.data.panxo with AI classification data', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      onImplMessage({ type: 'signal', data: signalData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.have.own.property('site');
      expect(reqBidsConfig.ortb2Fragments.global.site).to.have.own.property('ext');
      expect(reqBidsConfig.ortb2Fragments.global.site.ext).to.have.own.property('data');
      expect(reqBidsConfig.ortb2Fragments.global.site.ext.data).to.have.own.property('panxo')
        .which.is.an('object')
        .that.deep.equals({ ai: true });
    });

    it('should discard user identity and audience memberships from the signal', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      onImplMessage({ type: 'signal', data: signalData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.not.have.own.property('user');
    });

    it('should update panxo data when new signal is received', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      const updatedData = {
        device: { v1: 'updated-token' },
        site: { ai: true, src: 'perplexity', conf: 0.88, seg: 'finance', co: 'UK' }
      };

      onImplMessage({ type: 'signal', data: { device: { v1: 'old-token' }, site: {} } });
      onImplMessage({ type: 'signal', data: updatedData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.not.have.own.property('device');
      expect(reqBidsConfig.ortb2Fragments.global.site.ext.data.panxo)
        .to.deep.equal({ ai: true });
    });

    it('should not add site data when site object is empty', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      onImplMessage({ type: 'signal', data: { device: { v1: 'token' }, site: {} } });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.deep.equal({});
    });
    it('should not add user data when user object is empty', () => {
      loadAndPreload({ params: { siteId: validSiteId } });

      onImplMessage({ type: 'signal', data: { device: { v1: 'token' }, user: {} } });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.deep.equal({});
    });

    it('should leave publisher and other-provider data intact while discarding bridge identity', () => {
      loadAndPreload({ params: { siteId: validSiteId } });
      const user = { id: 'synthetic-publisher-user', data: [{ name: 'other-provider', segment: [{ id: 'publisher-member' }] }] };
      const device = { ext: { other: { token: 'synthetic-other-provider-token' } } };
      reqBidsConfig.ortb2Fragments.global = {
        user,
        device,
        site: { ext: { data: { other: { classification: 'synthetic-context' } } } }
      };
      reqBidsConfig.ortb2Fragments.bidder = { other: { user: { id: 'synthetic-bidder-specific-id' } } };
      const beforeUser = JSON.stringify(user);
      const beforeDevice = JSON.stringify(device);
      const beforeBidder = JSON.stringify(reqBidsConfig.ortb2Fragments.bidder);
      const beforeSignal = JSON.stringify(signalData);

      onImplMessage({ type: 'signal', data: signalData });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(callbackSpy.calledOnce).to.be.true;
      expect(JSON.stringify(user)).to.equal(beforeUser);
      expect(JSON.stringify(device)).to.equal(beforeDevice);
      expect(JSON.stringify(reqBidsConfig.ortb2Fragments.bidder)).to.equal(beforeBidder);
      expect(JSON.stringify(signalData)).to.equal(beforeSignal);
      expect(reqBidsConfig.ortb2Fragments.global.user).to.equal(user);
      expect(reqBidsConfig.ortb2Fragments.global.device).to.equal(device);
      expect(reqBidsConfig.ortb2Fragments.global.site.ext.data).to.deep.equal({
        other: { classification: 'synthetic-context' }, panxo: { ai: true }
      });
    });

    it('should not read the discarded user and device bridge channels', () => {
      loadAndPreload({ params: { siteId: validSiteId } });
      const identityRead = sandbox2.stub().throws(new Error('discarded bridge identity must not be read'));
      const data = { site: { ai: true, src: 'synthetic-context' } };
      ['user', 'device'].forEach(key => {
        Object.defineProperty(data, key, { enumerable: true, get: identityRead });
      });

      onImplMessage({ type: 'signal', data });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      expect(identityRead.notCalled).to.be.true;
      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global).to.deep.equal({
        site: { ext: { data: { panxo: { ai: true } } } }
      });
    });

    [undefined, null, '', 'not-an-object', 1, [], ['invalid']].forEach(site => {
      it(`should ignore malformed site ${JSON.stringify(site)} and release the auction`, () => {
        loadAndPreload({ params: { siteId: validSiteId } });
        onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
        onImplMessage({ type: 'signal', data: { site, user: signalData.user, device: signalData.device } });
        expect(callbackSpy.calledOnce).to.be.true;
        expect(reqBidsConfig.ortb2Fragments.global).to.deep.equal({});
      });
    });

    it('should reject prototype-changing keys in nested site objects without mutating the signal', () => {
      const site = JSON.parse('{"ai":true,"__proto__":{"syntheticPolluted":true},"constructor":{"prototype":{"syntheticPolluted":true}},"context":{"__proto__":{"syntheticPolluted":true},"constructor":{"prototype":{"syntheticPolluted":true}},"label":"synthetic-context"}}');
      const before = JSON.stringify(site);
      loadAndPreload({ params: { siteId: validSiteId } });
      onImplMessage({ type: 'signal', data: { site } });
      onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});

      const emitted = reqBidsConfig.ortb2Fragments.global.site.ext.data.panxo;
      expect(emitted).to.deep.equal({ ai: true });
      expect(emitted).to.not.have.own.property('__proto__');
      expect(emitted).to.not.have.own.property('constructor');
      expect(Object.getPrototypeOf(emitted)).to.equal(Object.prototype);
      expect(Object.prototype).to.not.have.own.property('syntheticPolluted');
      expect(JSON.stringify(site)).to.equal(before);
      expect(callbackSpy.calledOnce).to.be.true;
    });

    [false, undefined, null, 'true', 1, {}, []].forEach(ai => {
      it(`should clear cached coarse classification for invalid or false ai ${JSON.stringify(ai)}`, () => {
        loadAndPreload({ params: { siteId: validSiteId } });
        onImplMessage({ type: 'signal', data: { site: { ai: true } } });
        const previous = { ortb2Fragments: { global: {}, bidder: {} } };
        onGetBidRequestData(previous, () => {}, {}, {}, 0);
        onImplMessage({ type: 'signal', data: { site: { ai, context: { value: 'synthetic-personal' } } } });
        reqBidsConfig.ortb2Fragments.bidder = { other: { site: { ext: { data: { keep: true } } } } };
        const before = JSON.stringify(reqBidsConfig);
        onGetBidRequestData(reqBidsConfig, callbackSpy, {}, {}, 0);
        expect(callbackSpy.calledOnce).to.be.true;
        expect(JSON.stringify(reqBidsConfig)).to.equal(before);
        expect(previous.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal({ ai: true });
      });
    });

    it('should project only the existing coarse tier without reading discarded fields', () => {
      loadAndPreload({ params: { siteId: validSiteId } });
      const discardedRead = sandbox2.stub().throws(new Error('discarded site payload'));
      const site = { ai: true };
      ['src', 'conf', 'seg', 'co', 'context', 'topics'].forEach(key => {
        Object.defineProperty(site, key, { enumerable: true, get: discardedRead });
      });
      onImplMessage({ type: 'signal', data: { site } });
      onGetBidRequestData(reqBidsConfig, callbackSpy, {}, {}, 0);
      expect(discardedRead.notCalled).to.be.true;
      expect(callbackSpy.calledOnce).to.be.true;
      expect(reqBidsConfig.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal({ ai: true });
    });

    it('should ignore inherited or accessor ai without evaluating it', () => {
      loadAndPreload({ params: { siteId: validSiteId } });
      const aiRead = sandbox2.stub().throws(new Error('accessor classification'));
      const accessorSite = {};
      Object.defineProperty(accessorSite, 'ai', { enumerable: true, get: aiRead });
      [Object.create({ ai: true }), accessorSite].forEach(site => {
        onImplMessage({ type: 'signal', data: { site } });
        const req = { ortb2Fragments: { global: {}, bidder: {} } };
        const done = sandbox2.spy();
        onGetBidRequestData(req, done, {}, {}, 0);
        expect(done.calledOnce).to.be.true;
        expect(req.ortb2Fragments.global).to.deep.equal({});
      });
      expect(aiRead.notCalled).to.be.true;
    });

    it('should report a bridge error without logging its identity-bearing payload', () => {
      loadAndPreload({ params: { siteId: validSiteId } });
      const debugEvent = sandbox2.spy();
      events.on(EVENTS.AUCTION_DEBUG, debugEvent);
      try {
        onGetBidRequestData(reqBidsConfig, callbackSpy, { params: {} }, {});
        onImplMessage({ type: 'error', data: { userId: 'synthetic-private-id', message: 'synthetic-private-detail' } });
        expect(callbackSpy.calledOnce).to.be.true;
        expect(debugEvent.calledOnce).to.be.true;
        expect(debugEvent.firstCall.args[0]).to.deep.equal({
          type: 'ERROR', arguments: ['[panxo]:', 'impl', 'Implementation script reported an error']
        });
        expect(reqBidsConfig.ortb2Fragments.global).to.deep.equal({});
      } finally {
        events.off(EVENTS.AUCTION_DEBUG, debugEvent);
      }
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
      expect(loadExternalScriptStub.notCalled).to.be.true;
      initialTaskClock.tick(0);
      expect(loadExternalScriptStub.calledOnce).to.be.true;
    });
  });
});

const cfg = { name: 'panxo', params: { siteId: 'a1b2c3d4e5f67890' } };
const request = () => ({ ortb2Fragments: { global: {}, bidder: {} } });
const signal = () => ({ site: { ai: true } });

describe('LAB02 QA RTD lifecycle', function () {
  let sandbox;
  let clock;
  let wnd;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = initialTaskClock = sandbox.useFakeTimers();
    wnd = {};
    sandbox.stub(utils, 'getWindowSelf').returns(wnd);
    sandbox.stub(utils, 'generateUUID').returns('qa-session');
    loadExternalScriptStub.callsFake(() => document.createElement('script'));
    loadAndPreload(cfg);
  });
  afterEach(() => {
    clock.runAll();
    sandbox.restore();
  });

  it('isolates cached coarse classification from later bridge mutation', () => {
    const data = signal();
    onImplMessage({ type: 'signal', data });
    data.site.ai = false;
    data.site.context = { value: 'synthetic-bridge-mutated' };
    const req = request();
    onGetBidRequestData(req, () => {}, cfg, {}, 30);
    expect(req.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal(signal().site);
  });

  it('isolates cached coarse classification from earlier auction mutation', () => {
    onImplMessage({ type: 'signal', data: signal() });
    const first = request();
    onGetBidRequestData(first, () => {}, cfg, {}, 30);
    first.ortb2Fragments.global.site.ext.data.panxo.ai = false;
    first.ortb2Fragments.global.site.ext.data.panxo.context = { value: 'synthetic-auction-mutated' };
    const second = request();
    onGetBidRequestData(second, () => {}, cfg, {}, 30);
    expect(second.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal(signal().site);
  });

  it('keeps concurrently enriched auctions independent', () => {
    const first = request();
    const second = request();
    onGetBidRequestData(first, () => {}, cfg, {}, 30);
    onGetBidRequestData(second, () => {}, cfg, {}, 30);
    onImplMessage({ type: 'signal', data: signal() });
    first.ortb2Fragments.global.site.ext.data.panxo.ai = false;
    first.ortb2Fragments.global.site.ext.data.panxo.context = { value: 'synthetic-inserted' };
    expect(second.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal({ ai: true });
    expect(first.ortb2Fragments.global.site.ext.data.panxo).not.to.equal(second.ortb2Fragments.global.site.ext.data.panxo);
  });

  it('enriches only a still pending auction after another expires', () => {
    const first = request();
    const second = request();
    const callback1 = sandbox.spy();
    const callback2 = sandbox.spy();
    onGetBidRequestData(first, callback1, cfg, {}, 10);
    onGetBidRequestData(second, callback2, cfg, {}, 30);
    clock.tick(11);
    expect(callback1.calledOnce).to.be.true;
    expect(callback2.notCalled).to.be.true;
    onImplMessage({ type: 'signal', data: signal() });
    clock.tick(40);
    expect(first.ortb2Fragments.global).to.deep.equal({});
    expect(second.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal(signal().site);
    expect(callback1.calledOnce).to.be.true;
    expect(callback2.calledOnce).to.be.true;
  });

  it('expires multiple pending auctions independently with one callback each', () => {
    const first = sandbox.spy();
    const second = sandbox.spy();
    onGetBidRequestData(request(), first, cfg, {}, 5);
    onGetBidRequestData(request(), second, cfg, {}, 20);
    clock.tick(6);
    expect(first.calledOnce).to.be.true;
    expect(second.notCalled).to.be.true;
    clock.tick(20);
    expect(first.calledOnce).to.be.true;
    expect(second.calledOnce).to.be.true;
    onImplMessage({ type: 'error', data: 'synthetic error' });
    expect(first.calledOnce).to.be.true;
    expect(second.calledOnce).to.be.true;
  });

  it('fails open when the external bridge connect throws asynchronously', () => {
    const callback = sandbox.spy();
    onGetBidRequestData(request(), callback, cfg, {}, 100);
    wnd['panxo_qa-session'] = { connect: () => { throw new Error('synthetic bridge failure'); } };
    expect(() => onImplLoaded()).to.not.throw();
    expect(callback.calledOnce).to.be.true;
  });

  function withRegisteredProvider(run) {
    const registration = sandbox.stub(hook, 'submodule');
    main();
    const provider = registration.firstCall.args[1];
    registration.restore();
    const testProvider = { ...provider, config: cfg };
    const activeProviders = rtdModule.subModules;
    const previousProviders = activeProviders.slice();
    // Keep the real core deletion dispatcher without initializing its one-time
    // event listeners before the core module's own tests install their fixture.
    activeProviders.splice(0, activeProviders.length, testProvider);
    try {
      expect(testProvider.init(cfg, {})).to.be.true;
      run();
    } finally {
      activeProviders.splice(0, activeProviders.length, ...previousProviders);
    }
  }

  it('invalidates cached data when core dispatches deletion', () => {
    withRegisteredProvider(() => {
      onImplMessage({ type: 'signal', data: signal() });
      const continuation = sandbox.spy();
      rtdModule.onDataDeletionRequest(continuation);
      expect(continuation.calledOnce).to.be.true;
      const next = request();
      onGetBidRequestData(next, () => {}, cfg, {}, 30);
      expect(next.ortb2Fragments.global).to.deep.equal({});
    });
  });

  it('releases all pending auctions without enrichment on deletion', () => {
    withRegisteredProvider(() => {
      const first = request();
      const second = request();
      const callback1 = sandbox.spy();
      const callback2 = sandbox.spy();
      onGetBidRequestData(first, callback1, cfg, {}, 10);
      onGetBidRequestData(second, callback2, cfg, {}, 20);
      rtdModule.onDataDeletionRequest(() => {});
      expect(callback1.calledOnce).to.be.true;
      expect(callback2.calledOnce).to.be.true;
      clock.tick(30);
      expect(callback1.calledOnce).to.be.true;
      expect(callback2.calledOnce).to.be.true;
      expect(first.ortb2Fragments.global).to.deep.equal({});
      expect(second.ortb2Fragments.global).to.deep.equal({});
    });
  });

  it('ignores signals from the old bridge after deletion', () => {
    withRegisteredProvider(() => {
      rtdModule.onDataDeletionRequest(() => {});
      onImplMessage({ type: 'signal', data: signal() });
      const next = request();
      const callback = sandbox.spy();
      onGetBidRequestData(next, callback, cfg, {}, 30);
      expect(callback.calledOnce).to.be.true;
      expect(next.ortb2Fragments.global).to.deep.equal({});
    });
  });

  it('does not connect when script load completes after deletion', () => {
    withRegisteredProvider(() => {
      const connect = sandbox.spy();
      wnd['panxo_qa-session'] = { connect };
      rtdModule.onDataDeletionRequest(() => {});
      onImplLoaded();
      expect(connect.notCalled).to.be.true;
    });
  });
});

describe('LAB02 QA RTD connection generations', function () {
  let sandbox;
  let clock;
  let wnd;
  let nextSession;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = initialTaskClock = sandbox.useFakeTimers();
    wnd = {};
    nextSession = 0;
    sandbox.stub(utils, 'getWindowSelf').returns(wnd);
    sandbox.stub(utils, 'generateUUID').callsFake(() => `generation-${++nextSession}`);
    loadExternalScriptStub.callsFake(() => document.createElement('script'));
  });

  afterEach(() => {
    clock.runAll();
    sandbox.restore();
  });

  function bridgeFor(loadCall = loadExternalScriptStub.lastCall) {
    const session = new URL(loadCall.args[0]).searchParams.get('session');
    const callbacks = [];
    const connect = sandbox.spy((pbjs, callback) => callbacks.push(callback));
    wnd[`panxo_${session}`] = { connect };
    return { callbacks, connect, finish: loadCall.args[3], session };
  }

  function start(config = cfg) {
    loadAndPreload(config);
    return bridgeFor();
  }

  function auction(onDone = () => {}) {
    const req = request();
    const done = sandbox.spy(onDone);
    onGetBidRequestData(req, done, cfg, {}, 100);
    return { req, done };
  }

  function send(bridge, ai) {
    bridge.callbacks[0]({ type: 'signal', data: { site: { ai } } });
  }

  function readClassification(value) {
    return value.req.ortb2Fragments.global.site?.ext?.data?.panxo?.ai;
  }

  function deleteThroughCore() {
    const registration = sandbox.stub(hook, 'submodule');
    main();
    const provider = { ...registration.firstCall.args[1], config: cfg };
    registration.restore();
    const active = rtdModule.subModules;
    const previous = active.slice();
    active.splice(0, active.length, provider);
    try {
      const continuation = sandbox.spy();
      rtdModule.onDataDeletionRequest(continuation);
      expect(continuation.calledOnce).to.be.true;
    } finally {
      active.splice(0, active.length, ...previous);
    }
  }

  it('ignores old signal callbacks after reinitialization', () => {
    const old = start();
    old.finish();
    const current = start();
    current.finish();
    const next = auction();
    send(old, false);
    expect(next.done.notCalled).to.be.true;
    send(current, true);
    expect(next.done.calledOnce).to.be.true;
    expect(readClassification(next)).to.equal(true);
  });

  it('does not let an old script load connect a newer bridge', () => {
    const old = start();
    const current = start();
    old.finish();
    expect(old.connect.notCalled).to.be.true;
    expect(current.connect.notCalled).to.be.true;
    current.finish();
    expect(current.connect.calledOnce).to.be.true;
  });

  it('keeps old callbacks invalid after core deletion and reinitialization', () => {
    const old = start();
    old.finish();
    deleteThroughCore();
    const current = start();
    current.finish();
    const next = auction();
    send(old, false);
    expect(next.done.notCalled).to.be.true;
    send(current, true);
    expect(readClassification(next)).to.equal(true);
  });

  it('releases previous pending auctions once without enrichment on reinitialization', () => {
    start();
    const previous = auction();
    start();
    expect(previous.done.calledOnce).to.be.true;
    expect(previous.req.ortb2Fragments.global).to.deep.equal({});
    clock.tick(200);
    expect(previous.done.calledOnce).to.be.true;
    expect(previous.req.ortb2Fragments.global).to.deep.equal({});
  });

  it('does not let an old error erase current signals', () => {
    const old = start();
    old.finish();
    const current = start();
    current.finish();
    send(current, true);
    old.callbacks[0]({ type: 'error', data: 'synthetic stale error' });
    expect(readClassification(auction())).to.equal(true);
  });

  it('accepts successive current-generation signals without re-enriching completed auctions', () => {
    const current = start();
    current.finish();
    const first = auction();
    send(current, true);
    expect(readClassification(first)).to.equal(true);
    send(current, false);
    expect(readClassification(auction())).to.equal(undefined);
    expect(first.done.calledOnce).to.be.true;
    expect(readClassification(first)).to.equal(true);
  });

  it('keeps generations distinct even when the generated UUID repeats', () => {
    utils.generateUUID.callsFake(() => 'repeated-session');
    const old = start();
    old.finish();
    const current = start();
    current.finish();
    const next = auction();
    send(old, false);
    expect(next.done.notCalled).to.be.true;
    send(current, true);
    expect(readClassification(next)).to.equal(true);
  });

  it('keeps only the newest load when draining synchronously reinitializes', () => {
    start();
    auction(() => loadAndPreload({ ...cfg, params: { siteId: 'cccccccccccccccc' } }));
    loadAndPreload({ ...cfg, params: { siteId: 'bbbbbbbbbbbbbbbb' } });
    expect(loadExternalScriptStub.callCount).to.equal(2);
    expect(loadExternalScriptStub.lastCall.args[0]).to.include('siteId=cccccccccccccccc');
    const current = bridgeFor();
    current.finish();
    send(current, true);
    expect(readClassification(auction())).to.equal(true);
  });

  it('does not load an obsolete connection after reentrant core deletion', () => {
    start();
    auction(deleteThroughCore);
    loadAndPreload(cfg);
    expect(loadExternalScriptStub.callCount).to.equal(1);
    const next = auction();
    expect(next.done.calledOnce).to.be.true;
    expect(next.req.ortb2Fragments.global).to.deep.equal({});
  });

  it('ignores a connect exception from a generation replaced synchronously', () => {
    const old = start();
    auction(() => {
      const current = start();
      current.finish();
      send(current, true);
    });
    wnd[`panxo_${old.session}`].connect = (pbjs, callback) => {
      callback({ type: 'signal', data: { site: { ai: false } } });
      throw new Error('synthetic late connect error');
    };
    old.finish();
    expect(readClassification(auction())).to.equal(true);
  });

  it('does not enrich a second drained auction with a reentrant new generation', () => {
    const old = start();
    old.finish();
    const first = auction(() => {
      const current = start();
      current.finish();
      send(current, true);
    });
    const second = auction();
    send(old, false);
    expect(first.done.calledOnce).to.be.true;
    expect(readClassification(first)).to.equal(undefined);
    expect(second.done.calledOnce).to.be.true;
    expect(second.req.ortb2Fragments.global).to.deep.equal({});
    expect(readClassification(auction())).to.equal(true);
  });
});

describe('LAB02 QA RTD callback bridge boundary', function () {
  let sandbox;
  let clock;
  let wnd;
  let nextSession;
  let cleanup;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = initialTaskClock = sandbox.useFakeTimers();
    wnd = {};
    nextSession = 0;
    cleanup = [];
    sandbox.stub(utils, 'getWindowSelf').returns(wnd);
    sandbox.stub(utils, 'generateUUID').callsFake(() => `bridge-${++nextSession}`);
    loadExternalScriptStub.callsFake(() => document.createElement('script'));
  });

  afterEach(() => {
    deleteThroughCore();
    cleanup.forEach(([event, handler]) => events.off(event, handler));
    clock.runAll();
    sandbox.restore();
  });

  function deleteThroughCore() {
    const registration = sandbox.stub(hook, 'submodule');
    main();
    const provider = { ...registration.firstCall.args[1], config: cfg };
    registration.restore();
    const active = rtdModule.subModules;
    const previous = active.slice();
    active.splice(0, active.length, provider);
    try {
      rtdModule.onDataDeletionRequest(() => {});
    } finally {
      active.splice(0, active.length, ...previous);
    }
  }

  function start(onConnect = () => {}) {
    loadAndPreload(cfg);
    const call = loadExternalScriptStub.lastCall;
    const session = new URL(call.args[0]).searchParams.get('session');
    const connection = { apis: [], callbacks: [], reconnect: call.args[3] };
    wnd[`panxo_${session}`] = {
      connect: (api, callback) => {
        connection.apis.push(api);
        connection.callbacks.push(callback);
        onConnect(api, callback);
      }
    };
    call.args[3]();
    connection.api = connection.apis[0];
    return connection;
  }

  it('keeps the two-argument bridge with no Prebid capabilities or data', () => {
    const connection = start();
    expect(Reflect.ownKeys(connection.api)).to.deep.equal([]);
    expect(Object.isFrozen(connection.api)).to.be.true;
    ['onEvent', 'offEvent', 'getConfig', 'getEvents', 'requestBids'].forEach(key => {
      expect(connection.api).not.to.have.property(key);
    });
    expect(connection.callbacks[0]).to.be.a('function');
  });

  it('does not subscribe to core events or read personal fields from their payloads', () => {
    const on = sandbox.spy(events, 'on');
    const off = sandbox.spy(events, 'off');
    start();
    const readIdentity = sandbox.spy(() => { throw new Error('event identity must not reach the runtime'); });
    const payload = { bidderCode: 'synthetic-other-bidder', bids: [] };
    Object.defineProperty(payload, 'ortb2', { get: readIdentity });
    Object.defineProperty(payload, 'userId', { get: readIdentity });
    expect(() => events.emit(EVENTS.BID_REQUESTED, payload)).not.to.throw();
    expect(readIdentity.notCalled).to.be.true;
    deleteThroughCore();
    expect(on.notCalled).to.be.true;
    expect(off.notCalled).to.be.true;
  });

  it('preserves publisher event listeners across reconnect, reinit and deletion', () => {
    const publisher = sandbox.spy();
    events.on(EVENTS.BID_WON, publisher);
    cleanup.push([EVENTS.BID_WON, publisher]);
    const connection = start();
    connection.reconnect();
    start();
    deleteThroughCore();
    events.emit(EVENTS.BID_WON, {});
    expect(publisher.calledOnce).to.be.true;
  });

  it('ignores old callbacks after reinit while allowing the replacement decision', () => {
    const old = start();
    const current = start();
    const req = request();
    const done = sandbox.spy();
    onGetBidRequestData(req, done, cfg, {}, 100);
    old.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    expect(done.notCalled).to.be.true;
    current.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    expect(done.calledOnce).to.be.true;
    expect(req.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal({ ai: true });
  });

  it('ignores callbacks after core deletion and releases the waiting auction once', () => {
    const connection = start();
    const req = request();
    const done = sandbox.spy();
    onGetBidRequestData(req, done, cfg, {}, 100);
    deleteThroughCore();
    connection.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    expect(done.calledOnce).to.be.true;
    expect(req.ortb2Fragments.global).to.deep.equal({});
  });

  it('repeated onload invalidates the previous signal callback in the same generation', () => {
    const connection = start();
    connection.reconnect();
    expect(connection.apis[1]).not.to.equal(connection.api);
    expect(Reflect.ownKeys(connection.apis[1])).to.deep.equal([]);
    const req = request();
    const done = sandbox.spy();
    onGetBidRequestData(req, done, cfg, {}, 100);
    connection.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    expect(done.notCalled).to.be.true;
    connection.callbacks[1]({ type: 'signal', data: { site: { ai: true } } });
    expect(done.calledOnce).to.be.true;
    expect(req.ortb2Fragments.global.site.ext.data.panxo.ai).to.equal(true);
  });

  it('rejects a callback retained by an implementation whose connect threw', () => {
    let late;
    start((api, callback) => {
      late = callback;
      throw new Error('synthetic connect failure');
    });
    const req = request();
    const done = sandbox.spy();
    onGetBidRequestData(req, done, cfg, {}, 100);
    late({ type: 'signal', data: { site: { ai: true } } });
    expect(done.calledOnce).to.be.true;
    expect(req.ortb2Fragments.global).to.deep.equal({});
  });

  it('an old connect exception does not invalidate a synchronously established new generation', () => {
    let current;
    start(() => {
      current = start();
      throw new Error('synthetic old connect failure');
    });
    const req = request();
    const done = sandbox.spy();
    onGetBidRequestData(req, done, cfg, {}, 100);
    current.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    expect(done.calledOnce).to.be.true;
    expect(req.ortb2Fragments.global.site.ext.data.panxo.ai).to.equal(true);
  });

  it('an old connect exception cannot clear a replacement in the same generation', () => {
    let first = true;
    let stale;
    start((api, callback) => {
      if (first) {
        first = false;
        stale = callback;
        onImplLoaded();
        throw new Error('synthetic old connect failure after another onload');
      }
      callback({ type: 'signal', data: { site: { ai: true } } });
    });
    stale({ type: 'signal', data: { site: { ai: false } } });
    const req = request();
    const done = sandbox.spy();
    onGetBidRequestData(req, done, cfg, {}, 100);
    expect(done.calledOnce).to.be.true;
    expect(req.ortb2Fragments.global.site?.ext?.data?.panxo?.ai).to.equal(true);
  });
});

describe('LAB02 QA RTD real external script loader', function () {
  let sandbox;
  let clock;
  let allowed;
  let inserted;
  let connect;
  let provider;
  let sequence = 0;
  const config = { params: { siteId: 'a1b2c3d4e5f67890' } };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = initialTaskClock = sandbox.useFakeTimers();
    inserted = [];
    const session = `loader-session-${++sequence}`;
    connect = sandbox.spy((facade, callback) => callback({ type: 'signal', data: { site: { ai: true } } }));
    sandbox.stub(utils, 'getWindowSelf').returns({ [`panxo_${session}`]: { connect } });
    sandbox.stub(utils, 'generateUUID').returns(session);
    allowed = sandbox.stub(activityRules, 'isActivityAllowed').returns(true);
    // Keep the actual adloader, element creation and attribute assignment, but
    // stop at insertion so this unit test cannot request external resources.
    sandbox.stub(utils, 'insertElement').callsFake(tag => inserted.push({
      tag,
      src: tag.src,
      crossorigin: tag.getAttribute('crossorigin'),
      referrerpolicy: tag.getAttribute('referrerpolicy'),
      connected: tag.isConnected
    }));
    loadExternalScriptStub.callsFake(loadExternalScript);
    const registration = sandbox.stub(hook, 'submodule');
    main();
    provider = registration.lastCall.args[1];
  });

  afterEach(() => {
    provider.onDataDeletionRequest();
    sandbox.restore();
  });

  function auction() {
    const req = request();
    const done = sandbox.spy();
    provider.getBidRequestData(req, done, config, {}, 50);
    return { req, done };
  }

  it('sets anonymous CORS and no-referrer before insertion, with only property and connection parameters', () => {
    provider.init(config, {});
    clock.tick(0);
    expect(inserted).to.have.length(1);
    const snapshot = inserted[0];
    const url = new URL(snapshot.src);
    expect(`${url.origin}${url.pathname}`).to.equal(SCRIPT_URL);
    expect([...url.searchParams.entries()]).to.deep.equal([
      ['siteId', config.params.siteId], ['session', `loader-session-${sequence}`]
    ]);
    expect(snapshot.crossorigin).to.equal('anonymous');
    expect(snapshot.referrerpolicy).to.equal('no-referrer');
    expect(snapshot.connected).to.be.false;
    expect(connect.notCalled).to.be.true;

    const pending = auction();
    expect(pending.done.notCalled).to.be.true;
    expect(inserted).to.have.length(1);
    snapshot.tag.onload();
    expect(connect.calledOnce).to.be.true;
    expect(pending.done.calledOnce).to.be.true;
    expect(pending.req.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal({ ai: true });
    expect(auction().done.calledOnce).to.be.true;
    expect(inserted).to.have.length(1);
  });

  it('retains real adloader activity denial and permits a later attributed load', () => {
    allowed.withArgs('loadExternalScript').returns(false);
    expect(provider.init(config, {})).to.be.true;
    clock.tick(0);
    expect(inserted).to.have.length(0);
    expect(auction().done.calledOnce).to.be.true;
    expect(connect.notCalled).to.be.true;
    expect(allowed.getCalls().some(call => call.args[0] === 'loadExternalScript' &&
      call.args[1].componentType === 'rtd' && call.args[1].componentName === SUBMODULE_NAME)).to.be.true;

    allowed.withArgs('loadExternalScript').returns(true);
    const pending = auction();
    expect(inserted).to.have.length(1);
    expect(inserted[0].crossorigin).to.equal('anonymous');
    expect(inserted[0].referrerpolicy).to.equal('no-referrer');
    inserted[0].tag.onload();
    expect(connect.calledOnce).to.be.true;
    expect(pending.done.calledOnce).to.be.true;
  });
});

describe('LAB02 QA RTD standard activity lifecycle', function () {
  let sandbox;
  let clock;
  let allowed;
  let provider;
  let wnd;
  let connect;
  let callbacks;
  let api;
  const config = { params: { siteId: 'a1b2c3d4e5f67890' } };
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = initialTaskClock = sandbox.useFakeTimers();
    wnd = {};
    callbacks = [];
    sandbox.stub(utils, 'getWindowSelf').returns(wnd);
    sandbox.stub(utils, 'generateUUID').returns('activity-session');
    allowed = sandbox.stub(activityRules, 'isActivityAllowed').returns(true);
    const registration = sandbox.stub(hook, 'submodule');
    main();
    provider = registration.lastCall.args[1];
    connect = sandbox.spy((facade, callback) => {
      api = facade;
      callbacks.push(callback);
    });
    wnd['panxo_activity-session'] = { connect };
    loadExternalScriptStub.callsFake(() => document.createElement('script'));
  });
  afterEach(() => {
    provider.onDataDeletionRequest();
    sandbox.restore();
  });
  function auction() {
    const req = request();
    const done = sandbox.spy();
    provider.getBidRequestData(req, done, config, {}, 50);
    return { req, done };
  }
  function completeLoad() {
    loadExternalScriptStub.lastCall.args[3]();
  }

  it('registers its own GVL ID and retains valid init while accessDevice is denied', () => {
    allowed.withArgs('accessDevice').returns(false);
    expect(provider.gvlid).to.equal(1527);
    expect(provider.init(config, {})).to.be.true;
    clock.tick(0);
    expect(utils.generateUUID.notCalled).to.be.true;
    expect(loadExternalScriptStub.notCalled).to.be.true;
    const result = auction();
    expect(result.done.calledOnce).to.be.true;
    expect(result.req.ortb2Fragments.global).to.deep.equal({});
    expect(allowed.firstCall.args[1]).to.include({
      componentType: 'rtd', componentName: 'panxo', component: 'rtd.panxo'
    });
  });

  it('retries a temporarily denied first load on a later allowed auction only once', () => {
    allowed.withArgs('accessDevice').returns(false);
    expect(provider.init(config, {})).to.be.true;
    clock.tick(0);
    allowed.withArgs('accessDevice').returns(true);
    const first = auction();
    const second = auction();
    expect(loadExternalScriptStub.calledOnce).to.be.true;
    completeLoad();
    callbacks[0]({ type: 'signal', data: signal() });
    expect(first.done.calledOnce).to.be.true;
    expect(second.done.calledOnce).to.be.true;
    expect(first.req.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal({ ai: true });
  });

  it('releases an adloader-denied auction immediately and retries without waiting for a callback', () => {
    loadExternalScriptStub.returns(undefined);
    provider.init(config, {});
    clock.tick(0);
    const result = auction();
    expect(result.done.calledOnce).to.be.true;
    expect(connect.notCalled).to.be.true;
    loadExternalScriptStub.returns(document.createElement('script'));
    auction();
    completeLoad();
    expect(connect.calledOnce).to.be.true;
  });

  it('connects an already loaded script after temporary denial without downloading twice', () => {
    provider.init(config, {});
    clock.tick(0);
    allowed.withArgs('accessDevice').returns(false);
    completeLoad();
    expect(connect.notCalled).to.be.true;
    expect(auction().done.calledOnce).to.be.true;
    allowed.withArgs('accessDevice').returns(true);
    auction();
    expect(loadExternalScriptStub.calledOnce).to.be.true;
    expect(connect.calledOnce).to.be.true;
  });

  it('invalidates a denied callback before a later reconnection', () => {
    provider.init(config, {});
    clock.tick(0);
    completeLoad();
    const oldCallback = callbacks[0];
    expect(Reflect.ownKeys(api)).to.deep.equal([]);
    allowed.withArgs('accessDevice').returns(false);
    oldCallback({ type: 'signal', data: signal() });
    allowed.withArgs('accessDevice').returns(true);
    const result = auction();
    oldCallback({ type: 'signal', data: signal() });
    expect(result.done.notCalled).to.be.true;
    callbacks[1]({ type: 'signal', data: signal() });
    expect(result.done.calledOnce).to.be.true;
    expect(loadExternalScriptStub.calledOnce).to.be.true;
  });

  it('clears cached data and completes pending work once when enrichment is denied', () => {
    provider.init(config, {});
    clock.tick(0);
    completeLoad();
    const pending = auction();
    allowed.withArgs('enrichUfpd').returns(false);
    callbacks[0]({ type: 'signal', data: signal() });
    expect(pending.done.calledOnce).to.be.true;
    expect(pending.req.ortb2Fragments.global).to.deep.equal({});
    const next = auction();
    expect(next.done.calledOnce).to.be.true;
    expect(next.req.ortb2Fragments.global).to.deep.equal({});
  });

  it('checks enrichment permission before generating a session or loading', () => {
    allowed.withArgs('enrichUfpd').returns(false);
    expect(provider.init(config, {})).to.be.true;
    clock.tick(0);
    expect(utils.generateUUID.notCalled).to.be.true;
    expect(loadExternalScriptStub.notCalled).to.be.true;
  });

  it('does not enrich an older auction when resumed connect synchronously replaces its generation', () => {
    provider.init(config, {});
    clock.tick(0);
    allowed.withArgs('accessDevice').returns(false);
    completeLoad();
    wnd['panxo_activity-session'] = {
      connect: () => {
        loadAndPreload({ params: { siteId: 'bbbbbbbbbbbbbbbb' } });
        onImplMessage({ type: 'signal', data: signal() });
      }
    };
    allowed.withArgs('accessDevice').returns(true);
    const result = auction();
    expect(result.done.calledOnce).to.be.true;
    expect(result.req.ortb2Fragments.global).to.deep.equal({});
    expect(loadExternalScriptStub.callCount).to.equal(2);
  });

  it('does not deliver an old signal when a publisher activity rule synchronously replaces the connection', () => {
    provider.init(config, {});
    clock.tick(0);
    completeLoad();
    const oldCallback = callbacks[0];
    let replace = true;
    allowed.callsFake(() => {
      if (replace) {
        replace = false;
        loadAndPreload({ params: { siteId: 'bbbbbbbbbbbbbbbb' } });
      }
      return true;
    });
    oldCallback({ type: 'signal', data: signal() });
    const result = auction();
    expect(result.req.ortb2Fragments.global).to.deep.equal({});
    expect(result.done.notCalled).to.be.true;
    expect(loadExternalScriptStub.callCount).to.equal(2);
  });

  it('does not deliver an old signal when an activity rule replaces the bridge in the same generation', () => {
    provider.init(config, {});
    clock.tick(0);
    completeLoad();
    const oldCallback = callbacks[0];
    let replace = true;
    allowed.callsFake(() => {
      if (replace) {
        replace = false;
        onImplLoaded();
      }
      return true;
    });
    oldCallback({ type: 'signal', data: signal() });
    const result = auction();
    expect(result.req.ortb2Fragments.global).to.deep.equal({});
    expect(result.done.notCalled).to.be.true;
    callbacks[1]({ type: 'signal', data: signal() });
    expect(result.done.calledOnce).to.be.true;
    expect(result.req.ortb2Fragments.global.site.ext.data.panxo.ai).to.equal(true);
    expect(connect.callCount).to.equal(2);
    expect(loadExternalScriptStub.calledOnce).to.be.true;
  });

  [3, 4].forEach(replaceOnCheck => {
    it(`rejects an old signal when the final activity check ${replaceOnCheck} replaces its bridge`, () => {
      provider.init(config, {});
      clock.tick(0);
      completeLoad();
      const oldCallback = callbacks[0];
      let checks = 0;
      allowed.callsFake(() => {
        if (++checks === replaceOnCheck) onImplLoaded();
        return true;
      });

      oldCallback({ type: 'signal', data: signal() });
      const result = auction();
      expect(result.req.ortb2Fragments.global).to.deep.equal({});
      expect(result.done.notCalled).to.be.true;
      callbacks[1]({ type: 'signal', data: signal() });
      expect(result.done.calledOnce).to.be.true;
      expect(result.req.ortb2Fragments.global.site.ext.data.panxo.ai).to.equal(true);
      expect(connect.callCount).to.equal(2);
      expect(loadExternalScriptStub.calledOnce).to.be.true;
    });

    it(`preserves a replacement signal when the final connect-error activity check ${replaceOnCheck} replaces its bridge`, () => {
      let firstConnect = true;
      let checks = 0;
      connect = sandbox.spy((facade, callback) => {
        callbacks.push(callback);
        if (firstConnect) {
          firstConnect = false;
          allowed.callsFake(() => {
            if (++checks === replaceOnCheck) onImplLoaded();
            return true;
          });
          throw new Error('initial implementation failed');
        }
        callback({ type: 'signal', data: signal() });
      });
      wnd['panxo_activity-session'] = { connect };
      provider.init(config, {});
      clock.tick(0);
      completeLoad();

      callbacks[0]({ type: 'signal', data: { site: {} } });
      const result = auction();
      expect(result.done.calledOnce).to.be.true;
      expect(result.req.ortb2Fragments.global.site.ext.data.panxo.ai).to.equal(true);
      expect(connect.callCount).to.equal(2);
      expect(loadExternalScriptStub.calledOnce).to.be.true;
    });
  });

  it('never revives an explicitly deleted provider when permission is later granted', () => {
    allowed.withArgs('accessDevice').returns(false);
    provider.init(config, {});
    clock.tick(0);
    provider.onDataDeletionRequest();
    allowed.withArgs('accessDevice').returns(true);
    expect(auction().done.calledOnce).to.be.true;
    expect(loadExternalScriptStub.notCalled).to.be.true;
  });
});

describe('LAB02 QA RTD initial configuration task', function () {
  let sandbox;
  let clock;
  let provider;
  let inserted;
  let removeRules;
  let wnd;
  let session = 0;
  const config = { params: { siteId: 'a1b2c3d4e5f67890' } };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers();
    inserted = [];
    removeRules = [];
    wnd = {};
    sandbox.stub(utils, 'getWindowSelf').returns(wnd);
    sandbox.stub(utils, 'generateUUID').callsFake(() => {
      const id = `initial-task-${++session}`;
      wnd[`panxo_${id}`] = { connect: (facade, callback) => callback({ type: 'signal', data: { site: { ai: true } } }) };
      return id;
    });
    sandbox.stub(utils, 'insertElement').callsFake(tag => inserted.push(tag));
    loadExternalScriptStub.callsFake(loadExternalScript);
    ['accessDevice', 'enrichUfpd', 'loadExternalScript'].forEach(activity => {
      removeRules.push(activityRules.registerActivityControl(activity, 'LAB02 initial task allow', () => ({ allow: true }), 0));
    });
    const registration = sandbox.stub(hook, 'submodule');
    main();
    provider = registration.lastCall.args[1];
  });

  afterEach(() => {
    provider.onDataDeletionRequest();
    removeRules.forEach(remove => remove());
    sandbox.restore();
  });

  function auction() {
    const req = request();
    const done = sandbox.spy();
    provider.getBidRequestData(req, done, config, {}, 50);
    return { req, done };
  }

  ['accessDevice', 'enrichUfpd', 'loadExternalScript'].forEach(activity => {
    it(`honors ${activity} registered after init in the same configuration task`, () => {
      expect(provider.init(config, {})).to.be.true;
      expect(inserted).to.have.length(0);
      const remove = activityRules.registerActivityControl(activity, 'LAB02 late configuration', params => {
        if (params.componentType === 'rtd' && params.componentName === 'panxo') return { allow: false };
      }, -1);
      removeRules.push(remove);
      clock.tick(0);
      expect(inserted).to.have.length(0);
      expect(auction().done.calledOnce).to.be.true;
      remove();
      const next = auction();
      expect(inserted).to.have.length(1);
      inserted[0].onload();
      expect(next.done.calledOnce).to.be.true;
      expect(next.req.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal({ ai: true });
    });
  });

  it('preloads after the initial task without waiting for an auction', () => {
    expect(provider.init(config, {})).to.be.true;
    expect(utils.generateUUID.notCalled).to.be.true;
    expect(inserted).to.have.length(0);
    clock.tick(0);
    expect(inserted).to.have.length(1);
    inserted[0].onload();
    expect(auction().done.calledOnce).to.be.true;
  });

  it('cancels the initial preload when deletion happens before the task runs', () => {
    provider.init(config, {});
    provider.onDataDeletionRequest();
    clock.tick(0);
    expect(utils.generateUUID.notCalled).to.be.true;
    expect(inserted).to.have.length(0);
    expect(auction().done.calledOnce).to.be.true;
  });

  it('preloads only the newest configuration when reinitialized before the task runs', () => {
    provider.init(config, {});
    provider.init({ params: { siteId: 'bbbbbbbbbbbbbbbb' } }, {});
    expect(inserted).to.have.length(0);
    clock.tick(0);
    expect(inserted).to.have.length(1);
    expect(new URL(inserted[0].src).searchParams.get('siteId')).to.equal('bbbbbbbbbbbbbbbb');
    expect(utils.generateUUID.calledOnce).to.be.true;
  });

  it('rejects invalid configuration synchronously without scheduling a preload', () => {
    expect(provider.init({ params: { siteId: 'invalid' } }, {})).to.be.false;
    clock.tick(0);
    expect(utils.generateUUID.notCalled).to.be.true;
    expect(inserted).to.have.length(0);
  });

  it('allows an immediate auction to start loading once before the deferred preload', () => {
    provider.init(config, {});
    const pending = auction();
    expect(inserted).to.have.length(1);
    expect(pending.done.notCalled).to.be.true;
    clock.tick(0);
    expect(inserted).to.have.length(1);
    inserted[0].onload();
    expect(pending.done.calledOnce).to.be.true;
  });

  it('contains deferred and immediate loader errors and permits a later retry', () => {
    loadExternalScriptStub.callsFake(() => { throw new Error('synthetic loader failure'); });
    expect(provider.init(config, {})).to.be.true;
    expect(() => clock.tick(0)).to.not.throw();
    const failed = auction();
    expect(failed.done.calledOnce).to.be.true;
    expect(failed.req.ortb2Fragments.global).to.deep.equal({});
    loadExternalScriptStub.callsFake(loadExternalScript);
    const next = auction();
    expect(inserted).to.have.length(1);
    inserted[0].onload();
    expect(next.done.calledOnce).to.be.true;
    clock.tick(100);
    expect(failed.done.calledOnce).to.be.true;
    expect(next.done.calledOnce).to.be.true;
  });

  it('releases an already waiting auction if the deferred activity check throws', () => {
    provider.init(config, {});
    const pending = auction();
    expect(pending.done.notCalled).to.be.true;
    const fail = sandbox.stub(activityRules, 'isActivityAllowed').throws(new Error('synthetic activity error'));
    expect(() => clock.tick(0)).to.not.throw();
    expect(pending.done.calledOnce).to.be.true;
    expect(pending.req.ortb2Fragments.global).to.deep.equal({});
    fail.restore();
    clock.tick(100);
    expect(pending.done.calledOnce).to.be.true;
  });

  it('does not clear a replacement generation when the old deferred loader throws', () => {
    let pending;
    let first = true;
    loadExternalScriptStub.callsFake((...args) => {
      if (first) {
        first = false;
        provider.init({ params: { siteId: 'bbbbbbbbbbbbbbbb' } }, {});
        pending = auction();
        throw new Error('synthetic old loader failure');
      }
      return loadExternalScript(...args);
    });
    expect(provider.init(config, {})).to.be.true;
    expect(() => clock.tick(0)).to.not.throw();
    expect(pending.done.notCalled).to.be.true;
    expect(inserted).to.have.length(1);
    inserted[0].onload();
    expect(pending.done.calledOnce).to.be.true;
    expect(pending.req.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal({ ai: true });
  });
});

describe('Panxo RTD isolated external reviewer mode', function () {
  let sandbox;
  let clock;
  let provider;
  let wnd;
  let sequence;
  let allowed;
  const ordinary = { params: { siteId: 'a1b2c3d4e5f67890' } };
  const review = { params: { siteId: '0000000000000001', test: true } };
  const reviewUrl = 'https://panxo-prebid-reviewer-external.okpbidgx.workers.dev/rtd.js';
  const sites = [
    '0000000000000001', '0000000000000002', '0000000000000003',
    '0000000000000004', '0000000000000005', '0000000000000006'
  ];

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = initialTaskClock = sandbox.useFakeTimers();
    wnd = {};
    sequence = 0;
    sandbox.stub(utils, 'getWindowSelf').returns(wnd);
    sandbox.stub(utils, 'generateUUID').callsFake(() => `review-session-${++sequence}`);
    allowed = sandbox.stub(activityRules, 'isActivityAllowed').returns(true);
    loadExternalScriptStub.callsFake(() => document.createElement('script'));
    const registration = sandbox.stub(hook, 'submodule');
    main();
    provider = registration.lastCall.args[1];
  });

  afterEach(() => {
    provider.onDataDeletionRequest();
    sandbox.restore();
  });

  function start(config) {
    expect(provider.init(config, {})).to.be.true;
    clock.tick(0);
    const call = loadExternalScriptStub.lastCall;
    const url = new URL(call.args[0]);
    const callbacks = [];
    const connect = sandbox.spy((api, callback) => callbacks.push(callback));
    wnd[`panxo_${url.searchParams.get('session')}`] = { connect };
    return { url, callbacks, connect, finish: call.args[3] };
  }

  function auction() {
    const req = request();
    const done = sandbox.spy();
    provider.getBidRequestData(req, done, review, {}, 100);
    return { req, done };
  }

  sites.forEach(siteId => {
    it(`uses the static isolated URL for reserved site ${siteId} with explicit test mode`, () => {
      const config = { params: { siteId, test: true } };
      const before = JSON.stringify(config);
      const active = start(config);
      expect(`${active.url.origin}${active.url.pathname}`).to.equal(reviewUrl);
      expect([...active.url.searchParams.entries()]).to.deep.equal([
        ['siteId', siteId], ['session', 'review-session-1']
      ]);
      expect(loadExternalScriptStub.lastCall.args[5]).to.deep.equal({
        crossorigin: 'anonymous', referrerpolicy: 'no-referrer'
      });
      expect(JSON.stringify(config)).to.equal(before);
    });
  });

  [undefined, false].forEach(test => {
    it(`rejects all reserved site identifiers without explicit test true (${test})`, () => {
      sites.forEach(siteId => expect(provider.init({ params: { siteId, test } }, {})).to.be.false);
      clock.tick(0);
      expect(loadExternalScriptStub.notCalled).to.be.true;
    });
  });

  ['true', 1, 0, null, {}, []].forEach(test => {
    it(`rejects a non-boolean test parameter (${JSON.stringify(test)})`, () => {
      expect(provider.init({ params: { siteId: review.params.siteId, test } }, {})).to.be.false;
      clock.tick(0);
      expect(loadExternalScriptStub.notCalled).to.be.true;
    });
  });

  it('rejects test mode with an ordinary site without falling back to either endpoint', () => {
    expect(provider.init({ params: { siteId: ordinary.params.siteId, test: true } }, {})).to.be.false;
    clock.tick(0);
    expect(auction().done.calledOnce).to.be.true;
    expect(loadExternalScriptStub.notCalled).to.be.true;
  });

  [undefined, false].forEach(test => {
    it(`preserves the commercial URL for ordinary sites with test=${test}`, () => {
      const active = start({ params: { siteId: ordinary.params.siteId, test } });
      expect(`${active.url.origin}${active.url.pathname}`).to.equal(SCRIPT_URL);
    });
  });

  it('does not let an old commercial load or signal connect to a reviewer generation', () => {
    const old = start(ordinary);
    old.finish();
    const active = start(review);
    old.finish();
    expect(active.connect.notCalled).to.be.true;
    active.finish();
    const pending = auction();
    old.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    expect(pending.done.notCalled).to.be.true;
    active.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    expect(pending.done.calledOnce).to.be.true;
    expect(pending.req.ortb2Fragments.global.site.ext.data.panxo).to.deep.equal({ ai: true });
  });

  it('does not retain a reviewer signal when returning to an ordinary site', () => {
    const old = start(review);
    old.finish();
    old.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    const active = start(ordinary);
    active.finish();
    const pending = auction();
    expect(pending.done.notCalled).to.be.true;
    old.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    expect(pending.done.notCalled).to.be.true;
    active.callbacks[0]({ type: 'signal', data: { site: {} } });
    expect(pending.done.calledOnce).to.be.true;
    expect(pending.req.ortb2Fragments.global).to.deep.equal({});
  });

  it('retires an old connection if a reviewer configuration is rejected', () => {
    const old = start(ordinary);
    old.finish();
    const pending = auction();
    expect(provider.init({ params: { siteId: review.params.siteId } }, {})).to.be.false;
    expect(pending.done.calledOnce).to.be.true;
    old.callbacks[0]({ type: 'signal', data: { site: { ai: true } } });
    const next = auction();
    expect(next.done.calledOnce).to.be.true;
    expect(next.req.ortb2Fragments.global).to.deep.equal({});
    clock.tick(0);
    expect(loadExternalScriptStub.callCount).to.equal(1);
  });

  it('retains activity denial in reviewer mode and loads only its endpoint after permission resumes', () => {
    allowed.withArgs('accessDevice').returns(false);
    expect(provider.init(review, {})).to.be.true;
    clock.tick(0);
    expect(loadExternalScriptStub.notCalled).to.be.true;
    expect(auction().done.calledOnce).to.be.true;
    allowed.withArgs('accessDevice').returns(true);
    auction();
    expect(new URL(loadExternalScriptStub.lastCall.args[0]).origin).to.equal(new URL(reviewUrl).origin);
    expect(loadExternalScriptStub.callCount).to.equal(1);
  });

  it('retries a failed reviewer load only against the reviewer endpoint', () => {
    loadExternalScriptStub.callsFake(() => { throw new Error('synthetic reviewer loader failure'); });
    expect(provider.init(review, {})).to.be.true;
    clock.tick(0);
    expect(auction().done.calledOnce).to.be.true;
    loadExternalScriptStub.callsFake(() => document.createElement('script'));
    auction();
    expect(loadExternalScriptStub.callCount).to.equal(3);
    loadExternalScriptStub.getCalls().forEach(call => {
      const url = new URL(call.args[0]);
      expect(`${url.origin}${url.pathname}`).to.equal(reviewUrl);
    });
  });
});
