import { expect } from 'chai';
import sinon from 'sinon';
import {
  msClaritySubmodule,
  scrollBucket,
  dwellBucket,
  frustrationBucket,
  interactionBucket,
  scrollPatternBucket,
  stageBucket,
  engagementBucket,
  buildFeatures,
  resetTracker,
} from 'modules/msClarityRtdProvider.js';
import { deepAccess } from 'src/utils.js';

describe('msClarityRtdProvider', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
    resetTracker();
    delete window.clarity;
    document.querySelectorAll('script[src*="clarity.ms/tag"]').forEach(el => el.remove());
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function makeConfig(overrides) {
    return {
      params: Object.assign({
        projectId: 'test-project-123',
        bidders: ['appnexus'],
      }, overrides || {})
    };
  }

  function makeReqBidsConfigObj(adUnits) {
    return {
      adUnits: adUnits || [],
      ortb2Fragments: { global: {}, bidder: {} }
    };
  }

  // ─── Bucket Functions ─────────────────────────────────────────────────────

  describe('scrollBucket()', function () {
    it('should return none for 0', function () {
      expect(scrollBucket(0)).to.equal('none');
    });

    it('should return shallow for 0.1', function () {
      expect(scrollBucket(0.1)).to.equal('shallow');
    });

    it('should return mid for 0.3', function () {
      expect(scrollBucket(0.3)).to.equal('mid');
    });

    it('should return deep for 0.6', function () {
      expect(scrollBucket(0.6)).to.equal('deep');
    });

    it('should return complete for 0.9', function () {
      expect(scrollBucket(0.9)).to.equal('complete');
    });

    it('should return complete for 1.0', function () {
      expect(scrollBucket(1.0)).to.equal('complete');
    });

    it('should return none for negative values', function () {
      expect(scrollBucket(-0.1)).to.equal('none');
    });
  });

  describe('dwellBucket()', function () {
    it('should return bounce for < 5s', function () {
      expect(dwellBucket(2000)).to.equal('bounce');
    });

    it('should return brief for 5–15s', function () {
      expect(dwellBucket(10000)).to.equal('brief');
    });

    it('should return moderate for 15–30s', function () {
      expect(dwellBucket(20000)).to.equal('moderate');
    });

    it('should return long for 30–60s', function () {
      expect(dwellBucket(45000)).to.equal('long');
    });

    it('should return extended for >= 60s', function () {
      expect(dwellBucket(90000)).to.equal('extended');
    });

    it('should return bounce for 0', function () {
      expect(dwellBucket(0)).to.equal('bounce');
    });
  });

  describe('frustrationBucket()', function () {
    it('should return none for 0 rage + 0 dead', function () {
      expect(frustrationBucket(0, 0)).to.equal('none');
    });

    it('should return mild for 1 rage + 0 dead', function () {
      expect(frustrationBucket(1, 0)).to.equal('mild');
    });

    it('should return mild for 0 rage + 2 dead', function () {
      expect(frustrationBucket(0, 2)).to.equal('mild');
    });

    it('should return moderate for 3 rage + 2 dead', function () {
      expect(frustrationBucket(3, 2)).to.equal('moderate');
    });

    it('should return severe for 6 rage + 5 dead', function () {
      expect(frustrationBucket(6, 5)).to.equal('severe');
    });
  });

  describe('interactionBucket()', function () {
    it('should return passive for 0 interactions', function () {
      expect(interactionBucket(0, 10000)).to.equal('passive');
    });

    it('should return light for low rate', function () {
      // 1 event in 10s = 0.1/s
      expect(interactionBucket(1, 10000)).to.equal('light');
    });

    it('should return moderate for medium rate', function () {
      // 4 events in 10s = 0.4/s
      expect(interactionBucket(4, 10000)).to.equal('moderate');
    });

    it('should return active for high rate', function () {
      // 8 events in 10s = 0.8/s
      expect(interactionBucket(8, 10000)).to.equal('active');
    });

    it('should return intense for very high rate', function () {
      // 20 events in 10s = 2.0/s
      expect(interactionBucket(20, 10000)).to.equal('intense');
    });

    it('should return passive when activeMs is 0', function () {
      expect(interactionBucket(5, 0)).to.equal('passive');
    });
  });

  describe('scrollPatternBucket()', function () {
    it('should return none for 0 distance', function () {
      expect(scrollPatternBucket(0, 0)).to.equal('none');
    });

    it('should return scanning for low direction changes', function () {
      // 1 change per 5000px = 0.2 ratio
      expect(scrollPatternBucket(1, 5000)).to.equal('scanning');
    });

    it('should return reading for moderate direction changes', function () {
      // 5 changes per 5000px = 1.0 ratio
      expect(scrollPatternBucket(5, 5000)).to.equal('reading');
    });

    it('should return searching for high direction changes', function () {
      // 15 changes per 5000px = 3.0 ratio
      expect(scrollPatternBucket(15, 5000)).to.equal('searching');
    });
  });

  describe('stageBucket()', function () {
    it('should return landing for new visitor', function () {
      expect(stageBucket(2000, 0.05, 1)).to.equal('landing');
    });

    it('should return exploring for brief visits', function () {
      expect(stageBucket(10000, 0.2, 5)).to.equal('exploring');
    });

    it('should return engaged for moderate visits', function () {
      expect(stageBucket(20000, 0.5, 5)).to.equal('engaged');
    });

    it('should return converting for deep engagement', function () {
      expect(stageBucket(20000, 0.5, 15)).to.equal('converting');
    });
  });

  describe('engagementBucket()', function () {
    it('should return low for minimal engagement', function () {
      expect(engagementBucket(0, 0, 0, 0, 0)).to.equal('low');
    });

    it('should return medium for some engagement', function () {
      expect(engagementBucket(0.3, 15000, 5, 0, 0)).to.equal('medium');
    });

    it('should return high for good engagement', function () {
      expect(engagementBucket(0.6, 30000, 10, 0, 0)).to.equal('high');
    });

    it('should return very_high for maximum engagement', function () {
      expect(engagementBucket(1.0, 60000, 20, 0, 0)).to.equal('very_high');
    });

    it('should penalize frustration signals', function () {
      const withFrust = engagementBucket(0.5, 30000, 10, 5, 5);
      const withoutFrust = engagementBucket(0.5, 30000, 10, 0, 0);
      const order = ['low', 'medium', 'high', 'very_high'];
      expect(order.indexOf(withFrust)).to.be.at.most(order.indexOf(withoutFrust));
    });
  });

  // ─── init() ───────────────────────────────────────────────────────────────

  describe('init()', function () {
    it('should return false when projectId is missing', function () {
      const result = msClaritySubmodule.init(makeConfig({ projectId: undefined }), {});
      expect(result).to.be.false;
    });

    it('should return false when projectId is empty string', function () {
      const result = msClaritySubmodule.init(makeConfig({ projectId: '' }), {});
      expect(result).to.be.false;
    });

    it('should auto-inject Clarity and return true when not present', function () {
      const result = msClaritySubmodule.init(makeConfig(), {});
      expect(result).to.be.true;
      expect(typeof window.clarity).to.equal('function');
      const tag = document.querySelector('script[src*="clarity.ms/tag/test-project-123"]');
      expect(tag).to.exist;
    });

    it('should return true when Clarity is already present', function () {
      window.clarity = function () {};
      const result = msClaritySubmodule.init(makeConfig(), {});
      expect(result).to.be.true;
    });

    it('should return false when all bidders are unapproved', function () {
      window.clarity = function () {};
      const result = msClaritySubmodule.init(makeConfig({ bidders: ['rubicon', 'ix'] }), {});
      expect(result).to.be.false;
    });

    it('should return true when at least one bidder is approved', function () {
      window.clarity = function () {};
      const result = msClaritySubmodule.init(makeConfig({ bidders: ['appnexus', 'rubicon'] }), {});
      expect(result).to.be.true;
    });

    it('should default to APPROVED_BIDDERS when bidders not set', function () {
      window.clarity = function () {};
      const result = msClaritySubmodule.init(makeConfig({ bidders: undefined }), {});
      expect(result).to.be.true;
    });
  });

  // ─── getBidRequestData() ──────────────────────────────────────────────────

  describe('getBidRequestData()', function () {
    beforeEach(function () {
      window.clarity = function () {};
      msClaritySubmodule.init(makeConfig(), {});
    });

    it('should always call the callback', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, done, makeConfig(), {});
    });

    it('should write all 7 features to appnexus site.ext.data.msclarity', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const site = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.ext.data.msclarity');
        expect(site).to.exist;
        expect(site).to.have.all.keys(
          'scroll', 'dwell', 'engagement', 'frustration',
          'interaction', 'scroll_pattern', 'stage'
        );
        Object.values(site).forEach(v => expect(v).to.be.a('string'));
        done();
      }, makeConfig(), {});
    });

    it('should write engagement to user.ext.data.msclarity', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const user = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.user.ext.data.msclarity');
        expect(user).to.exist;
        expect(user.engagement).to.be.a('string');
        expect(Object.keys(user)).to.deep.equal(['engagement']);
        done();
      }, makeConfig(), {});
    });

    it('should NOT write to ortb2Fragments.global', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        expect(reqBids.ortb2Fragments.global).to.deep.equal({});
        done();
      }, makeConfig(), {});
    });

    it('should NOT write to unapproved bidders', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        expect(deepAccess(reqBids, 'ortb2Fragments.bidder.rubicon')).to.not.exist;
        done();
      }, makeConfig({ bidders: ['appnexus', 'rubicon'] }), {});
    });

    it('should build keywords with bucketed values', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.keywords');
        expect(kw).to.be.a('string');
        expect(kw).to.include('msc_scroll=');
        expect(kw).to.include('msc_dwell=');
        expect(kw).to.include('msc_engagement=');
        expect(kw).to.include('msc_interaction=');
        expect(kw).to.include('msc_stage=');
        done();
      }, makeConfig(), {});
    });

    it('should use custom targetingPrefix', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.keywords');
        expect(kw).to.include('cl_scroll=');
        expect(kw).to.include('cl_engagement=');
        done();
      }, makeConfig({ targetingPrefix: 'cl' }), {});
    });

    it('should append to existing keywords', function (done) {
      const reqBids = makeReqBidsConfigObj();
      reqBids.ortb2Fragments.bidder.appnexus = {
        site: { keywords: 'existing_kw=value' }
      };
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.keywords');
        expect(kw).to.include('existing_kw=value');
        expect(kw).to.include('msc_scroll=');
        done();
      }, makeConfig(), {});
    });

    it('should enrich ortb2Imp only for ad units with approved bidders', function (done) {
      const adUnits = [
        {
          code: 'ad-slot-1',
          bids: [{ bidder: 'appnexus', params: { placementId: 123 } }]
        },
        {
          code: 'ad-slot-2',
          bids: [{ bidder: 'rubicon', params: { accountId: 456 } }]
        }
      ];

      const reqBids = makeReqBidsConfigObj(adUnits);
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const imp1 = deepAccess(adUnits[0], 'ortb2Imp.ext.data.msclarity');
        expect(imp1).to.exist;
        expect(imp1.scroll).to.be.a('string');
        expect(imp1.engagement).to.be.a('string');
        expect(Object.keys(imp1)).to.deep.equal(['scroll', 'engagement']);

        const imp2 = deepAccess(adUnits[1], 'ortb2Imp.ext.data.msclarity');
        expect(imp2).to.not.exist;

        done();
      }, makeConfig(), {});
    });

    it('should handle errors gracefully and still call callback', function (done) {
      // Passing null will cause an error inside the try block
      msClaritySubmodule.getBidRequestData(null, function () {
        done();
      }, makeConfig(), {});
    });

    it('should not include frustration keyword when frustration is none', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.keywords');
        // Fresh tracker has 0 rage + 0 dead = 'none', so no frustration keyword
        expect(kw).to.not.include('msc_frustration=');
        done();
      }, makeConfig(), {});
    });
  });

  // ─── buildFeatures() ─────────────────────────────────────────────────────

  describe('buildFeatures()', function () {
    beforeEach(function () {
      window.clarity = function () {};
      msClaritySubmodule.init(makeConfig(), {});
    });

    it('should return all 7 features', function () {
      const features = buildFeatures();
      expect(features).to.have.all.keys(
        'scroll', 'dwell', 'engagement', 'frustration',
        'interaction', 'scroll_pattern', 'stage'
      );
    });

    it('should return string values for all features', function () {
      const features = buildFeatures();
      Object.values(features).forEach(v => {
        expect(v).to.be.a('string');
      });
    });

    it('should return baseline values for fresh tracker', function () {
      const features = buildFeatures();
      expect(features.scroll).to.equal('none');
      expect(features.dwell).to.equal('bounce');
      expect(features.frustration).to.equal('none');
      expect(features.interaction).to.equal('passive');
      expect(features.scroll_pattern).to.equal('none');
      expect(features.stage).to.equal('landing');
    });
  });

  // ─── resetTracker() ──────────────────────────────────────────────────────

  describe('resetTracker()', function () {
    it('should reset all tracker state to baseline', function () {
      window.clarity = function () {};
      msClaritySubmodule.init(makeConfig(), {});

      resetTracker();
      const features = buildFeatures();
      expect(features.scroll).to.equal('none');
      expect(features.dwell).to.equal('bounce');
      expect(features.frustration).to.equal('none');
      expect(features.interaction).to.equal('passive');
      expect(features.scroll_pattern).to.equal('none');
      expect(features.stage).to.equal('landing');
    });

    it('should allow re-initialization after reset', function () {
      window.clarity = function () {};
      msClaritySubmodule.init(makeConfig(), {});
      resetTracker();
      // Re-init should succeed
      const result = msClaritySubmodule.init(makeConfig(), {});
      expect(result).to.be.true;
    });
  });

  // ─── Module metadata ──────────────────────────────────────────────────────

  describe('module metadata', function () {
    it('should have the correct module name', function () {
      expect(msClaritySubmodule.name).to.equal('msClarity');
    });

    it('should expose init and getBidRequestData only', function () {
      expect(msClaritySubmodule.init).to.be.a('function');
      expect(msClaritySubmodule.getBidRequestData).to.be.a('function');
      expect(msClaritySubmodule.getTargetingData).to.be.undefined;
    });
  });
});
