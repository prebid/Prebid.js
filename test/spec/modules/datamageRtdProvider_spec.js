import { expect } from 'chai';
import sinon from 'sinon';
import { datamageRtdSubmodule } from 'modules/datamageRtdProvider.js';
import * as ajaxUtils from 'src/ajax.js';
import * as utils from 'src/utils.js';

describe('datamageRtdSubmodule (DataMage RTD Provider)', function () {
  let sandbox;
  let ajaxBuilderStub;
  let setConfigStub;
  let btoaStub;
  let origGoogletag; // Stores the original global to prevent breaking other tests

  function makeReqBidsConfigObj() {
    return {
      auctionId: 'auction-1',
      ortb2Fragments: { global: {} }
    };
  }

  function makeProcessedResponse(overrides = {}) {
    return {
      content_classification: {
        ops_mage_data_id: '7d54b2d30a4e441a0f698dfae8f5b1b5',
        res_score: 1,
        res_score_bucket: 'high',
        iab_cats: [
          'Technology & Computing',
          'Technology & Computing|Artificial Intelligence',
          'Business & Finance'
        ],
        iab_cat_ids: ['596', '597', '52'],
        brand_ids: ['eefd8446', 'b78b9ee2'],
        sentiment_ids: ['95487831', '92bfd7eb'],
        location_ids: ['60efc224'],
        public_figure_ids: ['55eefb4a'],
        restricted_cat_ids: [],
        ...overrides
      }
    };
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    // Stub logging so they don't spam the test console
    sandbox.stub(utils, 'logInfo');
    sandbox.stub(utils, 'logWarn');
    sandbox.stub(utils, 'logError');

    // Reset module-scoped cache
    datamageRtdSubmodule._resetForTest();

    // Safely backup the original googletag object
    origGoogletag = window.googletag;

    // Mock window.googletag and spy on setConfig
    setConfigStub = sandbox.stub();
    window.googletag = {
      cmd: {
        push: function (fn) { fn(); } // Execute immediately for testing
      },
      setConfig: setConfigStub
    };

    // Stub Prebid's internal ajaxBuilder
    ajaxBuilderStub = sandbox.stub(ajaxUtils, 'ajaxBuilder');

    // Keep tests deterministic + allow port-strip assertion
    btoaStub = sandbox.stub(window, 'btoa').callsFake((s) => `b64(${s})`);
  });

  afterEach(function () {
    sandbox.restore();
    // Restore the original googletag object so we don't break the E-Planning adapter
    window.googletag = origGoogletag;
  });

  describe('init()', function () {
    it('should return true and trigger GAM injection asynchronously via setConfig', function (done) {
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      const ok = datamageRtdSubmodule.init({ name: 'datamage', params: { api_key: 'x' } }, {});
      expect(ok).to.equal(true);

      // Simulate the API resolving
      const callbacks = fakeAjax.firstCall.args[1];
      callbacks.success(JSON.stringify(makeProcessedResponse()));

      // Use setTimeout to wait for the Promise chain to resolve
      setTimeout(() => {
        expect(setConfigStub.calledOnce).to.be.true;

        const configArg = setConfigStub.firstCall.args[0];
        expect(configArg).to.have.property('targeting');

        const targeting = configArg.targeting;
        expect(targeting).to.have.property('om_iab_cat_ids').that.deep.equals(['596', '597', '52']);
        expect(targeting).to.have.property('om_brand_ids').that.deep.equals(['eefd8446', 'b78b9ee2']);
        expect(targeting).to.have.property('om_res_score').that.deep.equals(['1']);
        expect(targeting).to.not.have.property('om_restricted_cat_ids');

        done();
      }, 0);
    });
  });

  describe('getBidRequestData()', function () {
    it('should inject into ORTB2 when fetch resolves', function (done) {
      const req = makeReqBidsConfigObj();
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      const rtdConfig = {
        name: 'datamage',
        params: { api_key: 'k', selector: 'article' }
      };

      datamageRtdSubmodule.getBidRequestData(req, () => {
        expect(req.ortb2Fragments.global).to.have.nested.property('site.content.data');
        const dataArr = req.ortb2Fragments.global.site.content.data;
        expect(dataArr).to.be.an('array').with.length.greaterThan(0);
        expect(dataArr[0]).to.have.property('name', 'data-mage.com');
        expect(dataArr[0]).to.have.property('segment');
        expect(dataArr[0].segment).to.deep.include({ id: '596', name: 'Technology & Computing' });
        done();
      }, rtdConfig, {});

      const callbacks = fakeAjax.firstCall.args[1];
      callbacks.success(JSON.stringify(makeProcessedResponse()));
    });

    it('should only make ONE network request when init and getBidRequestData are both called (Memoization)', function (done) {
      const req = makeReqBidsConfigObj();
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      const rtdConfig = { params: { api_key: 'k' } };

      // 1. Init fires (simulating page load)
      datamageRtdSubmodule.init(rtdConfig);

      // 2. getBidRequestData fires (simulating auction start)
      datamageRtdSubmodule.getBidRequestData(req, () => {
        // Assert the network was only hit once despite two entry points
        expect(fakeAjax.calledOnce).to.be.true;
        done();
      }, rtdConfig, {});

      const callbacks = fakeAjax.firstCall.args[1];
      callbacks.success(JSON.stringify(makeProcessedResponse()));
    });

    it('should NOT inject after network error', function (done) {
      const req = makeReqBidsConfigObj();
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      datamageRtdSubmodule.getBidRequestData(req, () => {
        expect(req.ortb2Fragments.global.site?.content?.data).to.be.undefined;
        expect(setConfigStub.called).to.be.false;
        done();
      }, { name: 'datamage', params: { api_key: 'k' } }, {});

      const callbacks = fakeAjax.firstCall.args[1];
      callbacks.error('Network Failed');
    });

    it('should strip port from URL before encoding', function (done) {
      const req = makeReqBidsConfigObj();
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      datamageRtdSubmodule.getBidRequestData(req, () => {
        expect(btoaStub.called).to.equal(true);
        const btoaArg = btoaStub.firstCall.args[0];

        expect(btoaArg).to.be.a('string');
        expect(btoaArg).to.not.match(/\/\/[^/]+:\d+\//);
        done();
      }, { name: 'datamage', params: { api_key: 'k' } }, {});

      const callbacks = fakeAjax.firstCall.args[1];
      callbacks.error('err');
    });

    it('should gracefully handle btoa encoding failures without crashing the auction', function (done) {
      const req = makeReqBidsConfigObj();
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      // Force btoa to throw an error (simulating a Latin-1 DOMException for unhandled characters)
      btoaStub.throws(new Error('String contains an invalid character'));

      datamageRtdSubmodule.getBidRequestData(req, () => {
        // 1. Ensure the auction still releases (callback is fired)
        expect(fakeAjax.calledOnce).to.be.true;

        // 2. Ensure the API URL was still built, just with an empty content_id
        const ajaxUrl = fakeAjax.firstCall.args[0];
        expect(ajaxUrl).to.include('content_id=');
        expect(ajaxUrl).to.not.include('content_id=b64'); // Should not contain our stub's prefix

        done();
      }, { name: 'datamage', params: { api_key: 'k' } }, {});

      const callbacks = fakeAjax.firstCall.args[1];
      callbacks.error('err');
    });

    it('should strip common tracking parameters from the URL before encoding', function (done) {
      const req = makeReqBidsConfigObj();
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      // 1. Store the original URL so we can restore it cleanly
      const originalUrl = window.location.href;

      // 2. Use the History API to safely append query parameters without redefining the location object
      window.history.replaceState({}, '', '?utm_source=fb&id=42&gclid=123');

      datamageRtdSubmodule.getBidRequestData(req, () => {
        const btoaArg = btoaStub.firstCall.args[0];

        // 3. Ensure tracking params are gone, but valid params remain
        expect(btoaArg).to.not.include('utm_source');
        expect(btoaArg).to.not.include('gclid');
        expect(btoaArg).to.include('id=42');

        // 4. Restore the original URL so we don't pollute other tests
        window.history.replaceState({}, '', originalUrl);
        done();
      }, { name: 'datamage', params: { api_key: 'k' } }, {});

      const callbacks = fakeAjax.firstCall.args[1];
      callbacks.error('err');
    });

    it('should clear stale cache (lastTargeting) if the fetch yields no payload', function (done) {
      const req1 = makeReqBidsConfigObj();
      const req2 = makeReqBidsConfigObj();
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      const rtdConfig = { name: 'datamage', params: { api_key: 'k' } };

      // 1. First auction: successful fetch populates the cache
      datamageRtdSubmodule.getBidRequestData(req1, () => {
        // 2. Verify cache is populated
        let out = datamageRtdSubmodule.getTargetingData(['div-1'], {}, {});
        expect(out['div-1']).to.have.property('om_res_score', '1');

        // 3. Reset module state safely via the internal helper
        datamageRtdSubmodule._resetForTest();

        // 4. Second auction: simulate an empty response
        datamageRtdSubmodule.getBidRequestData(req2, () => {
          // 5. Verify the cache was wiped out
          out = datamageRtdSubmodule.getTargetingData(['div-1'], {}, {});
          expect(out).to.deep.equal({});
          done();
        }, rtdConfig, {});

        // Resolve the second auction with an empty payload
        const callbacks2 = fakeAjax.secondCall.args[1];
        callbacks2.success(JSON.stringify({}));
      }, rtdConfig, {});

      // Resolve the first auction with a good payload
      const callbacks1 = fakeAjax.firstCall.args[1];
      callbacks1.success(JSON.stringify(makeProcessedResponse()));
    });
  });

  describe('getTargetingData()', function () {
    it('should return {} if no successful fetch has happened yet', function () {
      const out = datamageRtdSubmodule.getTargetingData(['div-1'], {}, {});
      expect(out).to.deep.equal({});
    });

    it('should return per-adunit legacy targeting (string-joined lists) after response resolves', function (done) {
      const req = makeReqBidsConfigObj();
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      datamageRtdSubmodule.getBidRequestData(req, () => {
        const out = datamageRtdSubmodule.getTargetingData(['div-1', 'div-2'], {}, {});
        expect(out).to.have.property('div-1');
        expect(out).to.have.property('div-2');

        expect(out['div-1']).to.have.property('om_iab_cat_ids', '596,597,52');
        expect(out['div-1']).to.have.property('om_brand_ids', 'eefd8446,b78b9ee2');
        expect(out['div-1']).to.have.property('om_res_score', '1');

        done();
      }, { name: 'datamage', params: { api_key: 'k' } }, {});

      const callbacks = fakeAjax.firstCall.args[1];
      callbacks.success(JSON.stringify(makeProcessedResponse()));
    });
  });
});
