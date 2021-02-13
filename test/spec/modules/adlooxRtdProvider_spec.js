import adapterManager from 'src/adapterManager.js';
import analyticsAdapter from 'modules/adlooxAnalyticsAdapter.js';
import { config as _config } from 'src/config.js';
import { expect } from 'chai';
import events from 'src/events.js';
import * as prebidGlobal from 'src/prebidGlobal.js';
import { subModuleObj as rtdProvider } from 'modules/adlooxRtdProvider.js';
import * as utils from 'src/utils.js';

const analyticsAdapterName = 'adloox';

describe('Adloox RTD Provider', function () {
  let sandbox;

  const analyticsOptions = {
    js: 'https://j.adlooxtracking.com/ads/js/tfav_adl_%%clientid%%.js',
    client: 'adlooxtest',
    clientid: 127,
    platformid: 0,
    tagid: 0
  };

  const config = {
    params: {
      js: 'https://p.adlooxtracking.com/gpt/a.js'
    }
  };

  adapterManager.registerAnalyticsAdapter({
    code: analyticsAdapterName,
    adapter: analyticsAdapter
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(events, 'getEvents').returns([]);

    adapterManager.enableAnalytics({
      provider: analyticsAdapterName,
      options: analyticsOptions
    });
    expect(analyticsAdapter.context).is.not.null;
  });

  afterEach(function () {
    analyticsAdapter.disableAnalytics();
    expect(analyticsAdapter.context).is.null;

    sandbox.restore();
    sandbox = undefined;
  });

  describe('init', function () {
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

      it('should reject non-string config.params.js', function (done) {
        const ret = rtdProvider.init({ params: { js: null } });

        expect(ret).is.false;

        done();
      });

      it('should reject invalid config.params.params (legacy/deprecated)', function (done) {
        const ret = rtdProvider.init({ params: { params: { clientid: 0, tagid: 0 } } });

        expect(ret).is.false;

        done();
      });
    });
  });

  describe('getBidRequestData before init', function () {
    it('should return undefined', function (done) {
      let called = false;
      const ret = rtdProvider.getBidRequestData({}, function () { called = true }, config);

      expect(ret).is.undefined;
      expect(called).is.false;

      done();
    });
  });

  describe('process segments', function () {
    it('should inject JS and init script', function (done) {
      const adUnit = {
        code: 'ad-slot-1',
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

      const adUnits = [
        adUnit
      ];

      sandbox.stub(prebidGlobal, 'getGlobal').returns({
        adUnits: adUnits
      });

      let __config = {
        realTimeData: {
          auctionDelay: 699
        }
      };
      sandbox.stub(_config, 'getConfig').callsFake(function (path) {
        return utils.deepAccess(__config, path);
      });
      sandbox.stub(_config, 'setConfig').callsFake(function (obj) {
        utils.mergeDeep(__config, obj);
      });

      const insertElementStub = sandbox.stub(utils, 'insertElement');

      const uri = utils.parseUrl(analyticsAdapter.url(analyticsOptions.js));
      const isScript = arg => arg.tagName === 'SCRIPT' && arg.src === config.params.js;

      let init = false;
      window.adloox_pubint = {
        init: function () {
          init = true;
        },
        seg: function (context, user, slots, callback) {
          context.set('adl_ok', true);
          context.set('adl_nope', undefined);
          user.set('adl_unused', false);
          user.set('adl_nope', undefined);
          slots[0].set('adl_dis', [ 60, 70, 80 ]);
          slots[0].set('adl_nope', undefined);
          callback();
        },
        cmd: {
          push: function (callback) {
            callback();
          }
        }
      };

      const ret = rtdProvider.init(config);

      expect(ret).is.true;

      expect(insertElementStub.calledWith(sinon.match(isScript))).to.true;

      expect(init).is.true;

      const callback = function () {
        expect(__config.fpd.context.data.adl_ok).is.true;
        expect(__config.fpd.context.data.adl_nope).is.undefined;
        expect(__config.fpd.user.data.adl_unused).is.false;
        expect(__config.fpd.user.data.adl_nope).is.undefined;
        expect(adUnit.fpd.context.data.adl_dis.length).is.equals(3);
        expect(adUnit.fpd.context.data.adl_nope).is.undefined;

        const targetingData = rtdProvider.getTargetingData([ adUnit.code ], config);

        expect(Object.keys(targetingData).length).is.equal(1)
        expect(Object.keys(targetingData[adUnit.code]).length).is.equal(2)
        expect(targetingData[adUnit.code].adl_ok[0]).is.equal('1')
        expect(targetingData[adUnit.code].adl_dis.length).is.equal(3)

        done();
      };
      rtdProvider.getBidRequestData({}, callback, config);
    });
  });
});
