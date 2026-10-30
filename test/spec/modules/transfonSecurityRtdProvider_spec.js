import { expect } from 'chai';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import { registerActivityControl } from 'src/activities/rules.js';
import adapterManager from 'src/adapterManager.js';
import { ACTIVITY_ACCESS_DEVICE, ACTIVITY_ACCESS_REQUEST_CREDENTIALS, ACTIVITY_REPORT_ANALYTICS, ACTIVITY_TRANSMIT_EIDS } from 'src/activities/activities.js';
import { config as pbjsConfig } from 'src/config.js';
import { allConsent } from 'src/consentHandler.js';
import { getHook } from 'src/hook.js';
import { startAuction } from 'src/prebid.js';
import { newMetrics } from 'src/utils/perfMetrics.js';
import * as rtdModule from 'modules/rtdModule/index.js';
import {
  dropBlockedRequests,
  enforceBlock,
  noteBlockedCall,
  markStarted,
  getTssQs,
  reset,
  shouldBlock,
  transfonSecuritySubmodule as submodule
} from '../../../modules/transfonSecurityRtdProvider.js';

const LICENSE = 'abcdef1234';
const RTD_TAG_URL = 'https://tag.waf360.com/tag/p/rtd.js';
const config = (params = {}) => ({ name: 'transfonSecurity', params: { licenseId: LICENSE, ...params } });
const awaited = (params = {}) => ({ ...config(params), waitForIt: true });
const clearUidCookie = () => { document.cookie = '__unis_uid=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'; };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function reqBids() {
  return {
    adUnits: [
      { code: 'div-1', bids: [{ bidder: 'appnexus' }, { bidder: 'rubicon' }] },
      { code: 'div-2', bids: [{ bidder: 'appnexus' }] }
    ],
    ortb2Fragments: { global: {}, bidder: {} }
  };
}

// rtd.js is configured, and the page checked, from the first auction on
const start = (cfg = config()) => {
  const ok = submodule.init(cfg);
  submodule.getBidRequestData(reqBids(), () => {}, cfg, {}, 0);
  return ok;
};

const auction = (cfg, auctionDelay = 0) => {
  const req = reqBids();
  return new Promise((resolve) => submodule.getBidRequestData(req, resolve, cfg, {}, auctionDelay)).then(() => req);
};

