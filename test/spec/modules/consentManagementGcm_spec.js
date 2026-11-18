import {
  consentConfig,
  currentConsent,
  enrichFPDHook,
  foldConsent,
  gdprApplies,
  refreshConsentHook,
  resetConsentData,
  setConsentConfig,
  watchDataLayer,
} from 'modules/consentManagementGcm.js';
import { allConsent, gcmDataHandler, gdprDataHandler, gppDataHandler } from 'src/consentHandler.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { PbPromise } from 'src/utils/promise.js';
import 'src/prebid.js';

describe('consentManagementGcm', () => {
  let sandbox, originalDataLayer, hadDataLayer;

  function gtag() {
    (window.dataLayer = window.dataLayer || []).push(arguments);
  }

  function cmd(command, params) {
    return { command, params };
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    hadDataLayer = Object.prototype.hasOwnProperty.call(window, 'dataLayer');
    originalDataLayer = window.dataLayer;
    delete window.dataLayer;
    resetConsentData();
  });

  afterEach(() => {
    resetConsentData();
    config.resetConfig();
    gdprDataHandler.reset();
    gppDataHandler.reset();
    sandbox.restore();
    if (hadDataLayer) {
      window.dataLayer = originalDataLayer;
    } else {
      delete window.dataLayer;
    }
  });

  describe('foldConsent', () => {
    it('returns no state when there are no commands', () => {
      expect(foldConsent([])).to.eql({ state: null, updated: false, waitForUpdate: null, regionsIgnored: false });
    });

    it('folds defaults and updates in order, later ones winning', () => {
      const { state, updated } = foldConsent([
        cmd('default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied' }),
        cmd('update', { ad_storage: 'granted' }),
        cmd('update', { ad_storage: 'denied', analytics_storage: 'granted' }),
      ]);
      expect(updated).to.be.true;
      expect(state).to.eql({ ad_storage: 'denied', analytics_storage: 'granted', ad_user_data: 'denied' });
    });

    it('lets a later default override an earlier default, but not an update', () => {
      const { state } = foldConsent([
        cmd('default', { ad_storage: 'granted', ad_personalization: 'granted' }),
        cmd('update', { ad_personalization: 'denied' }),
        cmd('default', { ad_storage: 'denied', ad_personalization: 'granted' }),
      ]);
      expect(state).to.eql({ ad_storage: 'denied', ad_personalization: 'denied' });
    });

    it('keeps only granted/denied values, passing unknown signals through', () => {
      const { state } = foldConsent([
        cmd('default', { ad_storage: 'denied', wait_for_update: 500, region: undefined, functionality_storage: 'granted', other: 'yes', num: 1 }),
      ]);
      expect(state).to.eql({ ad_storage: 'denied', functionality_storage: 'granted' });
    });

    it('returns no state when commands set no signal', () => {
      expect(foldConsent([cmd('default', { wait_for_update: 500 })]).state).to.be.null;
    });

    it('reports the longest wait_for_update', () => {
      expect(foldConsent([
        cmd('default', { ad_storage: 'denied', wait_for_update: 300 }),
        cmd('default', { analytics_storage: 'denied', wait_for_update: 100 }),
        cmd('default', { analytics_storage: 'denied', wait_for_update: 'bad' }),
      ]).waitForUpdate).to.equal(300);
    });

    describe('region-scoped defaults, when GDPR does not apply', () => {
      const commands = [
        cmd('default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted' }),
        cmd('default', { ad_storage: 'denied', analytics_storage: 'denied', region: ['US'] }),
        cmd('default', { ad_storage: 'granted', region: ['US-CA', 'US-CO'] }),
        cmd('default', { ad_user_data: 'denied', region: ['DE', 'FR'] }),
      ];

      it('are ignored without a visitor region', () => {
        expect(foldConsent(commands)).to.eql({
          state: { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted' },
          updated: false,
          waitForUpdate: null,
          regionsIgnored: true
        });
      });

      Object.entries({
        'US-CA': { ad_storage: 'granted', analytics_storage: 'denied', ad_user_data: 'granted' },
        'us-ca': { ad_storage: 'granted', analytics_storage: 'denied', ad_user_data: 'granted' },
        'US-NY': { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'granted' },
        'US': { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'granted' },
        'FR': { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'denied' },
        'GB': { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted' },
      }).forEach(([region, expected]) => {
        it(`apply by most specific match for region '${region}'`, () => {
          const result = foldConsent(commands, { region });
          expect(result.state).to.eql(expected);
          expect(result.regionsIgnored).to.be.false;
        });
      });

      it('accept a single region as a string', () => {
        expect(foldConsent([cmd('default', { ad_storage: 'denied', region: 'de' })], { region: 'DE' }).state).to.eql({ ad_storage: 'denied' });
      });

      it('let the later default win among equally specific matches', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'denied', region: ['US'] }),
          cmd('default', { ad_storage: 'granted', region: ['US'] }),
        ], { region: 'US-TX' }).state).to.eql({ ad_storage: 'granted' });
      });

      it('are overridden by updates', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'denied', region: ['US'] }),
          cmd('update', { ad_storage: 'granted' }),
        ], { region: 'US' }).state).to.eql({ ad_storage: 'granted' });
      });
    });

    describe('region-scoped defaults, when GDPR applies', () => {
      it('all apply, the most restrictive winning', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'granted', analytics_storage: 'denied', ad_user_data: 'granted' }),
          cmd('default', { ad_storage: 'denied', region: ['DE'] }),
          cmd('default', { analytics_storage: 'granted', ad_personalization: 'granted', region: ['US'] }),
          cmd('default', { ad_personalization: 'denied', region: ['FR'] }),
        ], { gdpr: true }).state).to.eql({
          ad_storage: 'denied',
          analytics_storage: 'denied',
          ad_user_data: 'granted',
          ad_personalization: 'denied'
        });
      });

      it('apply regardless of the configured region', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'granted' }),
          cmd('default', { ad_storage: 'denied', region: ['DE'] }),
        ], { gdpr: true, region: 'US' }).state).to.eql({ ad_storage: 'denied' });
      });

      it('are overridden by updates', () => {
        const result = foldConsent([
          cmd('default', { ad_storage: 'denied', region: ['DE'] }),
          cmd('update', { ad_storage: 'granted' }),
        ], { gdpr: true });
        expect(result.state).to.eql({ ad_storage: 'granted' });
        expect(result.regionsIgnored).to.be.false;
      });
    });
  });

  describe('gdprApplies', () => {
    it('is false without TCF or GPP data', () => {
      expect(gdprApplies()).to.be.false;
    });

    it('follows TCF gdprApplies', () => {
      gdprDataHandler.enable();
      gdprDataHandler.setConsentData({ gdprApplies: false });
      expect(gdprApplies()).to.be.false;
      gdprDataHandler.setConsentData({ gdprApplies: true });
      expect(gdprApplies()).to.be.true;
    });

    it('is true when GPP applicable sections include EU TCF', () => {
      gppDataHandler.enable();
      gppDataHandler.setConsentData({ applicableSections: [7] });
      expect(gdprApplies()).to.be.false;
      gppDataHandler.setConsentData({ applicableSections: [7, 2] });
      expect(gdprApplies()).to.be.true;
    });
  });

  describe('dataLayer', () => {
    function state() {
      return currentConsent().state;
    }

    it('creates window.dataLayer if missing, and sees later gtag calls', () => {
      watchDataLayer();
      expect(window.dataLayer).to.eql([]);
      gtag('consent', 'default', { ad_storage: 'denied' });
      expect(state()).to.eql({ ad_storage: 'denied' });
      expect(window.dataLayer.length).to.equal(1);
    });

    it('reads entries already there, in order', () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied' });
      gtag('js', new Date());
      gtag('consent', 'update', { ad_storage: 'granted' });
      watchDataLayer();
      expect(state()).to.eql({ ad_storage: 'granted', analytics_storage: 'denied' });
    });

    it('accepts plain arrays, and ignores entries that are not consent commands', () => {
      window.dataLayer = [
        ['consent', 'default', { ad_storage: 'denied' }],
        { event: 'gtm.js' },
        ['consent', 'other', { ad_storage: 'granted' }],
        ['consent', 'update', 'ad_storage'],
        ['config', 'G-XYZ', { ad_storage: 'granted' }],
        null,
        'consent'
      ];
      watchDataLayer();
      expect(state()).to.eql({ ad_storage: 'denied' });
    });

    it('wraps push, keeping its behaviour and return value', () => {
      window.dataLayer = [];
      const original = window.dataLayer.push;
      watchDataLayer();
      expect(window.dataLayer.push).to.not.equal(original);
      expect(window.dataLayer.push({ event: 'a' }, ['consent', 'update', { ad_storage: 'granted' }])).to.equal(2);
      expect(window.dataLayer.length).to.equal(2);
      expect(state()).to.eql({ ad_storage: 'granted' });
    });

    it('does not throw from push if processing an entry fails', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      sandbox.stub(utils, 'logError');
      const entry = ['consent', 'update', {}];
      Object.defineProperty(entry[2], 'ad_storage', { enumerable: true, get() { throw new Error('boom'); } });
      expect(() => window.dataLayer.push(entry)).to.not.throw();
      sinon.assert.called(utils.logError);
    });

    it('keeps working when GTM wraps push after Prebid', () => {
      window.dataLayer = [];
      watchDataLayer();
      const gtmSeen = [];
      const prev = window.dataLayer.push;
      window.dataLayer.push = function () {
        const result = prev.apply(window.dataLayer, arguments);
        gtmSeen.push(...arguments);
        return result;
      };
      gtag('consent', 'default', { ad_storage: 'denied' });
      expect(gtmSeen.length).to.equal(1);
      expect(state()).to.eql({ ad_storage: 'denied' });
    });

    it('keeps working when GTM wrapped push before Prebid', () => {
      window.dataLayer = [];
      const gtmSeen = [];
      const prev = window.dataLayer.push;
      window.dataLayer.push = function () {
        gtmSeen.push(...arguments);
        return prev.apply(window.dataLayer, arguments);
      };
      watchDataLayer();
      gtag('consent', 'default', { ad_storage: 'denied' });
      expect(gtmSeen.length).to.equal(1);
      expect(window.dataLayer.length).to.equal(1);
      expect(state()).to.eql({ ad_storage: 'denied' });
    });

    it('does not wrap push twice', () => {
      watchDataLayer();
      const wrapper = window.dataLayer.push;
      watchDataLayer();
      expect(window.dataLayer.push).to.equal(wrapper);
    });

    it('follows a replaced dataLayer, without reading entries twice', () => {
      watchDataLayer();
      gtag('consent', 'default', { ad_storage: 'denied' });
      gtag('consent', 'update', { ad_storage: 'granted' });
      const old = window.dataLayer;
      window.dataLayer = [old[0], ['consent', 'update', { analytics_storage: 'denied' }]];
      watchDataLayer();
      expect(state()).to.eql({ ad_storage: 'granted', analytics_storage: 'denied' });
      gtag('consent', 'update', { ad_storage: 'denied' });
      expect(state()).to.eql({ ad_storage: 'denied', analytics_storage: 'denied' });
    });

    it('leaves a non-array dataLayer alone', () => {
      sandbox.stub(utils, 'logWarn');
      window.dataLayer = { push() {} };
      const push = window.dataLayer.push;
      watchDataLayer();
      expect(window.dataLayer.push).to.equal(push);
      sinon.assert.calledOnce(utils.logWarn);
    });

    it('restores the original push on reset', () => {
      window.dataLayer = [];
      const original = window.dataLayer.push;
      watchDataLayer();
      resetConsentData();
      expect(window.dataLayer.push).to.equal(original);
    });
  });

  describe('setConsentConfig', () => {
    let clock;
    beforeEach(() => {
      clock = sandbox.useFakeTimers();
      sandbox.stub(utils, 'logWarn');
      sandbox.stub(utils, 'logInfo');
    });

    async function configure(cmConfig) {
      const result = setConsentConfig(cmConfig);
      await clock.tickAsync(cmConfig.gcm.timeout ?? 500);
      return result;
    }

    function settled(promise) {
      let done = false;
      promise.then(() => { done = true; });
      return () => done;
    }

    it('does nothing without gcm config', async () => {
      await setConsentConfig({});
      expect(consentConfig.loadConsentData).to.be.undefined;
      expect(gcmDataHandler.getConsentData()).to.be.null;
    });

    it('defaults to reading the dataLayer, with a 500ms timeout', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      expect(consentConfig.cmpHandler).to.equal('dataLayer');
      expect(consentConfig.cmpTimeout).to.equal(500);
    });

    it('resolves at once when there is an update', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', wait_for_update: 500 });
      gtag('consent', 'update', { ad_storage: 'granted' });
      const done = settled(setConsentConfig({ gcm: {} }));
      await clock.tickAsync(0);
      expect(done()).to.be.true;
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted', ad_user_data: 'denied' });
    });

    it('waits up to the timeout for an update when there is only a default', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied' });
      const done = settled(setConsentConfig({ gcm: { timeout: 300 } }));
      await clock.tickAsync(299);
      expect(done()).to.be.false;
      await clock.tickAsync(1);
      expect(done()).to.be.true;
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
    });

    it('waits no longer than wait_for_update, if shorter than the timeout', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', wait_for_update: 100 });
      const done = settled(setConsentConfig({ gcm: { timeout: 300 } }));
      await clock.tickAsync(99);
      expect(done()).to.be.false;
      await clock.tickAsync(1);
      expect(done()).to.be.true;
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
    });

    it('waits no longer than the timeout, if shorter than wait_for_update', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', wait_for_update: 1000 });
      const done = settled(setConsentConfig({ gcm: { timeout: 300 } }));
      await clock.tickAsync(300);
      expect(done()).to.be.true;
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
    });

    it('resolves as soon as an update is pushed while waiting', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', wait_for_update: 1000 });
      const done = settled(setConsentConfig({ gcm: { timeout: 2000 } }));
      await clock.tickAsync(50);
      expect(done()).to.be.false;
      gtag('consent', 'update', { ad_storage: 'granted' });
      await clock.tickAsync(0);
      expect(done()).to.be.true;
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
    });

    it('waits for a default that is pushed later', async () => {
      const done = settled(setConsentConfig({ gcm: { timeout: 300 } }));
      await clock.tickAsync(100);
      gtag('consent', 'default', { ad_storage: 'denied', wait_for_update: 50 });
      await clock.tickAsync(49);
      expect(done()).to.be.false;
      await clock.tickAsync(1);
      expect(done()).to.be.true;
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
    });

    describe('defaultWhenAbsent', () => {
      it('gives no GCM signal when null (the default)', async () => {
        const done = settled(setConsentConfig({ gcm: { timeout: 100 } }));
        await clock.tickAsync(100);
        expect(done()).to.be.true;
        expect(gcmDataHandler.getConsentData()).to.be.null;
      });

      it('denies every signal when "denied"', async () => {
        setConsentConfig({ gcm: { timeout: 100, defaultWhenAbsent: 'denied' } });
        await clock.tickAsync(100);
        expect(gcmDataHandler.getConsentData()).to.eql({
          ad_storage: 'denied',
          analytics_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied'
        });
      });

      it('does not apply once the page sets Consent Mode', async () => {
        gtag('consent', 'update', { ad_storage: 'granted' });
        await setConsentConfig({ gcm: { defaultWhenAbsent: 'denied' } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
      });

      it('warns on, and ignores, other values', async () => {
        setConsentConfig({ gcm: { timeout: 100, defaultWhenAbsent: 'granted' } });
        await clock.tickAsync(100);
        expect(gcmDataHandler.getConsentData()).to.be.null;
        sinon.assert.calledWith(utils.logWarn, sinon.match(/defaultWhenAbsent/));
      });
    });

    it('updates consent data on later updates', async () => {
      gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      const listener = sinon.stub();
      gcmDataHandler.onChange(listener);
      gtag('consent', 'update', { analytics_storage: 'denied' });
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted', analytics_storage: 'denied' });
      sinon.assert.calledWith(listener, { ad_storage: 'granted', analytics_storage: 'denied' });
    });

    it('accepts static consent data, keeping only signals', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({
        gcm: { cmpApi: 'static', consentData: { ad_storage: 'denied', ad_user_data: 'granted', wait_for_update: 500 } }
      });
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied', ad_user_data: 'granted' });
      gtag('consent', 'update', { ad_storage: 'granted' });
      refreshConsentHook(() => null, {});
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied', ad_user_data: 'granted' });
    });

    it('can be disabled', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      expect(gcmDataHandler.getConsentData()).to.exist;
      await setConsentConfig({ gcm: { enabled: false } });
      expect(gcmDataHandler.getConsentData()).to.be.null;
    });

    it('is part of allConsent', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      expect(allConsent.getConsentData().gcm).to.eql({ ad_storage: 'granted' });
      expect(allConsent.getConsentMeta().gcm).to.have.property('generatedAt');
    });

    describe('region-scoped defaults', () => {
      beforeEach(() => {
        window.dataLayer = [];
        gtag('consent', 'default', { ad_storage: 'granted' });
        gtag('consent', 'default', { ad_storage: 'denied', region: ['DE', 'US-CA'] });
      });

      it('are ignored, with a single warning, without a region when GDPR does not apply', async () => {
        await configure({ gcm: { timeout: 0 } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
        currentConsent();
        refreshConsentHook(() => null, {});
        expect(utils.logWarn.getCalls().filter(call => /region-scoped/.test(call.args[0])).length).to.equal(1);
      });

      it('apply by the configured region when GDPR does not apply', async () => {
        await configure({ gcm: { timeout: 0, region: 'US-CA' } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
      });

      it('warns on, and ignores, a region that is not a string', async () => {
        await configure({ gcm: { timeout: 0, region: ['US-CA'] } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
        sinon.assert.calledWith(utils.logWarn, sinon.match(/region must be a string/));
      });

      Object.entries({
        TCF: () => {
          gdprDataHandler.enable();
          gdprDataHandler.setConsentData({ gdprApplies: true });
        },
        GPP: () => {
          gppDataHandler.enable();
          gppDataHandler.setConsentData({ applicableSections: [2] });
        }
      }).forEach(([framework, applyGdpr]) => {
        it(`apply as most restrictive when ${framework} says GDPR applies`, async () => {
          applyGdpr();
          await configure({ gcm: { timeout: 0, region: 'GB' } });
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
        });

        it(`are refolded before the auction when ${framework} resolves after GCM`, async () => {
          await configure({ gcm: { timeout: 0 } });
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
          applyGdpr();
          const next = sinon.stub();
          refreshConsentHook(next, { bidsBackHandler: 'x' });
          sinon.assert.calledWith(next, { bidsBackHandler: 'x' });
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
        });
      });
    });

    it('waits for GCM in the requestBids hook', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied' });
      setConsentConfig({ gcm: { timeout: 200 } });
      const next = sinon.stub();
      consentConfig.requestBidsHook(next, {});
      await clock.tickAsync(100);
      sinon.assert.notCalled(next);
      gtag('consent', 'update', { ad_storage: 'granted' });
      await clock.tickAsync(0);
      sinon.assert.calledOnce(next);
    });
  });

  describe('regs.ext.gcm', () => {
    function enrich() {
      return enrichFPDHook((fpd) => fpd, PbPromise.resolve({ regs: { ext: { gpc: '1' } } }));
    }

    it('is the folded state, without call options', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500, region: ['DE'] });
      gtag('consent', 'default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });
      gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
      await setConsentConfig({ gcm: {} });
      const ortb2 = await enrich();
      expect(ortb2.regs.ext).to.eql({
        gpc: '1',
        gcm: { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' }
      });
    });

    it('omits signals never set', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      expect((await enrich()).regs.ext.gcm).to.eql({ ad_storage: 'granted' });
    });

    it('is a copy of the consent data', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      const ortb2 = await enrich();
      ortb2.regs.ext.gcm.ad_storage = 'denied';
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
    });

    it('is absent when the page has no Consent Mode', async () => {
      sandbox.stub(utils, 'logWarn');
      await setConsentConfig({ gcm: { timeout: 0 } });
      expect((await enrich()).regs.ext).to.eql({ gpc: '1' });
    });

    it('is absent when the module is not configured', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      expect((await enrich()).regs.ext).to.eql({ gpc: '1' });
    });
  });
});
