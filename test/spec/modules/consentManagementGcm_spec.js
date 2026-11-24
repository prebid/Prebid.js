import {
  consentConfig,
  currentConsent,
  enrichFPDHook,
  foldConsent,
  refreshConsentHook,
  resetConsentData,
  setConsentConfig,
  watchDataLayer,
} from 'modules/consentManagementGcm.js';
import { allConsent, gcmDataHandler } from 'src/consentHandler.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { PbPromise } from 'src/utils/promise.js';
import { getHook } from 'src/hook.js';
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
    sandbox.restore();
    if (hadDataLayer) {
      window.dataLayer = originalDataLayer;
    } else {
      delete window.dataLayer;
    }
  });

  describe('foldConsent', () => {
    it('returns no state when there are no commands', () => {
      expect(foldConsent([])).to.eql({ state: null, covered: false, waitForUpdate: null, regionAmbiguous: false });
    });

    it('folds defaults and updates in order, later ones winning', () => {
      const { state } = foldConsent([
        cmd('default', { ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied' }),
        cmd('update', { ad_storage: 'granted' }),
        cmd('update', { ad_storage: 'denied', analytics_storage: 'granted' }),
      ]);
      expect(state).to.eql({ ad_storage: 'denied', analytics_storage: 'granted', ad_user_data: 'denied' });
    });

    describe('covered', () => {
      Object.entries({
        'is false without an update': [false, [
          cmd('default', { ad_storage: 'granted' }),
        ]],
        'is true with an update and no default': [true, [
          cmd('update', { ad_storage: 'denied' }),
        ]],
        'is false while a signal the defaults deny has no update': [false, [
          cmd('default', { ad_storage: 'denied', ad_user_data: 'denied' }),
          cmd('update', { ad_storage: 'granted' }),
        ]],
        'is true once updates, together, set every signal the defaults deny': [true, [
          cmd('default', { ad_storage: 'denied', ad_user_data: 'denied', analytics_storage: 'granted' }),
          cmd('update', { ad_storage: 'granted' }),
          cmd('update', { ad_user_data: 'denied' }),
        ]],
        'does not need updates for signals the defaults grant': [true, [
          cmd('default', { ad_storage: 'denied', analytics_storage: 'granted' }),
          cmd('update', { ad_storage: 'granted' }),
        ]],
        'does not need updates for signals other than the Consent Mode v2 ones': [true, [
          cmd('default', { ad_storage: 'denied', functionality_storage: 'denied' }),
          cmd('update', { ad_storage: 'granted' }),
        ]],
        'counts a default that comes after the update': [false, [
          cmd('update', { ad_storage: 'granted' }),
          cmd('default', { ad_user_data: 'denied' }),
        ]],
        'counts region-scoped defaults when the region is unknown': [false, [
          cmd('default', { ad_storage: 'granted', ad_user_data: 'granted' }),
          cmd('default', { ad_user_data: 'denied', region: ['DE'] }),
          cmd('update', { ad_storage: 'granted' }),
        ]],
      }).forEach(([name, [expected, commands]]) => {
        it(name, () => {
          expect(foldConsent(commands).covered).to.equal(expected);
        });
      });

      it('ignores region-scoped defaults that do not match the region', () => {
        expect(foldConsent([
          cmd('default', { ad_user_data: 'denied', region: ['DE'] }),
          cmd('update', { ad_storage: 'granted' }),
        ], { region: 'US' }).covered).to.be.true;
      });
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

    describe('region-scoped defaults, with a visitor region', () => {
      const commands = [
        cmd('default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted' }),
        cmd('default', { ad_storage: 'denied', analytics_storage: 'denied', region: ['US'] }),
        cmd('default', { ad_storage: 'granted', region: ['US-CA', 'US-CO'] }),
        cmd('default', { ad_user_data: 'denied', region: ['DE', 'FR'] }),
      ];

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
          expect(result.regionAmbiguous).to.equal(region === 'US');
        });
      });

      it('accept a single region as a string', () => {
        expect(foldConsent([cmd('default', { ad_storage: 'denied', region: 'de' })], { region: 'DE' }).state).to.eql({ ad_storage: 'denied' });
      });

      it('do not match a region with spaces around it, as in gtag', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'denied' }),
          cmd('default', { ad_storage: 'granted', region: [' DE '] }),
        ], { region: 'DE' }).state).to.eql({ ad_storage: 'denied' });
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

    describe('region-scoped defaults, when the visitor region is a country', () => {
      it('deny what those for its subdivisions deny', () => {
        const result = foldConsent([
          cmd('default', { ad_storage: 'granted', ad_user_data: 'granted' }),
          cmd('default', { ad_storage: 'denied', region: ['US-CA'] }),
          cmd('default', { ad_user_data: 'denied', region: ['DE-BY'] }),
        ], { region: 'US' });
        expect(result.state).to.eql({ ad_storage: 'denied', ad_user_data: 'granted' });
        expect(result.regionAmbiguous).to.be.true;
      });

      it('deny what those for its subdivisions deny, over what the one for the country grants', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'denied', region: ['US-CA'] }),
          cmd('default', { ad_storage: 'granted', region: ['US'] }),
        ], { region: 'US' }).state).to.eql({ ad_storage: 'denied' });
      });

      it('do not grant what those for its subdivisions grant', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'denied', region: ['US'] }),
          cmd('default', { ad_storage: 'granted', ad_user_data: 'granted', region: ['US-CA'] }),
        ], { region: 'US' }).state).to.eql({ ad_storage: 'denied' });
      });

      it('are not ambiguous when none is for its subdivisions', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'denied', region: ['US', 'DE-BY', 'USA'] }),
        ], { region: 'US' }).regionAmbiguous).to.be.false;
      });
    });

    describe('region-scoped defaults, with a visitor region that is not a region code', () => {
      ['US_CA', 'USA', 'U', 'US-', 'US-CALI', '', 5, null].forEach(region => {
        it(`deny what any of them denies, for ${JSON.stringify(region)}`, () => {
          const result = foldConsent([
            cmd('default', { ad_storage: 'granted' }),
            cmd('default', { ad_storage: 'denied', region: ['US-CA'] }),
          ], { region });
          expect(result.state).to.eql({ ad_storage: 'denied' });
          expect(result.regionAmbiguous).to.be.true;
        });
      });
    });

    describe('region-scoped defaults, without a visitor region', () => {
      it('deny what any of them denies', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'granted', analytics_storage: 'denied', ad_user_data: 'granted' }),
          cmd('default', { ad_storage: 'denied', region: ['DE'] }),
          cmd('default', { analytics_storage: 'granted', ad_personalization: 'granted', region: ['US'] }),
          cmd('default', { ad_personalization: 'denied', region: ['FR'] }),
        ])).to.eql({
          state: {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'granted',
            ad_personalization: 'denied'
          },
          covered: false,
          waitForUpdate: null,
          regionAmbiguous: true
        });
      });

      it('do not grant a signal that no default without a region grants', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'granted', region: ['US'] }),
          cmd('default', { ad_storage: 'granted', ad_user_data: 'granted', region: ['CA'] }),
          cmd('default', { ad_user_data: 'denied', region: ['DE'] }),
        ]).state).to.eql({ ad_user_data: 'denied' });
      });

      it('leave no state when they only grant', () => {
        expect(foldConsent([cmd('default', { ad_storage: 'granted', region: ['US'] })])).to.eql({
          state: null,
          covered: false,
          waitForUpdate: null,
          regionAmbiguous: true
        });
      });

      it('agree with a region that matches none of them, when they only grant', () => {
        const commands = [
          cmd('default', { analytics_storage: 'granted' }),
          cmd('default', { ad_storage: 'granted', region: ['US'] }),
        ];
        expect(foldConsent(commands).state).to.eql(foldConsent(commands, { region: 'DE' }).state);
      });

      it('do not depend on the order of defaults', () => {
        expect(foldConsent([
          cmd('default', { ad_storage: 'denied', region: ['DE'] }),
          cmd('default', { ad_storage: 'granted' }),
        ]).state).to.eql({ ad_storage: 'denied' });
      });

      it('are overridden by updates', () => {
        const result = foldConsent([
          cmd('default', { ad_storage: 'denied', region: ['DE'] }),
          cmd('update', { ad_storage: 'granted' }),
        ]);
        expect(result.state).to.eql({ ad_storage: 'granted' });
        expect(result.regionAmbiguous).to.be.true;
      });

      it('are not flagged when they set no signal', () => {
        expect(foldConsent([cmd('default', { wait_for_update: 100, region: ['DE'] })]).regionAmbiguous).to.be.false;
      });
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

    it('reads commands in order when re-enabled after GTM wrapped push', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied' });
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      const wrapped = window.dataLayer.push;
      window.dataLayer.push = function () {
        return wrapped.apply(this, arguments);
      };
      await setConsentConfig({ gcm: { enabled: false } });
      gtag('consent', 'update', { ad_storage: 'denied' });
      expect(state()).to.be.null;
      await setConsentConfig({ gcm: {} });
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
      gtag('consent', 'update', { ad_storage: 'granted' });
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
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

    it('resolves at once when updates already cover what the default denies', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', wait_for_update: 500 });
      gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'denied' });
      await setConsentConfig({ gcm: {} });
      expect(clock.countTimers()).to.equal(0);
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted', ad_user_data: 'denied' });
    });

    it('keeps waiting when an update leaves out a signal the default denies', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', wait_for_update: 200 });
      gtag('consent', 'update', { ad_storage: 'granted' });
      const done = settled(setConsentConfig({ gcm: { timeout: 500 } }));
      await clock.tickAsync(100);
      expect(done()).to.be.false;
      expect(gcmDataHandler.getConsentData()).to.be.null;
      gtag('consent', 'update', { ad_user_data: 'granted' });
      await clock.tickAsync(0);
      expect(done()).to.be.true;
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted', ad_user_data: 'granted' });
    });

    it('uses the partial update when the rest does not arrive in time', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied' });
      gtag('consent', 'update', { ad_storage: 'granted' });
      const done = settled(setConsentConfig({ gcm: { timeout: 300 } }));
      await clock.tickAsync(299);
      expect(done()).to.be.false;
      await clock.tickAsync(1);
      expect(done()).to.be.true;
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted', ad_user_data: 'denied' });
    });

    it('folds together updates pushed back to back', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', wait_for_update: 1000 });
      const done = settled(setConsentConfig({ gcm: { timeout: 2000 } }));
      const listener = sinon.stub();
      gcmDataHandler.onChange(listener);
      await clock.tickAsync(50);
      gtag('consent', 'update', { ad_storage: 'denied' });
      gtag('consent', 'update', { ad_storage: 'granted' });
      expect(done()).to.be.false;
      sinon.assert.notCalled(listener);
      await clock.tickAsync(0);
      expect(done()).to.be.true;
      sinon.assert.calledOnce(listener);
      sinon.assert.calledWith(listener, { ad_storage: 'granted' });
    });

    it('does not settle a lookup that was superseded while folding updates', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied', wait_for_update: 1000 });
      setConsentConfig({ gcm: { timeout: 2000 } });
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: { cmpApi: 'static', consentData: { ad_storage: 'denied' } } });
      await clock.tickAsync(0);
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
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

    it('does not let a superseded lookup overwrite later configuration', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'granted', wait_for_update: 100 });
      setConsentConfig({ gcm: { timeout: 5 } });
      await clock.tickAsync(5);
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
      await setConsentConfig({ gcm: { cmpApi: 'static', consentData: { ad_storage: 'denied' } } });
      await clock.tickAsync(100);
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
      gtag('consent', 'update', { ad_storage: 'granted' });
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
    });

    it('does not let the timeout of a lookup set consent data after the module is disabled', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied' });
      setConsentConfig({ gcm: { timeout: 300 } });
      await clock.tickAsync(100);
      await setConsentConfig({ gcm: { enabled: false } });
      await clock.tickAsync(300);
      expect(gcmDataHandler.ready).to.be.false;
      expect(allConsent.getConsentMeta().gcm).to.be.undefined;
    });

    it('releases an auction that waits for a lookup when the configuration changes', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied' });
      setConsentConfig({ gcm: { timeout: 300 } });
      const next = sinon.stub();
      consentConfig.requestBidsHook(next, {});
      await setConsentConfig({ gcm: { cmpApi: 'static', consentData: { ad_storage: 'granted' } } });
      await clock.tickAsync(0);
      sinon.assert.calledOnce(next);
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
    });

    it('runs the refresh hook after its own again, when configured again after the configuration was removed', async () => {
      const hooks = () => getHook('requestBids').getHooks().map(({ hook }) => hook).filter(hook => [refreshConsentHook, consentConfig.requestBidsHook].includes(hook));
      await configure({ gcm: { timeout: 0 } });
      expect(hooks()).to.eql([consentConfig.requestBidsHook, refreshConsentHook]);
      await setConsentConfig({});
      expect(hooks()).to.eql([]);
      await configure({ gcm: { timeout: 0 } });
      expect(hooks()).to.eql([consentConfig.requestBidsHook, refreshConsentHook]);
    });

    it('computes a hash for the initial consent data', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      expect(gcmDataHandler.hash).to.not.be.null;
    });

    it('keeps notifying allConsent after being disabled and re-enabled', async () => {
      gtag('consent', 'update', { ad_storage: 'granted' });
      await setConsentConfig({ gcm: {} });
      await setConsentConfig({ gcm: { enabled: false } });
      await setConsentConfig({ gcm: {} });
      const listener = sinon.stub();
      allConsent.onChange(listener);
      gtag('consent', 'update', { ad_storage: 'denied' });
      sinon.assert.calledWith(listener, sinon.match({ gcm: { ad_storage: 'denied' } }));
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

      it('deny what any of them denies, with a single warning, without a region', async () => {
        await configure({ gcm: { timeout: 0 } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
        gtag('consent', 'default', { ad_user_data: 'denied', region: ['FR'] });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied', ad_user_data: 'denied' });
        expect(utils.logWarn.getCalls().filter(call => /region-scoped/.test(call.args[0])).length).to.equal(1);
      });

      it('apply by the configured region', async () => {
        await configure({ gcm: { timeout: 0, region: 'US-CA' } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
        expect(utils.logWarn.getCalls().filter(call => /region-scoped/.test(call.args[0])).length).to.equal(0);
      });

      it('do not apply when the configured region does not match', async () => {
        await configure({ gcm: { timeout: 0, region: 'GB' } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
      });

      it('apply by a region configured later, at once', async () => {
        await configure({ gcm: { timeout: 0 } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
        setConsentConfig({ gcm: { timeout: 300, region: 'GB' } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
        await clock.tickAsync(300);
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
      });

      it('apply by the latest region when it is configured again while waiting', async () => {
        setConsentConfig({ gcm: { timeout: 300, region: 'GB' } });
        await clock.tickAsync(100);
        const done = settled(setConsentConfig({ gcm: { timeout: 300, region: 'DE' } }));
        await clock.tickAsync(299);
        expect(done()).to.be.false;
        expect(gcmDataHandler.ready).to.be.false;
        await clock.tickAsync(1);
        expect(done()).to.be.true;
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
      });

      ['US_CA', 'USA', 'us-', ' '].forEach(region => {
        it(`warns on region '${region}', and takes it as unknown`, async () => {
          await configure({ gcm: { timeout: 0, region } });
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
          sinon.assert.calledWith(utils.logWarn, sinon.match(/region must be a country or subdivision code/));
        });
      });

      it('deny what those for its subdivisions deny, with a warning, when the region is a country', async () => {
        await configure({ gcm: { timeout: 0, region: 'us' } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
        sinon.assert.calledWith(utils.logWarn, sinon.match(/region-scoped/));
      });

      it('warns on a region that is not a string, and takes it as unknown', async () => {
        await configure({ gcm: { timeout: 0, region: ['GB'] } });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
        sinon.assert.calledWith(utils.logWarn, sinon.match(/region must be a country or subdivision code/));
      });

      describe('when the region is a promise', () => {
        let resolveRegion, rejectRegion, region;
        beforeEach(() => {
          region = new Promise((resolve, reject) => {
            resolveRegion = resolve;
            rejectRegion = reject;
          });
        });

        function regionWarnings() {
          return utils.logWarn.getCalls().filter(call => /region/.test(call.args[0])).length;
        }

        it('deny what any of them denies until it resolves, without a warning', async () => {
          await configure({ gcm: { timeout: 0, region } });
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
          expect(regionWarnings()).to.equal(0);
        });

        it('apply by the region once it resolves, notifying of the change', async () => {
          await configure({ gcm: { timeout: 0, region } });
          const listener = sinon.stub();
          gcmDataHandler.onChange(listener);
          resolveRegion('GB');
          await clock.tickAsync(0);
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
          sinon.assert.calledOnce(listener);
          expect(regionWarnings()).to.equal(0);
        });

        it('apply by a region that resolves while waiting, without restarting the wait', async () => {
          const done = settled(setConsentConfig({ gcm: { timeout: 300, region } }));
          await clock.tickAsync(100);
          resolveRegion('GB');
          await clock.tickAsync(199);
          expect(done()).to.be.false;
          await clock.tickAsync(1);
          expect(done()).to.be.true;
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
        });

        it('lets a lookup settle that only its region kept waiting', async () => {
          gtag('consent', 'update', { analytics_storage: 'granted' });
          const done = settled(setConsentConfig({ gcm: { timeout: 300, region } }));
          await clock.tickAsync(100);
          expect(done()).to.be.false;
          resolveRegion('GB');
          await clock.tickAsync(0);
          expect(done()).to.be.true;
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted', analytics_storage: 'granted' });
        });

        it('deny what any of them denies, with a warning, if it is rejected', async () => {
          await configure({ gcm: { timeout: 0, region } });
          rejectRegion(new Error('no geo'));
          await clock.tickAsync(0);
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
          sinon.assert.calledWith(utils.logWarn, sinon.match(/did not resolve to a country or subdivision code/));
          sinon.assert.calledWith(utils.logWarn, sinon.match(/region-scoped/));
        });

        it('deny what any of them denies, with a warning, if it does not resolve to a region code', async () => {
          await configure({ gcm: { timeout: 0, region } });
          resolveRegion(['GB']);
          await clock.tickAsync(0);
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
          sinon.assert.calledWith(utils.logWarn, sinon.match(/did not resolve to a country or subdivision code/));
        });

        it('is ignored if the configuration changed before it resolves', async () => {
          await configure({ gcm: { timeout: 0, region } });
          await configure({ gcm: { timeout: 0, region: 'US-CA' } });
          refreshConsentHook(() => null, {});
          resolveRegion('GB');
          await clock.tickAsync(0);
          refreshConsentHook(() => null, {});
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
        });

        it('is accepted through setConfig', async () => {
          config.setConfig({ consentManagement: { gcm: { timeout: 0, region } } });
          resolveRegion('GB');
          await clock.tickAsync(0);
          expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
        });
      });

      it('are overridden by an update', async () => {
        await configure({ gcm: { timeout: 0 } });
        gtag('consent', 'update', { ad_storage: 'granted' });
        expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
      });
    });

    it('picks up a replaced dataLayer before the auction', async () => {
      window.dataLayer = [];
      gtag('consent', 'default', { ad_storage: 'denied' });
      await configure({ gcm: { timeout: 0 } });
      window.dataLayer = [];
      gtag('consent', 'update', { ad_storage: 'granted' });
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'denied' });
      const next = sinon.stub();
      refreshConsentHook(next, { bidsBackHandler: 'x' });
      sinon.assert.calledWith(next, { bidsBackHandler: 'x' });
      expect(gcmDataHandler.getConsentData()).to.eql({ ad_storage: 'granted' });
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