describe('transfonSecurityRtdProvider', () => {
  let sandbox, rtd;

  function rtdTag(response) {
    rtd = {
      init: sinon.spy(),
      check: sinon.spy((key, cb) => { if (response !== undefined) cb(response); }),
      report: sinon.spy()
    };
    window._waf360rtd = rtd;
  }

  beforeEach(() => {
    allConsent.reset();
    sandbox = sinon.createSandbox();
    delete window._waf360;
    delete window._waf360rtd;
    reset();
  });

  after(() => {
    // the module's startAuction hooks must not run during other specs' auctions
    const startAuctionHook = getHook('startAuction');
    startAuctionHook.getHooks({ hook: markStarted }).remove();
    startAuctionHook.getHooks({ hook: enforceBlock }).remove();
    adapterManager.makeBidRequests.getHooks({ hook: noteBlockedCall }).remove();
    adapterManager.makeBidRequests.getHooks({ hook: dropBlockedRequests }).remove();
  });

  afterEach(() => {
    clearUidCookie();
    allConsent.reset();
    pbjsConfig.resetConfig();
    sandbox.restore();
    delete window._waf360;
    delete window._waf360rtd;
    reset();
  });

  describe('init', () => {
    it('declares the module name and gvlid', () => {
      expect(submodule.name).to.equal('transfonSecurity');
      expect(submodule.gvlid).to.equal(1370);
    });

    it('fails without a valid licenseId', () => {
      [undefined, '12345', 'abcdef123', 'abcdef12345', 'ABCDEF1234', 'abcdef123g'].forEach((licenseId) => {
        expect(submodule.init({ params: { licenseId } })).to.equal(false);
      });
      expect(loadExternalScriptStub.called).to.equal(false);
    });

    it('accepts a licenseId with surrounding spaces', () => {
      rtdTag({ qs: true });
      expect(submodule.init(config({ licenseId: ' abcdef1234 ' }))).to.equal(true);
    });

    it('loads the Prebid tag and passes the license and storage consent', async () => {
      start(config());
      await flush();
      expect(loadExternalScriptStub.calledOnce).to.equal(true);
      expect(loadExternalScriptStub.firstCall.args.slice(0, 3)).to.deep.equal([RTD_TAG_URL, 'rtd', 'transfonSecurity']);
      const [name, key, options] = window._waf360rtd.q[0];
      expect(key).to.be.a('string');
      expect(name).to.equal('init');
      expect(options).to.include({ license: LICENSE, storage: true });
      expect(options.uid).to.be.a('string').and.not.equal('');
    });

    it('does not load the Prebid tag again when another Prebid.js bundle has loaded it', async () => {
      rtdTag({ qs: true });
      start(config());
      await flush();
      expect(loadExternalScriptStub.called).to.equal(false);
      expect(rtd.init.calledOnce).to.equal(true);
    });

    it('does not load the Prebid tag again while another bundle is loading it', async () => {
      const script = document.createElement('script');
      script.type = 'text/plain';
      script.src = RTD_TAG_URL;
      document.head.appendChild(script);
      try {
        start(config());
        await flush();
        expect(loadExternalScriptStub.called).to.equal(false);
        // nothing is handed to the script before it has loaded
        expect(window._waf360rtd).to.equal(undefined);
        script.dispatchEvent(new Event('load'));
        await flush();
        expect(window._waf360rtd.q.map(([name]) => name)).to.deep.equal(['init', 'check']);
      } finally {
        script.remove();
      }
    });

    it('passes storage false when device access is not allowed', async () => {
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow: false } : undefined);
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1]).to.include({ storage: false, uid: null });
      } finally {
        unregister();
      }
    });

    it('queues calls until the Prebid tag loads', async () => {
      start(config());
      await flush();
      expect(window._waf360rtd.q.map(([name]) => name)).to.deep.equal(['init', 'check']);
    });

    it('keeps the visitor id in a first party cookie through the storage manager', async () => {
      document.cookie = '__unis_uid=existing-id; path=/';
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1].uid).to.equal('existing-id');
      } finally {
        clearUidCookie();
      }
    });

    it('creates the visitor cookie when it is missing', async () => {
      clearUidCookie();
      rtdTag({ qs: true });
      start(config());
      await flush();
      const uid = rtd.init.firstCall.args[1].uid;
      expect(document.cookie).to.include(`__unis_uid=${uid}`);
    });

    it('does not read or write the visitor cookie without device access', async () => {
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow: false } : undefined);
      try {
        clearUidCookie();
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1].uid).to.equal(null);
        expect(document.cookie).to.not.include('__unis_uid=');
      } finally {
        unregister();
      }
    });

    it('does not read or send the visitor id when transmitEids is denied', async () => {
      const unregister = registerActivityControl(ACTIVITY_TRANSMIT_EIDS, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow: false } : undefined);
      try {
        clearUidCookie();
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1]).to.include({ storage: true, report: true, uid: null });
        expect(document.cookie).to.not.include('__unis_uid=');
      } finally {
        unregister();
      }
    });

    it('replaces a visitor cookie that cannot be decoded', async () => {
      document.cookie = '__unis_uid=%E0%A4%A; path=/';
      rtdTag({ qs: true });
      start(config());
      await flush();
      const uid = rtd.init.firstCall.args[1].uid;
      expect(uid).to.match(/^[0-9a-f-]{36}$/);
      expect(document.cookie).to.include(`__unis_uid=${uid}`);
    });

    it('sends no visitor id when cookies throw', async () => {
      Object.defineProperty(document, 'cookie', { configurable: true, get: () => { throw new DOMException('denied', 'SecurityError'); }, set: () => { throw new DOMException('denied', 'SecurityError'); } });
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1]).to.include({ storage: true, uid: null });
        expect(rtd.check.called).to.equal(true);
      } finally {
        delete document.cookie;
      }
    });

    it('does not read or send the visitor id without measurement consent', async () => {
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow: false } : undefined);
      try {
        clearUidCookie();
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1]).to.include({ storage: true, uid: null });
        expect(document.cookie).to.not.include('__unis_uid=');
      } finally {
        unregister();
      }
    });

    it('reconfigures the Prebid tag at the next auction when only measurement consent changes', async () => {
      let measure = true;
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow: measure } : undefined);
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1].uid).to.be.a('string').and.not.equal('');
        measure = false;
        await auction(awaited(), 300);
        expect(rtd.init.secondCall.args[1]).to.deep.equal({ license: LICENSE, storage: true, report: false, uid: null });
        measure = true;
        await auction(awaited(), 300);
        expect(rtd.init.thirdCall.args[1].uid).to.be.a('string').and.not.equal('');
      } finally {
        unregister();
      }
    });

    it('keeps each Prebid.js bundle apart with its own key', async () => {
      rtdTag({ qs: true });
      start(config());
      await flush();
      const key = rtd.init.firstCall.args[0];
      expect(key).to.be.a('string');
      expect(rtd.check.firstCall.args[0]).to.equal(key);
      await auction(awaited(), 300);
      expect(rtd.report.firstCall.args[0]).to.equal(key);
      reset();
      start(config());
      await flush();
      expect(rtd.init.secondCall.args[0]).to.not.equal(key);
    });

    it('sends storage false when credentialed requests are not allowed', async () => {
      const unregister = registerActivityControl(ACTIVITY_ACCESS_REQUEST_CREDENTIALS, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow: false } : undefined);
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1]).to.include({ storage: false, uid: null });
      } finally {
        unregister();
      }
    });

    it('does not store anything when COPPA applies', async () => {
      const getConsentData = allConsent.getConsentData;
      sandbox.stub(allConsent, 'getConsentData').callsFake(() => ({ ...getConsentData(), coppa: true }));
      clearUidCookie();
      rtdTag({ qs: true });
      start(config());
      await flush();
      expect(rtd.init.firstCall.args[1]).to.include({ storage: false, uid: null });
      expect(document.cookie).to.not.include('__unis_uid=');
    });

    it('passes the measurement decision to the Prebid tag', async () => {
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow: false } : undefined);
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1]).to.include({ report: false });
      } finally {
        unregister();
      }
    });

    it('replaces its queued configuration while the Prebid tag is still loading', async () => {
      let allow = true;
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow } : undefined);
      try {
        start(config());
        await flush();
        expect(window._waf360rtd.q.map(([name]) => name)).to.deep.equal(['init', 'check']);
        allow = false;
        submodule.getBidRequestData(reqBids(), () => {}, config(), {}, 0);
        const q = window._waf360rtd.q;
        expect(q.map(([name]) => name)).to.deep.equal(['init', 'check']);
        expect(q[0][2]).to.include({ storage: false, uid: null });
      } finally {
        unregister();
      }
    });

    it('retries the configuration after the Prebid tag failed to take it', async () => {
      let fail = false;
      rtdTag({ qs: true });
      const init = rtd.init;
      rtd.init = sinon.spy((...args) => {
        if (fail) {
          throw new Error('init');
        }
        return init(...args);
      });
      let allow = true;
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow } : undefined);
      try {
        start(config());
        await flush();
        fail = true;
        allow = false;
        await auction(awaited(), 300);
        const attempts = rtd.init.callCount;
        expect(attempts).to.be.greaterThan(1);
        fail = false;
        await auction(awaited(), 300);
        expect(rtd.init.callCount).to.be.greaterThan(attempts);
        expect(rtd.init.lastCall.args[1]).to.include({ storage: false });
        // accepted now, so no further reconfiguration
        const settled = rtd.init.callCount;
        await auction(awaited(), 300);
        expect(rtd.init.callCount).to.equal(settled);
      } finally {
        unregister();
      }
    });

    it('skips the report while the Prebid tag has not taken the current decisions', async () => {
      let allow = true;
      let answer;
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow } : undefined);
      try {
        rtd = { init: sinon.spy(), check: (key, cb) => { answer = cb; }, report: sinon.spy() };
        window._waf360rtd = rtd;
        start(config());
        await flush();
        rtd.init = sinon.spy(() => { throw new Error('init'); });
        allow = false;
        answer({ qs: true });
        await flush();
        expect(rtd.init.called).to.equal(true);
        expect(rtd.report.called).to.equal(false);
      } finally {
        unregister();
      }
    });

    it('loads the Prebid tag only after Prebid has processed the setup', async () => {
      submodule.init(config());
      expect(loadExternalScriptStub.called).to.equal(false);
      await flush();
      expect(loadExternalScriptStub.calledOnce).to.equal(true);
    });

    it('requests the verdict only once the Prebid tag has taken a configuration', async () => {
      rtdTag({ qs: true });
      const init = rtd.init;
      let fail = true;
      rtd.init = sinon.spy((...args) => {
        if (fail) {
          throw new Error('init');
        }
        return init(...args);
      });
      submodule.init(config({ timeout: 10 }));
      await flush();
      expect(rtd.check.called).to.equal(false);
      const first = await auction(awaited(), 300);
      expect(first.ortb2Fragments.global).to.deep.equal({});
      fail = false;
      await auction(awaited(), 300);
      expect(rtd.check.calledOnce).to.equal(true);
    });

    it('configures the Prebid tag from the rules in force when it has loaded', async () => {
      const script = document.createElement('script');
      script.type = 'text/plain';
      script.src = RTD_TAG_URL;
      document.head.appendChild(script);
      let allow = true;
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow } : undefined);
      try {
        start(config());
        await flush();
        allow = false;
        script.dispatchEvent(new Event('load'));
        await flush();
        const [name, , options] = window._waf360rtd.q[0];
        expect(name).to.equal('init');
        expect(options).to.include({ storage: false, uid: null });
      } finally {
        unregister();
        script.remove();
      }
    });

    it('drops the visitor id when only its own cookie is denied', async () => {
      let allow = true;
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' && params.storageKey === '__unis_uid' ? { allow } : undefined);
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1].uid).to.be.a('string').and.not.equal('');
        allow = false;
        await auction(awaited(), 300);
        expect(rtd.init.secondCall.args[1]).to.include({ storage: true, uid: null });
      } finally {
        unregister();
      }
    });

    describe('when the Prebid tag cannot be loaded', () => {
      async function timeAuction() {
        submodule.init(config({ timeout: 1000 }));
        await flush();
        const started = Date.now();
        const req = await auction(awaited(), 500);
        return { req, elapsed: Date.now() - started };
      }

      it('fails open at once when loading is denied', async () => {
        loadExternalScriptStub.callsFake(() => undefined);
        const { req, elapsed } = await timeAuction();
        expect(elapsed).to.be.below(200);
        expect(req.ortb2Fragments.global).to.deep.equal({});
        expect(req.adUnits[0].bids).to.have.length(2);
      });

      it('fails open at once when loading throws', async () => {
        loadExternalScriptStub.callsFake(() => {
          throw new TypeError('This document requires TrustedScriptURL assignment');
        });
        const { req, elapsed } = await timeAuction();
        expect(elapsed).to.be.below(200);
        expect(req.ortb2Fragments.global).to.deep.equal({});
      });

      it('fails open at once when loading fails', async () => {
        loadExternalScriptStub.callsFake((url, type, code, callback) => {
          callback.error(new Error('blocked'));
          return document.createElement('script');
        });
        const { req, elapsed } = await timeAuction();
        expect(elapsed).to.be.below(200);
        expect(req.ortb2Fragments.global).to.deep.equal({});
      });

      it('fails open at once when another bundle has already failed to load it', async () => {
        const script = document.createElement('script');
        script.type = 'text/plain';
        script.src = RTD_TAG_URL;
        script.setAttribute('data-transfon-security-failed', '');
        document.head.appendChild(script);
        try {
          const { req, elapsed } = await timeAuction();
          expect(elapsed).to.be.below(200);
          expect(req.ortb2Fragments.global).to.deep.equal({});
        } finally {
          script.remove();
        }
      });

      it('fails open while another bundle is still loading it, and uses it once loaded', async () => {
        const script = document.createElement('script');
        script.type = 'text/plain';
        script.src = RTD_TAG_URL;
        document.head.appendChild(script);
        try {
          submodule.init(config({ timeout: 30 }));
          await wait(60);
          const started = Date.now();
          const first = await auction(awaited({ timeout: 30 }), 500);
          expect(Date.now() - started).to.be.below(200);
          expect(first.ortb2Fragments.global).to.deep.equal({});
          rtdTag({ qs: false });
          script.dispatchEvent(new Event('load'));
          const second = await auction(awaited({ timeout: 30 }), 500);
          expect(second.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(0);
        } finally {
          script.remove();
        }
      });

      it('fails open while its own load is slow, and uses the script once loaded', async () => {
        let loaded;
        loadExternalScriptStub.callsFake((url, type, code, callback) => {
          loaded = callback;
          return document.createElement('script');
        });
        submodule.init(config({ timeout: 30 }));
        await wait(60);
        const started = Date.now();
        const first = await auction(awaited({ timeout: 30 }), 500);
        expect(Date.now() - started).to.be.below(200);
        expect(first.ortb2Fragments.global).to.deep.equal({});
        rtdTag({ qs: false });
        loaded();
        const second = await auction(awaited({ timeout: 30 }), 500);
        expect(second.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(0);
      });

      it('marks the script when its own load fails, even synchronously', async () => {
        const script = document.createElement('script');
        loadExternalScriptStub.callsFake((url, type, code, callback) => {
          callback.error(new Error('blocked'));
          return script;
        });
        await timeAuction();
        expect(script.hasAttribute('data-transfon-security-failed')).to.equal(true);
      });

      it('fails open at once when another bundle fails to load it', async () => {
        const script = document.createElement('script');
        script.type = 'text/plain';
        script.src = RTD_TAG_URL;
        document.head.appendChild(script);
        try {
          submodule.init(config({ timeout: 1000 }));
          await flush();
          script.dispatchEvent(new Event('error'));
          await flush();
          const started = Date.now();
          const req = await auction(awaited(), 500);
          expect(Date.now() - started).to.be.below(200);
          expect(req.ortb2Fragments.global).to.deep.equal({});
        } finally {
          script.remove();
        }
      });
    });

    it('configures the Prebid tag and checks the page only from the first auction', async () => {
      rtdTag({ qs: true });
      submodule.init(config());
      await flush();
      expect(rtd.init.called).to.equal(false);
      expect(rtd.check.called).to.equal(false);
      await auction(awaited(), 300);
      expect(rtd.init.calledOnce).to.equal(true);
      expect(rtd.check.calledOnce).to.equal(true);
      expect(rtd.check.calledAfter(rtd.init)).to.equal(true);
    });

    it('updates storage consent at the next auction', async () => {
      let allow = true;
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow } : undefined);
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1].storage).to.equal(true);
        allow = false;
        await auction(awaited(), 300);
        expect(rtd.init.secondCall.args[1]).to.deep.equal({ license: LICENSE, storage: false, report: true, uid: null });
      } finally {
        unregister();
      }
    });

    it('uses the Transfon Security tag already on the page instead of loading one', async () => {
      window._waf360 = { check: (cb) => cb({ qs: false }), send: sinon.spy() };
      submodule.init(config());
      await flush();
      expect(loadExternalScriptStub.called).to.equal(false);
      expect(submodule.getTargetingData(['div-1'])).to.deep.equal({ 'div-1': { tss_qs: '0' } });
    });
  });

  describe('getBidRequestData', () => {
    it('adds tss_qs = 1 for valid traffic and keeps bids', async () => {
      rtdTag({ qs: true });
      submodule.init(config({ blockIvt: true }));
      await flush();
      const req = await auction(config({ blockIvt: true }));
      expect(req.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(1);
      expect(req.adUnits[0].bids).to.have.length(2);
    });

    it('adds tss_qs = 0 and keeps bids when blockIvt is off', async () => {
      rtdTag({ qs: false });
      submodule.init(config());
      await flush();
      const req = await auction(config());
      expect(req.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(0);
      expect(req.adUnits[0].bids).to.have.length(2);
    });

    it('removes all bid requests for invalid traffic when blockIvt is on but keeps the ad units', async () => {
      rtdTag({ qs: false });
      submodule.init(config({ blockIvt: true }));
      await flush();
      const req = await auction(config({ blockIvt: true }));
      expect(req.adUnits.map((u) => u.code)).to.deep.equal(['div-1', 'div-2']);
      expect(req.adUnits.every((u) => u.bids.length === 0)).to.equal(true);
    });

    it('drops ortb2Imp from blocked ad units so nothing goes to Prebid Server', async () => {
      rtdTag({ qs: false });
      submodule.init(config({ blockIvt: true }));
      await flush();
      const req = reqBids();
      const adUnits = req.adUnits;
      adUnits.push({ code: 'div-s2s', ortb2Imp: { ext: { prebid: { storedrequest: { id: '1' } } } } });
      await new Promise((resolve) => submodule.getBidRequestData(req, resolve, config({ blockIvt: true })));
      expect(req.adUnits[2]).to.deep.equal({ code: 'div-s2s', bids: [] });
      expect(adUnits[0].bids).to.have.length(2);
      expect(adUnits[2].ortb2Imp).to.exist;
      expect(adUnits[2].bids).to.equal(undefined);
    });

    it('installs startAuction hooks right after RTD and after every other hook', () => {
      rtdTag({ qs: true });
      submodule.init(config());
      const started = getHook('startAuction').getHooks({ hook: markStarted });
      const enforce = getHook('startAuction').getHooks({ hook: enforceBlock });
      expect(started.length).to.equal(1);
      expect(started[0].priority).to.equal(19);
      expect(enforce.length).to.equal(1);
      expect(enforce[0].priority).to.equal(1);
    });

    it('sends storage false when only reads of the session cookie are denied', async () => {
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' && params.storageKey === '_pqs' && params.write === false ? { allow: false } : undefined);
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1].storage).to.equal(false);
      } finally {
        unregister();
      }
    });

    it('reconfigures the Prebid tag before skipping a report that is no longer allowed', async () => {
      let allow = true;
      let answer;
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow } : undefined);
      try {
        rtd = { init: sinon.spy(), check: (key, cb) => { answer = cb; }, report: sinon.spy() };
        window._waf360rtd = rtd;
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1].uid).to.be.a('string').and.not.equal('');
        allow = false;
        answer({ qs: true });
        await flush();
        expect(rtd.report.called).to.equal(false);
        expect(rtd.init.secondCall.args[1]).to.include({ storage: true, uid: null });
      } finally {
        unregister();
      }
    });

    it('sends storage false when the session cookie is denied by a scoped rule', async () => {
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' && params.storageKey === '_pqs' ? { allow: false } : undefined);
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1].storage).to.equal(false);
      } finally {
        unregister();
      }
    });

    it('reconfigures the Prebid tag before an auction when the activity rules changed', async () => {
      let allow = true;
      const unregister = registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow } : undefined);
      try {
        rtdTag({ qs: true });
        start(config());
        await flush();
        expect(rtd.init.firstCall.args[1].storage).to.equal(true);
        allow = false;
        await auction(awaited(), 300);
        expect(rtd.init.secondCall.args[1]).to.deep.equal({ license: LICENSE, storage: false, report: true, uid: null });
      } finally {
        unregister();
      }
    });

    it('records that the verdict reached the auction without touching its id', async () => {
      rtdTag({ qs: false });
      submodule.init(config());
      await flush();
      const req = reqBids();
      req.adUnitCodes = ['div-1'];
      await new Promise((resolve) => submodule.getBidRequestData(req, resolve, awaited(), {}, 300));
      enforceBlock(() => {}, req);
      expect(req.auctionId).to.equal(undefined);
      expect(submodule.getTargetingData(req.adUnitCodes, config(), {}, { adUnitCodes: req.adUnitCodes, timestamp: 0 })).to.deep.equal({
        'div-1': { tss_qs: '0' }
      });
    });

    it('keeps the record per auction when publishers reuse an auctionId', async () => {
      let answer;
      rtd = { init: sinon.spy(), check: (key, cb) => { answer = cb; }, report: sinon.spy() };
      window._waf360rtd = rtd;
      submodule.init(config());
      await flush();
      const missed = reqBids();
      missed.auctionId = 'same';
      missed.adUnitCodes = ['div-1'];
      const missedDone = new Promise((resolve) => submodule.getBidRequestData(missed, resolve, awaited(), {}, 10));
      markStarted(() => {}, missed);
      await flush();
      answer({ qs: false });
      await missedDone;
      enforceBlock(() => {}, missed);
      const reached = reqBids();
      reached.auctionId = 'same';
      reached.adUnitCodes = ['div-1'];
      await new Promise((resolve) => submodule.getBidRequestData(reached, resolve, awaited(), {}, 10));
      enforceBlock(() => {}, reached);
      expect(submodule.getTargetingData(missed.adUnitCodes, config(), {}, { auctionId: 'same', adUnitCodes: missed.adUnitCodes })).to.deep.equal({});
      expect(submodule.getTargetingData(reached.adUnitCodes, config(), {}, { auctionId: 'same', adUnitCodes: reached.adUnitCodes })).to.deep.equal({
        'div-1': { tss_qs: '0' }
      });
    });

    it('sets no targeting for an auction the verdict missed, whatever its start time', async () => {
      let answer;
      rtd = { init: sinon.spy(), check: (key, cb) => { answer = cb; }, report: sinon.spy() };
      window._waf360rtd = rtd;
      submodule.init(config());
      await flush();
      const req = reqBids();
      req.adUnitCodes = ['div-1'];
      const pending = new Promise((resolve) => submodule.getBidRequestData(req, resolve, awaited(), {}, 10));
      markStarted(() => {}, req);
      await flush();
      answer({ qs: false });
      await pending;
      enforceBlock(() => {}, req);
      expect(submodule.getTargetingData(req.adUnitCodes, config(), {}, { adUnitCodes: req.adUnitCodes, timestamp: Date.now() + 1000 })).to.deep.equal({});
    });

    it('blocks again after another provider rebuilds the ad units', async () => {
      rtdTag({ qs: false });
      submodule.init(config({ blockIvt: true }));
      await flush();
      const req = await auction(config({ blockIvt: true }));
      // another provider settles later and adds ortb2Imp back, or drops empty ad units
      req.adUnits[0].ortb2Imp = { ext: { data: { other: 1 } } };
      req.adUnits = req.adUnits.slice(1);
      const next = sinon.spy();
      enforceBlock(next, req);
      expect(next.calledOnceWith(req)).to.equal(true);
      expect(req.adUnits).to.deep.equal([{ code: 'div-1', bids: [] }, { code: 'div-2', bids: [] }]);
    });

    it('leaves requests it did not block to the next hook unchanged', () => {
      const req = reqBids();
      const adUnits = req.adUnits;
      const next = sinon.spy();
      enforceBlock(next, req);
      expect(next.calledOnceWith(req)).to.equal(true);
      expect(req.adUnits).to.equal(adUnits);
    });

    it('keeps banner sizes given only in ortb2Imp when blocking', async () => {
      rtdTag({ qs: false });
      submodule.init(config({ blockIvt: true }));
      await flush();
      const req = reqBids();
      req.adUnits = [{ code: 'div-3', mediaTypes: { banner: {} }, ortb2Imp: { banner: { format: [{ w: 300, h: 250 }] } }, bids: [{ bidder: 'appnexus' }] }];
      await new Promise((resolve) => submodule.getBidRequestData(req, resolve, awaited({ blockIvt: true }), {}, 300));
      expect(req.adUnits[0]).to.deep.equal({ code: 'div-3', mediaTypes: { banner: { format: [{ w: 300, h: 250 }] } }, bids: [] });
    });

    // runs makeBidRequests' before and after hooks for one request, as core would
    function bidderRequestsFor(req, built = [{ bidderCode: 'appnexus' }]) {
      let result;
      noteBlockedCall(() => {}, req.adUnits, 0, req.auctionId, 1000, [], req.ortb2Fragments, null);
      dropBlockedRequests((value) => { result = value; }, built);
      return result;
    }

    it('drops every bidder request of a blocked request, even ones a beforeRequestBids handler adds back', async () => {
      rtdTag({ qs: false });
      submodule.init(config({ blockIvt: true }));
      await flush();
      const req = await auction(awaited({ blockIvt: true }), 300);
      enforceBlock(() => {}, req);
      expect(bidderRequestsFor(req, [{ bidderCode: 'appnexus' }, { bidderCode: null, src: 's2s' }])).to.deep.equal([]);
      expect(bidderRequestsFor(reqBids())).to.deep.equal([{ bidderCode: 'appnexus' }]);
    });

    it('does not confuse concurrent requests that share a publisher auctionId', async () => {
      let answer;
      rtd = { init: sinon.spy(), check: (key, cb) => { answer = cb; }, report: sinon.spy() };
      window._waf360rtd = rtd;
      submodule.init(config({ blockIvt: true }));
      await flush();
      const late = { ...reqBids(), auctionId: 'same' };
      const lateDone = new Promise((resolve) => submodule.getBidRequestData(late, resolve, awaited({ blockIvt: true }), {}, 10));
      markStarted(() => {}, late);
      const onTime = { ...reqBids(), auctionId: 'same' };
      const onTimeDone = new Promise((resolve) => submodule.getBidRequestData(onTime, resolve, awaited({ blockIvt: true }), {}, 300));
      await flush();
      answer({ qs: false });
      await Promise.all([lateDone, onTimeDone]);
      enforceBlock(() => {}, late);
      enforceBlock(() => {}, onTime);
      expect(bidderRequestsFor(onTime)).to.deep.equal([]);
      expect(bidderRequestsFor(late)).to.deep.equal([{ bidderCode: 'appnexus' }]);
    });

    it('leaves the auction id alone when it blocks', async () => {
      rtdTag({ qs: false });
      submodule.init(config({ blockIvt: true }));
      await flush();
      const req = reqBids();
      await new Promise((resolve) => submodule.getBidRequestData(req, resolve, awaited({ blockIvt: true }), {}, 300));
      enforceBlock(() => {}, req);
      expect(req.auctionId).to.equal(undefined);
    });

    it('removes bids when the block rules match but keeps tss_qs = 1', async () => {
      rtdTag({ qs: true, block: true });
      submodule.init(config({ blockIvt: true }));
      await flush();
      const req = await auction(config({ blockIvt: true }));
      expect(req.adUnits.every((u) => u.bids.length === 0)).to.equal(true);
      expect(req.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(1);
    });

    it('fails open when the Prebid tag throws', async () => {
      window._waf360rtd = { init: () => { throw new Error('init'); }, check: () => { throw new Error('check'); }, report: sinon.spy() };
      submodule.init(config({ blockIvt: true, timeout: 10 }));
      const req = await auction(awaited({ blockIvt: true }), 300);
      expect(req.ortb2Fragments.global).to.deep.equal({});
      expect(req.adUnits[0].bids).to.have.length(2);
    });

    it('still lets the auction continue when reporting throws', async () => {
      rtdTag({ qs: true });
      rtd.report = () => { throw new Error('report'); };
      submodule.init(config());
      await flush();
      const req = await auction(awaited(), 300);
      expect(req.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(1);
    });

    it('treats any truthy waitForIt as waiting, like the RTD core', async () => {
      rtdTag({ qs: false });
      submodule.init(config());
      const req = await auction({ ...config(), waitForIt: 1 }, 300);
      expect(req.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(0);
    });

    it('fails open when no verdict arrives in time', async () => {
      rtdTag();
      submodule.init(config({ blockIvt: true, timeout: 10 }));
      const req = await auction(config({ blockIvt: true }));
      expect(req.ortb2Fragments.global).to.deep.equal({});
      expect(req.adUnits[0].bids).to.have.length(2);
    });

    it('ignores a response without a verdict', async () => {
      rtdTag({ block: false });
      submodule.init(config());
      const req = await auction(config());
      expect(req.ortb2Fragments.global).to.deep.equal({});
    });
  });

  describe('getTargetingData', () => {
    it('returns nothing before the verdict', () => {
      expect(submodule.getTargetingData(['div-1'])).to.deep.equal({});
    });

    it('sets tss_qs per ad unit', async () => {
      rtdTag({ qs: false });
      start(config());
      await flush();
      expect(submodule.getTargetingData(['div-1', 'div-2'])).to.deep.equal({
        'div-1': { tss_qs: '0' },
        'div-2': { tss_qs: '0' }
      });
    });

    it('sets tss_qs for an auction that started after the verdict', async () => {
      rtdTag({ qs: false });
      start(config());
      await flush();
      expect(submodule.getTargetingData(['div-1'], config(), {}, { timestamp: Date.now() + 1 })).to.deep.equal({
        'div-1': { tss_qs: '0' }
      });
    });

    it('sets nothing for an auction that started before the verdict', async () => {
      rtdTag({ qs: false });
      submodule.init(config());
      await flush();
      expect(submodule.getTargetingData(['div-1'], config(), {}, { timestamp: Date.now() - 1000 })).to.deep.equal({});
    });
  });

  describe('reporting', () => {
    it('reports the first auction once', async () => {
      rtdTag({ qs: false });
      submodule.init(config({ blockIvt: true }));
      await flush();
      await auction(awaited({ blockIvt: true }));
      await auction(awaited({ blockIvt: true }));
      await wait(40);
      expect(rtd.report.calledOnce).to.equal(true);
      expect(rtd.report.firstCall.args[1]).to.include({ src: 'prebid', pa: '1', vs: 'ok', qs: '0', bv: '1', bi: '1', ad: '0' });
    });

    it('marks a verdict that arrives after auctionDelay as late', async () => {
      let answer;
      rtd = { init: sinon.spy(), check: (key, cb) => { answer = cb; }, report: sinon.spy() };
      window._waf360rtd = rtd;
      submodule.init(config({ blockIvt: true }));
      await flush();
      const req = reqBids();
      const pending = new Promise((resolve) => submodule.getBidRequestData(req, resolve, awaited({ blockIvt: true }), {}, 10));
      // the RTD hook moves on without the verdict
      markStarted(() => {}, req);
      await flush();
      answer({ qs: false });
      await pending;
      expect(rtd.report.firstCall.args[1]).to.include({ vs: 'late', qs: '', bi: '0', ad: '10' });
      expect(req.ortb2Fragments.global).to.deep.equal({});
      expect(req.adUnits[0].bids).to.have.length(2);
    });

    it('marks a verdict that is not awaited as late once the RTD hook has moved on', async () => {
      let answer;
      rtd = { init: sinon.spy(), check: (key, cb) => { answer = cb; }, report: sinon.spy() };
      window._waf360rtd = rtd;
      submodule.init(config());
      await flush();
      const req = reqBids();
      const pending = new Promise((resolve) => submodule.getBidRequestData(req, resolve, config(), {}, 0));
      markStarted(() => {}, req);
      await flush();
      answer({ qs: true });
      await pending;
      expect(rtd.report.firstCall.args[1]).to.include({ vs: 'late', qs: '' });
      expect(req.ortb2Fragments.global).to.deep.equal({});
    });

    it('applies a verdict that is not awaited while another provider still holds the auction', async () => {
      let answer;
      rtd = { init: sinon.spy(), check: (key, cb) => { answer = cb; }, report: sinon.spy() };
      window._waf360rtd = rtd;
      submodule.init(config());
      await flush();
      const req = reqBids();
      const pending = new Promise((resolve) => submodule.getBidRequestData(req, resolve, config(), {}, 500));
      await flush();
      answer({ qs: true });
      await pending;
      expect(rtd.report.firstCall.args[1]).to.include({ vs: 'ok', qs: '1' });
      expect(req.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(1);
    });

    it('reports an auction that stopped waiting once the page verdict settles', async () => {
      rtd = { init: sinon.spy(), check: () => {}, report: sinon.spy() };
      window._waf360rtd = rtd;
      submodule.init(config({ timeout: 50 }));
      await auction(awaited(), 500);
      await wait(80);
      const kv = rtd.report.firstCall.args[1];
      expect(kv).to.include({ vs: 'none' });
      expect(Number(kv.vt)).to.be.at.least(40);
    });

    it('reports a missing verdict as none', async () => {
      rtdTag();
      submodule.init(config({ timeout: 10 }));
      await auction(awaited());
      expect(rtd.report.firstCall.args[1]).to.include({ pa: '1', vs: 'none', qs: '' });
    });

    it('skips the report when analytics reporting is not allowed', async () => {
      const unregister = registerActivityControl(ACTIVITY_REPORT_ANALYTICS, 'test', (params) =>
        params.componentName === 'transfonSecurity' ? { allow: false } : undefined);
      try {
        rtdTag({ qs: true });
        submodule.init(config());
        await auction(awaited());
        expect(rtd.report.called).to.equal(false);
      } finally {
        unregister();
      }
    });

    describe('with a Transfon Security tag element whose script has not run', () => {
      let element;
      beforeEach(() => {
        element = document.createElement('script');
        element.id = 'waf360-tag';
        document.head.appendChild(element);
      });
      afterEach(() => element.remove());

      it('uses the tag once its script loads', async () => {
        submodule.init(config());
        await flush();
        expect(loadExternalScriptStub.called).to.equal(false);
        window._waf360 = { check: (cb) => cb({ qs: false }), send: sinon.spy() };
        element.dispatchEvent(new Event('load'));
        const req = await auction(awaited(), 300);
        expect(req.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(0);
        expect(loadExternalScriptStub.called).to.equal(false);
      });

      it('loads rtd.js when the tag fails', async () => {
        rtdTag({ qs: false });
        submodule.init(config());
        await flush();
        element.dispatchEvent(new Event('error'));
        const req = await auction(awaited(), 300);
        expect(rtd.init.called).to.equal(true);
        expect(req.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(0);
      });

      it('loads rtd.js when the tag never provides a verdict API', async () => {
        rtdTag({ qs: true });
        submodule.init(config({ timeout: 30 }));
        const req = await auction(awaited(), 300);
        expect(rtd.init.called).to.equal(true);
        expect(req.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(1);
      });
    });

    it('sends an auction event through the Transfon Security tag on the page', async () => {
      window._waf360 = { check: (cb) => cb({ qs: true }), send: sinon.spy() };
      submodule.init(config());
      await flush();
      await auction(awaited());
      expect(window._waf360.send.firstCall.args[0]).to.equal('auction');
      expect(window._waf360.send.firstCall.args[1]).to.include({ src: 'prebid', pa: '1', vs: 'ok', qs: '1' });
    });

    it('queues the auction event in the format the Transfon Security tag replays', async () => {
      const check = sinon.spy((cb) => cb({ qs: true }));
      window._waf360 = { check };
      submodule.init(config());
      await flush();
      await auction(awaited(), 300);
      expect(window._waf360.q).to.have.length(1);
      const [event, kv] = window._waf360.q[0];
      expect(event).to.equal('auction');
      expect(kv).to.include({ src: 'prebid', pa: '1', vs: 'ok', qs: '1' });
    });

    it('sends nothing through the Transfon Security tag without an auction', async () => {
      window._waf360 = { check: (cb) => cb({ qs: true }), send: sinon.spy() };
      submodule.init(config());
      await wait(40);
      expect(window._waf360.send.called).to.equal(false);
    });
  });

  describe('helpers', () => {
    it('getTssQs and shouldBlock', () => {
      expect(getTssQs({ qs: true })).to.equal(1);
      expect(getTssQs({ qs: false })).to.equal(0);
      expect(getTssQs({ qs: true, block: true })).to.equal(1);
      expect(getTssQs(null)).to.equal(1);
      expect(shouldBlock({ qs: true, block: true })).to.equal(true);
      expect(shouldBlock({ qs: false })).to.equal(true);
      expect(shouldBlock({ qs: true })).to.equal(false);
      expect(shouldBlock(null)).to.equal(false);
    });
  });
  describe('with the RTD core and a real startAuction', () => {
    let captured, capture;

    beforeEach(() => {
      captured = null;
      capture = (next, req) => { captured = req; };
      getHook('startAuction').before(capture, 0);
    });

    afterEach(() => {
      getHook('startAuction').getHooks({ hook: capture }).remove();
      getHook('startAuction').getHooks({ hook: rtdModule.setBidRequestsData }).remove();
    });

    function setUp(auctionDelay, response) {
      let answer;
      rtd = { init: sinon.spy(), check: (key, cb) => { answer = cb; }, report: sinon.spy() };
      window._waf360rtd = rtd;
      rtdModule.init(pbjsConfig);
      pbjsConfig.setConfig({ realTimeData: { auctionDelay, dataProviders: [awaited({ blockIvt: true })] } });
      return () => answer(response);
    }

    function run() {
      const req = { ...reqBids(), adUnitCodes: ['div-1', 'div-2'], metrics: newMetrics() };
      startAuction(req);
      return req;
    }

    it('applies a verdict that arrives within auctionDelay', async () => {
      const answer = setUp(500, { qs: false });
      await flush();
      run();
      await flush();
      answer();
      await wait(20);
      expect(captured).to.exist;
      expect(captured.ortb2Fragments.global.site.ext.data.tss_qs).to.equal(0);
      expect(captured.adUnits.every((u) => u.bids.length === 0)).to.equal(true);
    });

    it('leaves the auction alone when the verdict misses auctionDelay', async () => {
      const answer = setUp(20, { qs: false });
      await flush();
      run();
      await wait(60);
      expect(captured).to.exist;
      answer();
      await wait(20);
      // other modules may enrich the request; only this module's signal matters here
      expect(captured.ortb2Fragments.global.site?.ext?.data?.tss_qs).to.equal(undefined);
      expect(captured.adUnits[0].bids).to.have.length(2);
      expect(rtd.report.firstCall.args[1]).to.include({ vs: 'late', bi: '0' });
    });
  });
});
