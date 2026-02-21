import { expect } from 'chai';
import sinon from 'sinon';
import { datamageRtdSubmodule } from 'modules/datamageRtdProvider.js';

describe('datamageRtdSubmodule (DataMage RTD Provider)', function () {
  let sandbox;
  let fetchStub;
  let btoaStub;

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

    // reset module state
    datamageRtdSubmodule._resetForTest();

    // cleanup published globals
    delete window.__DATAMAGE_GPT_TARGETING__;

    // stub fetch
    fetchStub = sandbox.stub(window, 'fetch');

    // keep tests deterministic + allow port-strip assertion via captured arg
    btoaStub = sandbox.stub(window, 'btoa').callsFake((s) => `b64(${s})`);
  });

  afterEach(function () {
    sandbox.restore();
    delete window.__DATAMAGE_GPT_TARGETING__;
  });

  it('should return true (enable submodule)', function () {
    const ok = datamageRtdSubmodule.init({ name: 'datamage', params: { api_key: 'x' } }, {});
    expect(ok).to.equal(true);
  });

  describe('getBidRequestData()', function () {
    it('should call callback quickly (auction_timeout_ms=0) and still inject + publish when fetch resolves later', function (done) {
      const req = makeReqBidsConfigObj();

      // Make fetch resolve "later"
      let resolveFetch;
      fetchStub.returns(new Promise((resolve) => { resolveFetch = resolve; }));

      const rtdConfig = {
        name: 'datamage',
        params: {
          api_key: 'k',
          selector: 'article',
          auction_timeout_ms: 0,
          fetch_timeout_ms: 2500
        }
      };

      datamageRtdSubmodule.getBidRequestData(req, () => {
        // Resolve fetch after callback fires
        resolveFetch({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makeProcessedResponse()),
          text: () => Promise.resolve('')
        });

        setTimeout(() => {
          // ORTB2 fragments injected for bidders
          expect(req.ortb2Fragments.global).to.have.nested.property('site.content.data');
          const dataArr = req.ortb2Fragments.global.site.content.data;
          expect(dataArr).to.be.an('array').with.length.greaterThan(0);
          expect(dataArr[0]).to.have.property('name', 'data-mage.com');
          expect(dataArr[0]).to.have.property('segment');
          expect(dataArr[0].segment).to.deep.include({ id: '596', name: 'Technology & Computing' });

          // GPT targeting published (array format)
          expect(window.__DATAMAGE_GPT_TARGETING__).to.be.an('object');
          expect(window.__DATAMAGE_GPT_TARGETING__.om_iab_cat_ids).to.deep.equal(['596', '597', '52']);
          expect(window.__DATAMAGE_GPT_TARGETING__.om_brand_ids).to.deep.equal(['eefd8446', 'b78b9ee2']);
          expect(window.__DATAMAGE_GPT_TARGETING__.om_res_score).to.deep.equal(['1']);

          // publisher domain removed
          expect(window.__DATAMAGE_GPT_TARGETING__).to.not.have.property('om_publisher_domain');

          done();
        }, 0);
      }, rtdConfig, {});
    });

    it('should NOT inject or publish after non-2xx response', function (done) {
      const req = makeReqBidsConfigObj();

      fetchStub.resolves({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('not found')
      });

      datamageRtdSubmodule.getBidRequestData(req, () => {
        setTimeout(() => {
          expect(req.ortb2Fragments.global).to.not.have.nested.property('site.content.data');
          expect(window.__DATAMAGE_GPT_TARGETING__).to.equal(undefined);
          done();
        }, 0);
      }, { name: 'datamage', params: { api_key: 'k', auction_timeout_ms: 0, fetch_timeout_ms: 50 } }, {});
    });

    it('should not include om_res_score when res_score is null (2xx)', function (done) {
      const req = makeReqBidsConfigObj();

      fetchStub.resolves({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeProcessedResponse({ res_score: null })),
        text: () => Promise.resolve('')
      });

      datamageRtdSubmodule.getBidRequestData(req, () => {
        setTimeout(() => {
          expect(window.__DATAMAGE_GPT_TARGETING__).to.be.an('object');
          expect(window.__DATAMAGE_GPT_TARGETING__).to.not.have.property('om_res_score');
          done();
        }, 0);
      }, { name: 'datamage', params: { api_key: 'k', auction_timeout_ms: 0, fetch_timeout_ms: 50 } }, {});
    });

    it('should strip port from URL before encoding', function (done) {
      const req = makeReqBidsConfigObj();

      fetchStub.resolves({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('not found')
      });

      datamageRtdSubmodule.getBidRequestData(
        req,
        () => {
          try {
            expect(btoaStub.called).to.equal(true);
            const btoaArg = btoaStub.firstCall.args[0];

            expect(btoaArg).to.be.a('string');
            expect(btoaArg).to.not.match(/\/\/[^/]+:\d+\//);

            done();
          } catch (e) {
            done(e);
          }
        },
        { name: 'datamage', params: { api_key: 'k', auction_timeout_ms: 0, fetch_timeout_ms: 50 } },
        {}
      );
    });
  });

  describe('getTargetingData()', function () {
    it('should return {} if no successful 2xx fetch has happened yet', function () {
      const out = datamageRtdSubmodule.getTargetingData([{ code: 'div-1' }], {}, {});
      expect(out).to.deep.equal({});
    });

    it('should return per-adunit targeting (string-joined lists) after 2xx response resolves', function (done) {
      const req = makeReqBidsConfigObj();

      fetchStub.resolves({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeProcessedResponse()),
        text: () => Promise.resolve('')
      });

      datamageRtdSubmodule.getBidRequestData(req, () => {
        setTimeout(() => {
          const out = datamageRtdSubmodule.getTargetingData([{ code: 'div-1' }, { code: 'div-2' }], {}, {});
          expect(out).to.have.property('div-1');
          expect(out).to.have.property('div-2');

          expect(out['div-1']).to.have.property('om_iab_cat_ids', '596,597,52');
          expect(out['div-1']).to.have.property('om_brand_ids', 'eefd8446,b78b9ee2');
          expect(out['div-1']).to.have.property('om_res_score', '1');

          // publisher domain removed
          expect(out['div-1']).to.not.have.property('om_publisher_domain');

          done();
        }, 0);
      }, { name: 'datamage', params: { api_key: 'k', auction_timeout_ms: 0, fetch_timeout_ms: 50 } }, {});
    });

    it('should ignore ad units missing code', function (done) {
      const req = makeReqBidsConfigObj();

      fetchStub.resolves({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeProcessedResponse()),
        text: () => Promise.resolve('')
      });

      datamageRtdSubmodule.getBidRequestData(req, () => {
        setTimeout(() => {
          const out = datamageRtdSubmodule.getTargetingData([{ code: 'div-1' }, {}, { code: null }], {}, {});
          expect(out).to.have.property('div-1');
          expect(Object.keys(out)).to.deep.equal(['div-1']);
          done();
        }, 0);
      }, { name: 'datamage', params: { api_key: 'k', auction_timeout_ms: 0, fetch_timeout_ms: 50 } }, {});
    });
  });
});
