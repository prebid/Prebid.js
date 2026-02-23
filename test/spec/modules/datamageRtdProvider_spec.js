import { expect } from 'chai';
import sinon from 'sinon';
import { datamageRtdSubmodule } from 'modules/datamageRtdProvider.js';
import * as ajaxUtils from 'src/ajax.js';
import * as utils from 'src/utils.js';

describe('datamageRtdSubmodule (DataMage RTD Provider)', function () {
  let sandbox;
  let ajaxBuilderStub;
  let setTargetingStub;
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

    // Mock window.googletag and spy on setTargeting
    setTargetingStub = sandbox.stub();
    window.googletag = {
      cmd: {
        push: function (fn) { fn(); } // Execute immediately for testing
      },
      pubads: function () {
        return { setTargeting: setTargetingStub };
      }
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
    it('should return true and trigger GAM injection asynchronously', function (done) {
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      const ok = datamageRtdSubmodule.init({ name: 'datamage', params: { api_key: 'x' } }, {});
      expect(ok).to.equal(true);

      // Simulate the API resolving
      const callbacks = fakeAjax.firstCall.args[1];
      callbacks.success(JSON.stringify(makeProcessedResponse()));

      // Use setTimeout to wait for the Promise chain to resolve
      setTimeout(() => {
        expect(setTargetingStub.calledWith('om_iab_cat_ids', ['596', '597', '52'])).to.be.true;
        expect(setTargetingStub.calledWith('om_brand_ids', ['eefd8446', 'b78b9ee2'])).to.be.true;
        expect(setTargetingStub.calledWith('om_res_score', ['1'])).to.be.true;
        expect(setTargetingStub.calledWith('om_restricted_cat_ids')).to.be.false;
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
        expect(setTargetingStub.called).to.be.false;
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
  });

  describe('getTargetingData()', function () {
    it('should return {} if no successful fetch has happened yet', function () {
      const out = datamageRtdSubmodule.getTargetingData([{ code: 'div-1' }], {}, {});
      expect(out).to.deep.equal({});
    });

    it('should return per-adunit legacy targeting (string-joined lists) after response resolves', function (done) {
      const req = makeReqBidsConfigObj();
      let fakeAjax = sinon.stub();
      ajaxBuilderStub.returns(fakeAjax);

      datamageRtdSubmodule.getBidRequestData(req, () => {
        const out = datamageRtdSubmodule.getTargetingData([{ code: 'div-1' }, { code: 'div-2' }], {}, {});
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
