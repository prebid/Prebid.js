import { expect } from 'chai';
import sinon from 'sinon';
import {
  msClaritySubmodule,
  scrollBucket,
  dwellBucket,
  frustrationBucket,
  interactionBucket,
  engagementBucket,
  buildFeatures,
  buildSegments,
  loadFromStorage,
  storage,
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
      const result = msClaritySubmodule.init(makeConfig({ projectId: undefined }));
      expect(result).to.be.false;
    });

    it('should return false when projectId is empty string', function () {
      const result = msClaritySubmodule.init(makeConfig({ projectId: '' }));
      expect(result).to.be.false;
    });

    it('should NOT inject Clarity when injectClarity is not set', function () {
      const result = msClaritySubmodule.init(makeConfig());
      expect(result).to.be.true;
      // Clarity should NOT be injected by default
      const tag = document.querySelector('script[src*="clarity.ms/tag/test-project-123"]');
      expect(tag).to.not.exist;
    });

    it('should inject Clarity when injectClarity is true', function () {
      const result = msClaritySubmodule.init(makeConfig({ injectClarity: true }));
      expect(result).to.be.true;
      expect(typeof window.clarity).to.equal('function');
      const tag = document.querySelector('script[src*="clarity.ms/tag/test-project-123"]');
      expect(tag).to.exist;
    });

    it('should return true when Clarity is already present', function () {
      window.clarity = function () {};
      const result = msClaritySubmodule.init(makeConfig());
      expect(result).to.be.true;
    });

    it('should return true without bidders param', function () {
      window.clarity = function () {};
      const result = msClaritySubmodule.init(makeConfig());
      expect(result).to.be.true;
    });

    it('should not inject when injectClarity is true but Clarity is already present', function () {
      window.clarity = function () {};
      const result = msClaritySubmodule.init(makeConfig({ injectClarity: true }));
      expect(result).to.be.true;
      // Only the pre-existing Clarity function, no script tag injected
      const tag = document.querySelector('script[src*="clarity.ms/tag/test-project-123"]');
      expect(tag).to.not.exist;
    });
  });

  // ─── getBidRequestData() ──────────────────────────────────────────────────

  describe('getBidRequestData()', function () {
    let storageGetStub;
    let storageSetStub;

    beforeEach(function () {
      window.clarity = function () {};
      msClaritySubmodule.init(makeConfig());
      storageGetStub = sandbox.stub(storage, 'getDataFromLocalStorage');
      storageSetStub = sandbox.stub(storage, 'setDataInLocalStorage');
    });

    it('should always call the callback', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, done, makeConfig());
    });

    it('should write all 5 features to global site.ext.data.msclarity', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const site = deepAccess(reqBids, 'ortb2Fragments.global.site.ext.data.msclarity');
        expect(site).to.exist;
        expect(site).to.have.all.keys(
          'engagement', 'dwell', 'scroll', 'frustration', 'interaction'
        );
        Object.values(site).forEach(v => expect(v).to.be.a('string'));
        done();
      }, makeConfig());
    });

    it('should NOT write to ortb2Fragments.bidder', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        expect(reqBids.ortb2Fragments.bidder).to.deep.equal({});
        done();
      }, makeConfig());
    });

    it('should write user.data segments to global', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const userData = deepAccess(reqBids, 'ortb2Fragments.global.user.data');
        expect(userData).to.be.an('array').with.lengthOf(1);
        expect(userData[0].name).to.equal('msclarity');
        expect(userData[0].segment).to.be.an('array').with.lengthOf(5);
        userData[0].segment.forEach(seg => {
          expect(seg.id).to.be.a('string');
          expect(seg.id).to.match(/^(engagement|dwell|scroll|frustration|interaction)_/);
        });
        done();
      }, makeConfig());
    });

    it('should append to existing user.data', function (done) {
      const reqBids = makeReqBidsConfigObj();
      reqBids.ortb2Fragments.global = {
        user: { data: [{ name: 'existing', segment: [{ id: '123' }] }] }
      };
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const userData = deepAccess(reqBids, 'ortb2Fragments.global.user.data');
        expect(userData).to.be.an('array').with.lengthOf(2);
        expect(userData[0].name).to.equal('existing');
        expect(userData[1].name).to.equal('msclarity');
        done();
      }, makeConfig());
    });

    it('should build keywords with bucketed values', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.global.site.keywords');
        expect(kw).to.be.a('string');
        expect(kw).to.include('msc_engagement=');
        expect(kw).to.include('msc_dwell=');
        expect(kw).to.include('msc_scroll=');
        expect(kw).to.include('msc_interaction=');
        // stage and scroll_pattern should NOT appear
        expect(kw).to.not.include('msc_stage=');
        expect(kw).to.not.include('msc_scroll_pattern=');
        done();
      }, makeConfig());
    });

    it('should use custom targetingPrefix', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.global.site.keywords');
        expect(kw).to.include('cl_scroll=');
        expect(kw).to.include('cl_engagement=');
        done();
      }, makeConfig({ targetingPrefix: 'cl' }));
    });

    it('should append to existing keywords', function (done) {
      const reqBids = makeReqBidsConfigObj();
      reqBids.ortb2Fragments.global = {
        site: { keywords: 'existing_kw=value' }
      };
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.global.site.keywords');
        expect(kw).to.include('existing_kw=value');
        expect(kw).to.include('msc_scroll=');
        done();
      }, makeConfig());
    });

    it('should not include frustration keyword when frustration is none', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const kw = deepAccess(reqBids, 'ortb2Fragments.global.site.keywords');
        // Fresh tracker has 0 rage + 0 unresponsive = 'none', so no frustration keyword
        expect(kw).to.not.include('msc_frustration=');
        done();
      }, makeConfig());
    });

    it('should persist features to localStorage', function (done) {
      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        expect(storageSetStub.calledOnce).to.be.true;
        const [key, value] = storageSetStub.firstCall.args;
        expect(key).to.equal('msc_rtd_signals');
        const parsed = JSON.parse(value);
        expect(parsed.ts).to.be.a('number');
        expect(parsed.features).to.have.all.keys(
          'engagement', 'dwell', 'scroll', 'frustration', 'interaction'
        );
        done();
      }, makeConfig());
    });

    it('should use warm-start from localStorage when features are baseline', function (done) {
      const cachedFeatures = {
        engagement: 'high',
        dwell: 'moderate',
        scroll: 'deep',
        frustration: 'none',
        interaction: 'active',
      };
      storageGetStub.returns(JSON.stringify({
        ts: Date.now() - 60000, // 1 minute ago — within TTL
        features: cachedFeatures
      }));

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const site = deepAccess(reqBids, 'ortb2Fragments.global.site.ext.data.msclarity');
        expect(site.engagement).to.equal('high');
        expect(site.dwell).to.equal('moderate');
        expect(site.scroll).to.equal('deep');
        done();
      }, makeConfig());
    });

    it('should NOT use warm-start when localStorage data is expired', function (done) {
      const cachedFeatures = {
        engagement: 'high',
        dwell: 'moderate',
        scroll: 'deep',
        frustration: 'none',
        interaction: 'active',
      };
      storageGetStub.returns(JSON.stringify({
        ts: Date.now() - (31 * 60 * 1000), // 31 minutes ago — expired
        features: cachedFeatures
      }));

      const reqBids = makeReqBidsConfigObj();
      msClaritySubmodule.getBidRequestData(reqBids, function () {
        const site = deepAccess(reqBids, 'ortb2Fragments.global.site.ext.data.msclarity');
        // Should be baseline since cached data expired
        expect(site.engagement).to.equal('low');
        expect(site.dwell).to.equal('bounce');
        expect(site.scroll).to.equal('none');
        done();
      }, makeConfig());
    });

    it('should handle errors gracefully and still call callback', function (done) {
      // Passing null will cause an error inside the try block
      msClaritySubmodule.getBidRequestData(null, function () {
        done();
      }, makeConfig());
    });
  });

  // ─── buildFeatures() ─────────────────────────────────────────────────────

  describe('buildFeatures()', function () {
    beforeEach(function () {
      window.clarity = function () {};
      msClaritySubmodule.init(makeConfig());
    });

    it('should return all 5 features', function () {
      const features = buildFeatures();
      expect(features).to.have.all.keys(
        'engagement', 'dwell', 'scroll', 'frustration', 'interaction'
      );
    });

    it('should NOT include removed features', function () {
      const features = buildFeatures();
      expect(features).to.not.have.property('scroll_pattern');
      expect(features).to.not.have.property('stage');
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
    });
  });

  // ─── buildSegments() ─────────────────────────────────────────────────────

  describe('buildSegments()', function () {
    it('should return an object with name and segment array', function () {
      const features = {
        engagement: 'high',
        dwell: 'moderate',
        scroll: 'deep',
        frustration: 'none',
        interaction: 'active',
      };
      const result = buildSegments(features);
      expect(result.name).to.equal('msclarity');
      expect(result.segment).to.be.an('array').with.lengthOf(5);
    });

    it('should format segment IDs as feature_value', function () {
      const features = {
        engagement: 'high',
        dwell: 'moderate',
        scroll: 'deep',
        frustration: 'none',
        interaction: 'active',
      };
      const result = buildSegments(features);
      const ids = result.segment.map(s => s.id);
      expect(ids).to.include('engagement_high');
      expect(ids).to.include('dwell_moderate');
      expect(ids).to.include('scroll_deep');
      expect(ids).to.include('frustration_none');
      expect(ids).to.include('interaction_active');
    });
  });

  // ─── loadFromStorage() ────────────────────────────────────────────────────

  describe('loadFromStorage()', function () {
    let storageGetStub;

    beforeEach(function () {
      storageGetStub = sandbox.stub(storage, 'getDataFromLocalStorage');
    });

    it('should return null when no data in localStorage', function () {
      storageGetStub.returns(null);
      expect(loadFromStorage()).to.be.null;
    });

    it('should return features when data is within TTL', function () {
      const features = { engagement: 'high', dwell: 'moderate', scroll: 'deep', frustration: 'none', interaction: 'active' };
      storageGetStub.returns(JSON.stringify({ ts: Date.now() - 60000, features }));
      expect(loadFromStorage()).to.deep.equal(features);
    });

    it('should return null when data is expired', function () {
      const features = { engagement: 'high', dwell: 'moderate', scroll: 'deep', frustration: 'none', interaction: 'active' };
      storageGetStub.returns(JSON.stringify({ ts: Date.now() - (31 * 60 * 1000), features }));
      expect(loadFromStorage()).to.be.null;
    });

    it('should return null for malformed JSON', function () {
      storageGetStub.returns('not-valid-json');
      expect(loadFromStorage()).to.be.null;
    });
  });

  // ─── resetTracker() ──────────────────────────────────────────────────────

  describe('resetTracker()', function () {
    it('should reset all tracker state to baseline', function () {
      window.clarity = function () {};
      msClaritySubmodule.init(makeConfig());

      resetTracker();
      const features = buildFeatures();
      expect(features.scroll).to.equal('none');
      expect(features.dwell).to.equal('bounce');
      expect(features.frustration).to.equal('none');
      expect(features.interaction).to.equal('passive');
    });

    it('should allow re-initialization after reset', function () {
      window.clarity = function () {};
      msClaritySubmodule.init(makeConfig());
      resetTracker();
      // Re-init should succeed
      const result = msClaritySubmodule.init(makeConfig());
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
