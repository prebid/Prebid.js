import { DEFAULT_RULES, gcmRule, getRules, reset, setupRules } from 'modules/gcmControl.js';
import { setEnforcementConfig, uninstall as uninstallTcf } from 'modules/tcfControl.js';
import { gcmDataHandler, gdprDataHandler } from 'src/consentHandler.js';
import { isActivityAllowed } from 'src/activities/rules.js';
import { activityParams } from 'src/activities/activityParams.js';
import {
  MODULE_TYPE_ANALYTICS,
  MODULE_TYPE_BIDDER,
  MODULE_TYPE_PREBID,
  MODULE_TYPE_RTD,
  MODULE_TYPE_UID
} from 'src/activities/modules.js';
import {
  ACTIVITY_ACCESS_DEVICE,
  ACTIVITY_ENRICH_EIDS,
  ACTIVITY_ENRICH_UFPD,
  ACTIVITY_FETCH_BIDS,
  ACTIVITY_REPORT_ANALYTICS,
  ACTIVITY_SYNC_USER,
  ACTIVITY_TRANSMIT_EIDS,
  ACTIVITY_TRANSMIT_PRECISE_GEO,
  ACTIVITY_TRANSMIT_UFPD
} from 'src/activities/activities.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import adapterManager from 'src/adapterManager.js';

