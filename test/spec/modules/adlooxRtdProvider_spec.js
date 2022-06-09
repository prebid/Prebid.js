import adapterManager from 'src/adapterManager.js';
import analyticsAdapter from 'modules/adlooxAnalyticsAdapter.js';
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

    it('should reject non-string config.params.api_origin', function (done) {
      const ret = rtdProvider.init({ params: { api_origin: null } });

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
    let __config = null, CONFIG = null;
    let getConfigStub, setConfigStub;
    beforeEach(function () {
      server = sinon.createFakeServer();
      __config = {};
      CONFIG = utils.deepClone(config);
      getConfigStub = sinon.stub(_config, 'getConfig').callsFake(function (path) {
        return utils.deepAccess(__config, path);
      });
      setConfigStub = sinon.stub(_config, 'setConfig').callsFake(function (obj) {
        utils.mergeDeep(__config, obj);
      });
    });
    afterEach(function () {
      setConfigStub.restore();
      getConfigStub.restore();
      getConfigStub = setConfigStub = undefined;
      CONFIG = null;
      __config = null;
      server.restore();
      server = null;
    });

    it('should fetch segments', function (done) {
      const req = {};
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
      utils.deepSetValue(__config, 'ortb2.site.ext.data.adloox_rtd.ok', true);

      const adUnitWithSegments = utils.deepClone(adUnit);
      utils.deepSetValue(adUnitWithSegments, 'ortb2Imp.ext.data.adloox_rtd.dis', [ 50, 60 ]);
      const getGlobalStub = sinon.stub(prebidGlobal, 'getGlobal').returns({
        adUnits: [ adUnitWithSegments ]
      });

      const targetingData = rtdProvider.getTargetingData([ adUnitWithSegments.code ], CONFIG, null, {
        getFPD: () => ({
          global: __config.ortb2
        })
      });
      expect(Object.keys(targetingData).length).is.equal(1);
      expect(Object.keys(targetingData[adUnit.code]).length).is.equal(2);
      expect(targetingData[adUnit.code].adl_ok).is.equal(1);
      expect(targetingData[adUnit.code].adl_dis.length).is.equal(2);

      getGlobalStub.restore();

      done();
    });
  });

  describe('measure atf', function () {
    const adUnitCopy = utils.deepClone(adUnit);

    const ratio = 0.38;
    const [ [width, height] ] = utils.getAdUnitSizes(adUnitCopy);

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

    it(`should return ${ratio} for same-origin`, function (done) {
      const el = document.createElement('div');
      el.setAttribute('id', adUnitCopy.code);

      const offset = height * ratio;
      const elStub = sinon.stub(el, 'getBoundingClientRect').returns({
        top: 0 - (height - offset),
        bottom: height - offset,
        left: 0,
        right: width
      });

      const querySelectorStub = sinon.stub(document, 'querySelector');
      querySelectorStub.withArgs(`#${adUnitCopy.code}`).returns(el);

      rtdProvider.atf(adUnitCopy, function(x) {
        expect(x).is.equal(ratio);

        querySelectorStub.restore();
        elStub.restore();

        done();
      });
    });

    ('IntersectionObserver' in window ? it : it.skip)(`should return ${ratio} for cross-origin`, function (done) {
      const frameElementStub = sinon.stub(window, 'frameElement').value(null);

      const el = document.createElement('div');
      el.setAttribute('id', adUnitCopy.code);

      const elStub = sinon.stub(el, 'getBoundingClientRect').returns({
        top: 0,
        bottom: height,
        left: 0,
        right: width
      });

      const querySelectorStub = sinon.stub(document, 'querySelector');
      querySelectorStub.withArgs(`#${adUnitCopy.code}`).returns(el);

      let intersectionObserverStubFn = null;
      const intersectionObserverStub = sinon.stub(window, 'IntersectionObserver').callsFake((fn) => {
        intersectionObserverStubFn = fn;
        return {
          observe: (element) => {
            expect(element).is.equal(el);

            intersectionObserverStubFn([{
              target: element,
              intersectionRect: { width, height },
              intersectionRatio: ratio
            }]);
          },
          unobserve: (element) => {
            expect(element).is.equal(el);
          }
        }
      });

      rtdProvider.atf(adUnitCopy, function(x) {
        expect(x).is.equal(ratio);

        intersectionObserverStub.restore();
        querySelectorStub.restore();
        elStub.restore();
        frameElementStub.restore();

        done();
      });
    });
  });
});
