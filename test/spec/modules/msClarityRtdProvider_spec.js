import { expect } from 'chai';
import sinon from 'sinon';
import { msClaritySubmodule } from 'modules/msClarityRtdProvider.js';
import { deepAccess } from 'src/utils.js';

describe('msClarityRtdProvider', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
    delete window.clarity;
    delete window.clarityData;
    // Remove any Clarity script tags injected during tests
    document.querySelectorAll('script[src*="clarity.ms/tag"]').forEach(el => el.remove());
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function mockClarity(data) {
    window.clarity = function (cmd, key, cb) {
      if (cmd === 'get' && typeof cb === 'function') {
        cb(data[key]);
      }
    };
  }

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

  // ─── init() ───────────────────────────────────────────────────────────────

  describe('init()', function () {
    it('should auto-inject Clarity and return true when window.clarity is not present', function () {
      // Clarity is not on the page, but projectId is provided — module should inject
      const result = msClaritySubmodule.init(makeConfig(), {});
      expect(result).to.be.true;
      // The queue stub should now exist
      expect(typeof window.clarity).to.equal('function');
      // A script tag should have been added
      const tag = document.querySelector('script[src*="clarity.ms/tag/test-project-123"]');
      expect(tag).to.exist;
    });

    it('should return false when projectId is missing', function () {
      mockClarity({});
      const result = msClaritySubmodule.init(makeConfig({ projectId: undefined }), {});
      expect(result).to.be.false;
    });

    it('should return false when projectId is empty string', function () {
      mockClarity({});
      const result = msClaritySubmodule.init(makeConfig({ projectId: '' }), {});
      expect(result).to.be.false;
    });

    it('should return true when Clarity is present and projectId is set', function () {
      mockClarity({});
      const result = msClaritySubmodule.init(makeConfig(), {});
      expect(result).to.be.true;
    });

    it('should return false when all requested bidders are unapproved', function () {
      mockClarity({});
      const result = msClaritySubmodule.init(makeConfig({ bidders: ['rubicon', 'ix'] }), {});
      expect(result).to.be.false;
    });

    it('should return true when at least one requested bidder is approved', function () {
      mockClarity({});
      const result = msClaritySubmodule.init(makeConfig({ bidders: ['appnexus', 'rubicon'] }), {});
      expect(result).to.be.true;
    });

    it('should use APPROVED_BIDDERS when params.bidders is not set', function () {
      mockClarity({});
      const result = msClaritySubmodule.init(makeConfig({ bidders: undefined }), {});
      expect(result).to.be.true;
    });
  });

  // ─── getBidRequestData() ──────────────────────────────────────────────────

  describe('getBidRequestData()', function () {
    it('should call callback even when Clarity is absent', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        done();
      }, makeConfig(), {});
    });

    it('should call callback when no signals are available', function (done) {
      mockClarity({});
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        // No bidder data should be written when signals are empty
        expect(reqBids.ortb2Fragments.bidder).to.deep.equal({});
        done();
      }, makeConfig(), {});
    });

    it('should write signals only to approved bidders (appnexus)', function (done) {
      mockClarity({
        'scroll-depth': 0.75,
        'active-time': 15000,
        'engagement-score': 0.85
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        // AppNexus should have data
        const anSite = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.ext.data.msclarity');
        expect(anSite).to.exist;
        expect(anSite.scroll_depth).to.equal(0.75);
        expect(anSite.active_time_ms).to.equal(15000);
        expect(anSite.engagement_score).to.equal(0.85);

        done();
      }, makeConfig(), {});
    });

    it('should NOT write signals to unapproved bidders', function (done) {
      mockClarity({
        'scroll-depth': 0.5,
        'engagement-score': 0.6
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        // Rubicon should NOT have data
        expect(deepAccess(reqBids, 'ortb2Fragments.bidder.rubicon')).to.not.exist;
        done();
      }, makeConfig({ bidders: ['appnexus', 'rubicon'] }), {});
    });

    it('should NOT write to ortb2Fragments.global', function (done) {
      mockClarity({
        'scroll-depth': 0.8,
        'engagement-score': 0.9
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        expect(reqBids.ortb2Fragments.global).to.deep.equal({});
        done();
      }, makeConfig(), {});
    });

    it('should write user-level engagement data for approved bidders', function (done) {
      mockClarity({
        'engagement-score': 0.85
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const anUser = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.user.ext.data.msclarity');
        expect(anUser).to.exist;
        expect(anUser.engagement_score).to.equal(0.85);
        expect(anUser.engagement_bucket).to.equal('very_high');
        done();
      }, makeConfig(), {});
    });

    it('should build keywords with correct prefix', function (done) {
      mockClarity({
        'scroll-depth': 0.8,
        'active-time': 15000,
        'engagement-score': 0.9,
        'scroll-velocity': 'slow'
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.keywords');
        expect(kw).to.be.a('string');
        expect(kw).to.include('msc_scroll=deep');
        expect(kw).to.include('msc_engaged=true');
        expect(kw).to.include('msc_engagement=very_high');
        expect(kw).to.include('msc_velocity=slow');
        done();
      }, makeConfig(), {});
    });

    it('should use custom targeting prefix', function (done) {
      mockClarity({
        'scroll-depth': 0.6,
        'engagement-score': 0.7
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.keywords');
        expect(kw).to.include('cl_scroll=');
        expect(kw).to.include('cl_engagement=');
        done();
      }, makeConfig({ targetingPrefix: 'cl' }), {});
    });

    it('should enrich ortb2Imp for ad units with approved bidders', function (done) {
      mockClarity({
        'scroll-depth': 0.65,
        'engagement-score': 0.78
      });

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
        // First ad unit (has appnexus) should be enriched
        const imp1 = deepAccess(adUnits[0], 'ortb2Imp.ext.data.msclarity');
        expect(imp1).to.exist;
        expect(imp1.scroll_depth).to.equal(0.65);
        expect(imp1.engagement_score).to.equal(0.78);

        // Second ad unit (only rubicon) should NOT be enriched
        const imp2 = deepAccess(adUnits[1], 'ortb2Imp.ext.data.msclarity');
        expect(imp2).to.not.exist;

        done();
      }, makeConfig(), {});
    });

    it('should handle rage click and dead click signals', function (done) {
      mockClarity({
        'rage-click-count': 3,
        'dead-click-count': 5,
        'engagement-score': 0.4
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const site = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.ext.data.msclarity');
        expect(site.rage_click_count).to.equal(3);
        expect(site.dead_click_count).to.equal(5);

        const kw = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.keywords');
        expect(kw).to.include('msc_frustrated=true');
        done();
      }, makeConfig(), {});
    });

    it('should clamp scroll_depth between 0 and 1', function (done) {
      mockClarity({
        'scroll-depth': 1.5
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const site = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.ext.data.msclarity');
        expect(site.scroll_depth).to.equal(1);
        done();
      }, makeConfig(), {});
    });

    it('should clamp exit_probability between 0 and 1', function (done) {
      mockClarity({
        'exit-probability': -0.5
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const site = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.ext.data.msclarity');
        expect(site.exit_probability).to.equal(0);
        done();
      }, makeConfig(), {});
    });

    it('should only collect requested signals', function (done) {
      mockClarity({
        'scroll-depth': 0.8,
        'active-time': 20000,
        'rage-click-count': 2,
        'engagement-score': 0.9
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const site = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.ext.data.msclarity');
        expect(site.scroll_depth).to.equal(0.8);
        // active_time and engagement_score should not be present
        expect(site.active_time_ms).to.not.exist;
        expect(site.engagement_score).to.not.exist;
        // frustration was not requested, so rage clicks not collected
        expect(site.rage_click_count).to.not.exist;
        done();
      }, makeConfig({ signals: ['scroll_depth'] }), {});
    });

    it('should append to existing keywords', function (done) {
      mockClarity({
        'scroll-depth': 0.7,
        'engagement-score': 0.8
      });

      const reqBids = makeReqBidsConfigObj();
      // Pre-set some keywords
      reqBids.ortb2Fragments.bidder.appnexus = {
        site: { keywords: 'existing_kw=value' }
      };

      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.site.keywords');
        expect(kw).to.include('existing_kw=value');
        expect(kw).to.include('msc_scroll=deep');
        done();
      }, makeConfig(), {});
    });

    it('should handle Clarity API errors gracefully', function (done) {
      window.clarity = function () {
        throw new Error('Clarity internal error');
      };

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        // Should still call callback without throwing
        done();
      }, makeConfig(), {});
    });
  });

  // ─── getTargetingData() ───────────────────────────────────────────────────

  describe('getTargetingData()', function () {
    it('should return empty object when no signals have been collected', function () {
      // Reset module state — init() clears _lastSignals
      msClaritySubmodule.init(makeConfig(), {});
      const result = msClaritySubmodule.getTargetingData(['ad-1'], makeConfig(), {});
      expect(result).to.deep.equal({});
    });

    it('should return targeting data for all ad unit codes after getBidRequestData', function (done) {
      mockClarity({
        'scroll-depth': 0.8,
        'active-time': 15000,
        'engagement-score': 0.85,
        'scroll-velocity': 'slow'
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const result = msClaritySubmodule.getTargetingData(['ad-1', 'ad-2'], makeConfig(), {});

        expect(result['ad-1']).to.exist;
        expect(result['ad-2']).to.exist;

        expect(result['ad-1']['msc_scroll']).to.equal('deep');
        expect(result['ad-1']['msc_engaged']).to.equal('true');
        expect(result['ad-1']['msc_engagement']).to.equal('very_high');
        expect(result['ad-1']['msc_velocity']).to.equal('slow');

        done();
      }, makeConfig(), {});
    });

    it('should use custom targeting prefix', function (done) {
      mockClarity({
        'scroll-depth': 0.6,
        'engagement-score': 0.7
      });

      const config = makeConfig({ targetingPrefix: 'cl' });
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const result = msClaritySubmodule.getTargetingData(['ad-1'], config, {});
        expect(result['ad-1']['cl_scroll']).to.exist;
        expect(result['ad-1']['cl_engagement']).to.exist;
        done();
      }, config, {});
    });

    it('should include frustrated flag when rage clicks > 0', function (done) {
      mockClarity({
        'rage-click-count': 2,
        'engagement-score': 0.3
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const result = msClaritySubmodule.getTargetingData(['ad-1'], makeConfig(), {});
        expect(result['ad-1']['msc_frustrated']).to.equal('true');
        done();
      }, makeConfig(), {});
    });

    it('should respect custom engagement thresholds', function (done) {
      mockClarity({
        'engagement-score': 0.55
      });

      const config = makeConfig({
        engagementScoreThresholds: { low: 0.2, medium: 0.5, high: 0.7 }
      });

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const result = msClaritySubmodule.getTargetingData(['ad-1'], config, {});
        expect(result['ad-1']['msc_engagement']).to.equal('high');
        done();
      }, config, {});
    });
  });

  // ─── Engagement bucketing ─────────────────────────────────────────────────

  describe('engagement bucketing', function () {
    const thresholds = { low: 0.3, medium: 0.6, high: 0.8 };

    function collectAndGetBucket(score, done) {
      mockClarity({ 'engagement-score': score });
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const user = deepAccess(reqBids, 'ortb2Fragments.bidder.appnexus.user.ext.data.msclarity');
        done(user ? user.engagement_bucket : undefined);
      }, makeConfig(), {});
    }

    it('should bucket score < 0.3 as low', function (done) {
      collectAndGetBucket(0.2, function (bucket) {
        expect(bucket).to.equal('low');
        done();
      });
    });

    it('should bucket score 0.3–0.6 as medium', function (done) {
      collectAndGetBucket(0.45, function (bucket) {
        expect(bucket).to.equal('medium');
        done();
      });
    });

    it('should bucket score 0.6–0.8 as high', function (done) {
      collectAndGetBucket(0.7, function (bucket) {
        expect(bucket).to.equal('high');
        done();
      });
    });

    it('should bucket score >= 0.8 as very_high', function (done) {
      collectAndGetBucket(0.9, function (bucket) {
        expect(bucket).to.equal('very_high');
        done();
      });
    });
  });

  // ─── Module metadata ──────────────────────────────────────────────────────

  describe('module metadata', function () {
    it('should have the correct module name', function () {
      expect(msClaritySubmodule.name).to.equal('msClarity');
    });

    it('should expose init, getBidRequestData, and getTargetingData', function () {
      expect(msClaritySubmodule.init).to.be.a('function');
      expect(msClaritySubmodule.getBidRequestData).to.be.a('function');
      expect(msClaritySubmodule.getTargetingData).to.be.a('function');
    });
  });
});