describe('gcmControl', () => {
  const ALL_ACTIVITIES = [
    ACTIVITY_ACCESS_DEVICE,
    ACTIVITY_ENRICH_EIDS,
    ACTIVITY_ENRICH_UFPD,
    ACTIVITY_FETCH_BIDS,
    ACTIVITY_REPORT_ANALYTICS,
    ACTIVITY_SYNC_USER,
    ACTIVITY_TRANSMIT_EIDS,
    ACTIVITY_TRANSMIT_PRECISE_GEO,
    ACTIVITY_TRANSMIT_UFPD
  ];
  const ALL_TYPES = [MODULE_TYPE_BIDDER, MODULE_TYPE_UID, MODULE_TYPE_ANALYTICS, MODULE_TYPE_RTD, MODULE_TYPE_PREBID];
  const ALL_GRANTED = { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' };

  let sandbox;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logWarn');
    sandbox.stub(utils, 'logInfo');
  });
  afterEach(() => {
    reset();
    gcmDataHandler.reset();
    sandbox.restore();
  });

  function setConsent(consent) {
    gcmDataHandler.enable();
    gcmDataHandler.setConsentData(consent);
  }

  function allowed(activity, type, name = 'mockModule') {
    return isActivityAllowed(activity, activityParams(type, name));
  }

  // whether GCM rules alone deny the activity, regardless of other rules (such as bidders' default storage access)
  function gcmDenies(activity, type, rules) {
    const signalRules = getRules(rules)[activity];
    return signalRules != null && gcmRule(signalRules)(activityParams(type, 'mockModule'))?.allow === false;
  }

  describe('default mapping', () => {
    const DENIED_BY = {
      ad_storage: {
        [ACTIVITY_ACCESS_DEVICE]: [MODULE_TYPE_BIDDER, MODULE_TYPE_UID]
      },
      analytics_storage: {
        [ACTIVITY_REPORT_ANALYTICS]: ALL_TYPES,
        [ACTIVITY_ACCESS_DEVICE]: [MODULE_TYPE_ANALYTICS]
      },
      ad_user_data: {
        [ACTIVITY_TRANSMIT_EIDS]: ALL_TYPES,
        [ACTIVITY_TRANSMIT_UFPD]: ALL_TYPES,
        [ACTIVITY_TRANSMIT_PRECISE_GEO]: ALL_TYPES
      },
      ad_personalization: {
        [ACTIVITY_TRANSMIT_UFPD]: ALL_TYPES,
        [ACTIVITY_ENRICH_EIDS]: ALL_TYPES
      }
    };

    Object.entries(DENIED_BY).forEach(([signal, denied]) => {
      describe(`when ${signal} is denied`, () => {
        beforeEach(() => setConsent({ ...ALL_GRANTED, [signal]: 'denied' }));
        ALL_ACTIVITIES.forEach(activity => {
          ALL_TYPES.forEach(type => {
            const expected = (denied[activity] ?? []).includes(type);
            it(`${expected ? 'denies' : 'allows'} ${activity} for ${type}`, () => {
              expect(gcmDenies(activity, type)).to.equal(expected);
            });
          });
        });
      });
    });

    it('allows everything when every signal is granted', () => {
      setConsent(ALL_GRANTED);
      ALL_ACTIVITIES.forEach(activity => ALL_TYPES.forEach(type => expect(gcmDenies(activity, type)).to.be.false));
    });

    it('allows everything when there is no GCM signal', () => {
      setConsent(null);
      ALL_ACTIVITIES.forEach(activity => ALL_TYPES.forEach(type => expect(gcmDenies(activity, type)).to.be.false));
    });

    it('does not deny for signals the page never set', () => {
      setConsent({ ad_storage: 'denied' });
      expect(gcmDenies(ACTIVITY_TRANSMIT_EIDS, MODULE_TYPE_BIDDER)).to.be.false;
      expect(gcmDenies(ACTIVITY_ACCESS_DEVICE, MODULE_TYPE_BIDDER)).to.be.true;
    });

    it('are installed as activity controls', () => {
      setupRules();
      setConsent({ ad_user_data: 'granted' });
      expect(allowed(ACTIVITY_TRANSMIT_EIDS, MODULE_TYPE_BIDDER)).to.be.true;
      setConsent({ ad_user_data: 'denied' });
      expect(allowed(ACTIVITY_TRANSMIT_EIDS, MODULE_TYPE_BIDDER)).to.be.false;
    });

    it('gives the denied signals as the reason', () => {
      const rule = gcmRule(getRules()[ACTIVITY_TRANSMIT_UFPD], () => ({ ad_user_data: 'denied', ad_personalization: 'denied' }));
      expect(rule(activityParams(MODULE_TYPE_BIDDER, 'b'))).to.eql({ allow: false, reason: 'Consent Mode ad_user_data, ad_personalization denied' });
    });
  });

  describe('getRules', () => {
    it('maps activities to the signals that deny them, by default', () => {
      expect(getRules()).to.eql({
        [ACTIVITY_ACCESS_DEVICE]: [
          { signal: 'ad_storage', componentTypes: [MODULE_TYPE_BIDDER, MODULE_TYPE_UID] },
          { signal: 'analytics_storage', componentTypes: [MODULE_TYPE_ANALYTICS] },
        ],
        [ACTIVITY_REPORT_ANALYTICS]: [{ signal: 'analytics_storage', componentTypes: null }],
        [ACTIVITY_TRANSMIT_EIDS]: [{ signal: 'ad_user_data', componentTypes: null }],
        [ACTIVITY_TRANSMIT_UFPD]: [
          { signal: 'ad_user_data', componentTypes: null },
          { signal: 'ad_personalization', componentTypes: null },
        ],
        [ACTIVITY_TRANSMIT_PRECISE_GEO]: [{ signal: 'ad_user_data', componentTypes: null }],
        [ACTIVITY_ENRICH_EIDS]: [{ signal: 'ad_personalization', componentTypes: null }],
      });
    });

    it('does not modify the defaults', () => {
      const before = JSON.stringify(DEFAULT_RULES);
      getRules({ ad_storage: [] });
      expect(JSON.stringify(DEFAULT_RULES)).to.equal(before);
    });

    it('warns on, and ignores, invalid config', () => {
      expect(getRules('bad')).to.eql(getRules());
      expect(getRules({ ad_storage: 'accessDevice' })).to.eql(getRules());
      expect(getRules({ ad_storage: [null, 42] })[ACTIVITY_ACCESS_DEVICE]).to.eql([
        { signal: 'analytics_storage', componentTypes: [MODULE_TYPE_ANALYTICS] }
      ]);
      expect(utils.logWarn.callCount).to.equal(4);
    });
  });

  describe('overrides', () => {
    it('replace the default for a signal', () => {
      setupRules({ ad_personalization: [ACTIVITY_TRANSMIT_UFPD] });
      setConsent({ ad_personalization: 'denied' });
      expect(allowed(ACTIVITY_ENRICH_EIDS, MODULE_TYPE_UID)).to.be.true;
      expect(allowed(ACTIVITY_TRANSMIT_UFPD, MODULE_TYPE_BIDDER)).to.be.false;
    });

    it('leave other signals with their default', () => {
      setupRules({ ad_personalization: [] });
      setConsent({ ad_personalization: 'denied', ad_user_data: 'denied' });
      expect(allowed(ACTIVITY_ENRICH_EIDS, MODULE_TYPE_UID)).to.be.true;
      expect(allowed(ACTIVITY_TRANSMIT_EIDS, MODULE_TYPE_BIDDER)).to.be.false;
    });

    it('can limit an activity to some component types', () => {
      const rules = { ad_storage: [{ activity: ACTIVITY_ACCESS_DEVICE, componentTypes: [MODULE_TYPE_RTD] }, ACTIVITY_SYNC_USER] };
      setConsent({ ad_storage: 'denied' });
      expect(gcmDenies(ACTIVITY_ACCESS_DEVICE, MODULE_TYPE_RTD, rules)).to.be.true;
      expect(gcmDenies(ACTIVITY_ACCESS_DEVICE, MODULE_TYPE_BIDDER, rules)).to.be.false;
      expect(gcmDenies(ACTIVITY_SYNC_USER, MODULE_TYPE_BIDDER, rules)).to.be.true;
    });

    it('can map signals with no default', () => {
      setupRules({ functionality_storage: [ACTIVITY_ACCESS_DEVICE] });
      setConsent({ functionality_storage: 'denied' });
      expect(allowed(ACTIVITY_ACCESS_DEVICE, MODULE_TYPE_PREBID)).to.be.false;
    });

    it('replace earlier rules when set up again', () => {
      setupRules({ ad_storage: [ACTIVITY_TRANSMIT_EIDS] });
      setupRules();
      setConsent({ ad_storage: 'denied' });
      expect(allowed(ACTIVITY_TRANSMIT_EIDS, MODULE_TYPE_BIDDER)).to.be.true;
    });
  });

  describe('configuration', () => {
    afterEach(() => config.resetConfig());

    it('installs rules from consentManagement.gcm.rules', () => {
      config.setConfig({ consentManagement: { gcm: { cmpApi: 'static', consentData: { ad_storage: 'denied' }, rules: { ad_storage: [ACTIVITY_TRANSMIT_EIDS] } } } });
      setConsent({ ad_storage: 'denied' });
      expect(allowed(ACTIVITY_TRANSMIT_EIDS, MODULE_TYPE_BIDDER)).to.be.false;
      expect(allowed(ACTIVITY_TRANSMIT_PRECISE_GEO, MODULE_TYPE_BIDDER)).to.be.true;
    });

    it('removes rules when gcm is not configured', () => {
      setupRules();
      config.setConfig({ consentManagement: {} });
      setConsent({ ad_user_data: 'denied' });
      expect(allowed(ACTIVITY_TRANSMIT_EIDS, MODULE_TYPE_BIDDER)).to.be.true;
    });
  });

  describe('analytics_storage revoked mid-session', () => {
    let adapter, enabled;
    beforeEach(() => {
      enabled = false;
      adapter = {
        get enabled() { return enabled; },
        code: 'gcmMockAnalytics',
        enableAnalytics: sinon.stub().callsFake(() => { enabled = true; }),
        disableAnalytics: sinon.stub().callsFake(() => { enabled = false; })
      };
      adapterManager.registerAnalyticsAdapter({ code: adapter.code, adapter });
      setupRules();
    });
    afterEach(() => {
      delete adapterManager.analyticsRegistry[adapter.code];
    });

    it('disables, and re-enables, analytics adapters as consent changes', () => {
      setConsent({ analytics_storage: 'granted' });
      adapterManager.enableAnalytics({ provider: adapter.code });
      expect(enabled).to.be.true;
      // consent changes trigger this through allConsent.onChange
      setConsent({ analytics_storage: 'denied' });
      adapterManager.refreshAnalytics();
      expect(enabled).to.be.false;
      setConsent({ analytics_storage: 'granted' });
      adapterManager.refreshAnalytics();
      expect(enabled).to.be.true;
    });
  });

  describe('alongside TCF, the stricter wins', () => {
    function setTcfConsent(storageConsent) {
      gdprDataHandler.enable();
      gdprDataHandler.setConsentData({
        gdprApplies: true,
        apiVersion: 2,
        vendorData: { purpose: { consents: { 1: storageConsent } } }
      });
    }

    beforeEach(() => {
      setEnforcementConfig({ gdpr: { rules: [{ purpose: 'storage', enforcePurpose: true, enforceVendor: false }] } });
      setupRules();
    });

    afterEach(() => {
      uninstallTcf();
      gdprDataHandler.reset();
    });

    it('allows when both allow', () => {
      setTcfConsent(true);
      setConsent({ ad_storage: 'granted' });
      expect(allowed(ACTIVITY_ACCESS_DEVICE, MODULE_TYPE_UID)).to.be.true;
    });

    it('denies when GCM denies what TCF allows', () => {
      setTcfConsent(true);
      setConsent({ ad_storage: 'denied' });
      expect(allowed(ACTIVITY_ACCESS_DEVICE, MODULE_TYPE_UID)).to.be.false;
    });

    it('denies when TCF denies what GCM allows', () => {
      setTcfConsent(false);
      setConsent({ ad_storage: 'granted' });
      expect(allowed(ACTIVITY_ACCESS_DEVICE, MODULE_TYPE_UID)).to.be.false;
    });
  });
});
