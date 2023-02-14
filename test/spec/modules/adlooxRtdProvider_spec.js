import adapterManager from 'src/adapterManager.js';
import analyticsAdapter from 'modules/adlooxAnalyticsAdapter.js';
import {auctionManager} from 'src/auctionManager.js';
import { config as _config } from 'src/config.js';
import { expect } from 'chai';
import * as events from 'src/events.js';
import * as prebidGlobal from 'src/prebidGlobal.js';
import { subModuleObj as rtdProvider } from 'modules/adlooxRtdProvider.js';
import * as utils from 'src/utils.js';

const analyticsAdapterName = 'adloox';

describe('Adloox RTD Provider', function () {
  let sandbox;

  const adUnit = {
    code: 'ad-slot-1',
    ortb2Imp: {
      ext: {
        data: {
          pbadslot: '/123456/home/ad-slot-1'
        }
      }
    },
    mediaTypes: {
      banner: {
        sizes: [ [300, 250] ]
      }
    },
    bids: [
      {
        bidder: 'dummy'
      }
    ]
  };

  const analyticsOptions = {
    js: 'https://j.adlooxtracking.com/ads/js/tfav_adl_%%clientid%%.js',
    client: 'adlooxtest',
    clientid: 127,
    platformid: 0,
    tagid: 0
  };

  const config = {};

  adapterManager.registerAnalyticsAdapter({
    code: analyticsAdapterName,
    adapter: analyticsAdapter
  });

  before(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(events, 'getEvents').returns([]);
  });

  after(function () {
    sandbox.restore();
    sandbox = undefined;
  });

  describe('invalid config', function () {
    it('should require config', function (done) {
      const ret = rtdProvider.init();

      expect(ret).is.false;

      done();
    });

    it('should reject non-object config.params', function (done) {
      const ret = rtdProvider.init({ params: null });

      expect(ret).is.false;

      done();
    });

    it('should reject less than one config.params.imps', function (done) {
      const ret = rtdProvider.init({ params: { imps: 0 } });

      expect(ret).is.false;

      done();
    });

    it('should reject negative config.params.freqcap_ip', function (done) {
      const ret = rtdProvider.init({ params: { freqcap_ip: -1 } });

      expect(ret).is.false;

      done();
    });

    it('should reject negative integer config.params.freqcap_ipua', function (done) {
      const ret = rtdProvider.init({ params: { freqcap_ipua: -1 } });

      expect(ret).is.false;

      done();
    });

    it('should reject non-array of integers with value greater than zero config.params.thresholds', function (done) {
      const ret = rtdProvider.init({ params: { thresholds: [ 70, null ] } });

      expect(ret).is.false;

      done();
    });

    it('should reject non-boolean config.params.slotinpath', function (done) {
      const ret = rtdProvider.init({ params: { slotinpath: null } });

      expect(ret).is.false;

      done();
    });

    it('should reject invalid config.params.params (legacy/deprecated)', function (done) {
      const ret = rtdProvider.init({ params: { params: { clientid: 0, tagid: 0 } } });

      expect(ret).is.false;

      done();
    });
  });

  describe('process segments', function () {
    before(function () {
      adapterManager.enableAnalytics({
        provider: analyticsAdapterName,
        options: analyticsOptions
      });
      expect(analyticsAdapter.context).is.not.null;
    });

    after(function () {
      analyticsAdapter.disableAnalytics();
      expect(analyticsAdapter.context).is.null;
    });

    let server = null;
    let CONFIG = null;
    beforeEach(function () {
      server = sinon.createFakeServer();
      CONFIG = utils.deepClone(config);
    });
    afterEach(function () {
      CONFIG = null;
      server.restore();
      server = null;
    });

    it('should fetch segments', function (done) {
      const req = {
        adUnitCodes: [ adUnit.code ],
        ortb2Fragments: {
          global: {
            site: {
              ext: {
                data: {
                }
              }
            },
            user: {
              ext: {
                data: {
                }
              }
            }
          }
        }
      };
      const adUnitWithSegments = utils.deepClone(adUnit);
      const getGlobalStub = sinon.stub(prebidGlobal, 'getGlobal').returns({
        adUnits: [ adUnitWithSegments ]
      });

      const ret = rtdProvider.init(CONFIG);
      expect(ret).is.true;

      const callback = function () {
        const ortb2 = req.ortb2Fragments.global;
        expect(ortb2.site.ext.data.adloox_rtd.ok).is.true;
        expect(ortb2.site.ext.data.adloox_rtd.nope).is.undefined;
        expect(ortb2.user.ext.data.adloox_rtd.unused).is.false;
        expect(ortb2.user.ext.data.adloox_rtd.nope).is.undefined;
        expect(adUnitWithSegments.ortb2Imp.ext.data.adloox_rtd.dis.length).is.equal(3);
        expect(adUnitWithSegments.ortb2Imp.ext.data.adloox_rtd.nope).is.undefined;

        getGlobalStub.restore();

        done();
      };
      rtdProvider.getBidRequestData(req, callback, CONFIG, null);

      const request = server.requests[0];
      const response = { unused: false, _: [ { d: 77 } ] };
      request.respond(200, { 'content-type': 'application/json' }, JSON.stringify(response));
    });

    it('should set ad server targeting', function (done) {
      const adUnitWithSegments = utils.deepClone(adUnit);
      utils.deepSetValue(adUnitWithSegments, 'ortb2Imp.ext.data.adloox_rtd.dis', [ 50, 60 ]);
      const getGlobalStub = sinon.stub(prebidGlobal, 'getGlobal').returns({
        adUnits: [ adUnitWithSegments ]
      });

      const auction = { adUnits: [ adUnitWithSegments ] };
      const getAuctionStub = sinon.stub(auctionManager.index, 'getAuction').returns({
        adUnits: [ adUnitWithSegments ],
        getFPD: () => { return { global: { site: { ext: { data: { adloox_rtd: { ok: true } } } } } } }
      });

      const targetingData = rtdProvider.getTargetingData([ adUnitWithSegments.code ], CONFIG, null, auction);
      expect(Object.keys(targetingData).length).is.equal(1);
      expect(Object.keys(targetingData[adUnit.code]).length).is.equal(2);
      expect(targetingData[adUnit.code].adl_ok).is.equal(1);
      expect(targetingData[adUnit.code].adl_dis.length).is.equal(2);

      getAuctionStub.restore();
      getGlobalStub.restore();

      done();
    });
  });
});
