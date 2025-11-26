import {
  PLACEMENT_SOURCES,
  _internal,
  adagioRtdSubmodule,
  storage,
} from 'modules/adagioRtdProvider.js';
import * as utils from 'src/utils.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import { expect } from 'chai';
import { getGlobal } from '../../../src/prebidGlobal.js';

describe('Adagio Rtd Provider', function () {
  const SUBMODULE_NAME = 'adagio';

  function getElementByIdMock(width, height, x, y) {
    const obj = {
      x: x || 800,
      y: y || 300,
      width: width || 300,
      height: height || 250,
    };

    return {
      ...obj,
      getBoundingClientRect: () => {
        return {
          width: obj.width,
          height: obj.height,
          left: obj.x,
          top: obj.y,
          right: obj.x + obj.width,
          bottom: obj.y + obj.height
        };
      }
    };
  }

  let sandbox;
  let clock;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
    sandbox.restore();
  });

  describe('submodule `init`', function () {
    const config = {
      name: SUBMODULE_NAME,
      params: {
        organizationId: '1000',
        site: 'mysite'
      }
    };

    it('exists', function () {
      expect(adagioRtdSubmodule.init).to.be.a('function');
    });

    it('returns false missing config params', function () {
      const value = adagioRtdSubmodule.init({
        name: SUBMODULE_NAME,
      });
      expect(value).to.equal(false);
    });

    it('returns false if missing providers param', function () {
      const value = adagioRtdSubmodule.init({
        name: SUBMODULE_NAME,
        params: {}
      });
      expect(value).to.equal(false);
    });

    it('returns false if organizationId param is not a string', function () {
      const value = adagioRtdSubmodule.init({
        name: SUBMODULE_NAME,
        params: {
          organizationId: 1000,
          site: 'mysite'
        }
      });
      expect(value).to.equal(false);
    });

    it('returns false if `site` param is not a string', function () {
      const value = adagioRtdSubmodule.init({
        name: SUBMODULE_NAME,
        params: {
          organizationId: '1000',
          site: 123
        }
      });
      expect(value).to.equal(false);
    });

    it('returns true if `organizationId` and `site` params included', function () {
      const value = adagioRtdSubmodule.init(config);
      expect(value).to.equal(true);
    });

    it('load an external script if localStorageIsEnabled is enabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsArgWith(0, true)
      adagioRtdSubmodule.init(config);
      expect(loadExternalScriptStub.called).to.be.true;
    });

    it('do not load an external script if localStorageIsEnabled is disabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsArgWith(0, false)
      adagioRtdSubmodule.init(config);
      expect(loadExternalScriptStub.called).to.be.false;
    });

    describe('store session data in localStorage', function () {
      const session = {
        expiry: 1714116530700,
        id: 'uid-1234',
        rnd: 0.5697,
        vwSmplg: 0.1,
        vwSmplgNxt: 0.1,
        pages: 1,
        v: 2
      };

      it('store new session data for further usage', function () {
        const storageValue = JSON.stringify({abTest: {}});
        sandbox.stub(storage, 'getDataFromLocalStorage').callsArgWith(1, storageValue);
        sandbox.stub(Date, 'now').returns(1714116520710);
        sandbox.stub(Math, 'random').returns(0.8);
        sandbox.stub(utils, 'generateUUID').returns('uid-1234');

        const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')

        adagioRtdSubmodule.init(config);

        const expected = {
          session: {
            v: 2,
            new: true,
            id: utils.generateUUID(),
            rnd: Math.random(),
            pages: 1,
          }
        }

        expect(spy.withArgs({
          action: 'session',
          ts: Date.now(),
          data: expected,
        }).calledOnce).to.be.true;
      });

      it('store existing session data for further usage', function () {
        const storageValue = JSON.stringify({session: session, abTest: {}});
        sandbox.stub(storage, 'getDataFromLocalStorage').callsArgWith(1, storageValue);
        sandbox.stub(Date, 'now').returns(1714116520710);
        sandbox.stub(Math, 'random').returns(0.8);

        const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')

        adagioRtdSubmodule.init(config);

        const expected = {
          session: {
            ...session,
            new: false,
          }
        }

        expect(spy.withArgs({
          action: 'session',
          ts: Date.now(),
          data: expected,
        }).calledOnce).to.be.true;
      });

      it('store new session if old session has expired data for further usage', function () {
        const storageValue = JSON.stringify({session: session, abTest: {}});
        sandbox.stub(Date, 'now').returns(1715679344351);
        sandbox.stub(storage, 'getDataFromLocalStorage').callsArgWith(1, storageValue);
        sandbox.stub(Math, 'random').returns(0.8);
        sandbox.stub(utils, 'generateUUID').returns('uid-5678');

        const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')

        adagioRtdSubmodule.init(config);

        const expected = {
          session: {
            ...session,
            new: true,
            id: utils.generateUUID(),
            rnd: Math.random(),
          }
        }
        expect(spy.withArgs({
          action: 'session',
          ts: Date.now(),
          data: expected,
        }).calledOnce).to.be.true;
      });
    });

    describe('store session data in localStorage for old snippet', function () {
      it('store new session data for further usage', function () {
        const storageValue = null;
        sandbox.stub(storage, 'getDataFromLocalStorage').callsArgWith(1, storageValue);
        sandbox.stub(Date, 'now').returns(1714116520710);
        sandbox.stub(Math, 'random').returns(0.8);
        sandbox.stub(utils, 'generateUUID').returns('uid-1234');

        const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')

        adagioRtdSubmodule.init(config);

        const expected = {
          session: {
            new: true,
            id: utils.generateUUID(),
            rnd: Math.random(),
            pages: 1
          }
        }

        expect(spy.withArgs({
          action: 'session',
          ts: Date.now(),
          data: expected,
        }).calledOnce).to.be.true;
      });

      it('update session data for further usage', function () {
        const storageValue = JSON.stringify({
          session: {
            new: true,
            id: 'uid-1234',
            rnd: 0.8,
            pages: 1,
            expiry: 1714116520710,
            testName: 't',
            testVersion: 'clt'
          }
        });
        sandbox.stub(storage, 'getDataFromLocalStorage').callsArgWith(1, storageValue);
        sandbox.stub(Date, 'now').returns(1714116520710);
        sandbox.stub(Math, 'random').returns(0.8);
        sandbox.stub(utils, 'generateUUID').returns('uid-1234');

        const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')

        adagioRtdSubmodule.init(config);

        const expected = {
          session: {
            new: false,
            expiry: 1714116520710,
            id: utils.generateUUID(),
            rnd: Math.random(),
            pages: 1,
            testName: 't',
            testVersion: 'clt'
          }
        }

        expect(spy.withArgs({
          action: 'session',
          ts: Date.now(),
          data: expected,
        }).calledOnce).to.be.true;
      });
    });

    describe('update session data in localStorage from old snippet to new version', function () {
      it('update session data for new snippet', function () {
        const storageValue = JSON.stringify({
          session: {
            new: false,
            id: 'uid-1234',
            rnd: 0.8,
            pages: 1,
            expiry: 1714116520710,
            testName: 't',
            testVersion: 'clt'
          },
          abTest: {
            expiry: 1714116520810,
            testName: 't',
            testVersion: 'srv'
          }
        });
        sandbox.stub(storage, 'getDataFromLocalStorage').callsArgWith(1, storageValue);
        sandbox.stub(Date, 'now').returns(1714116520710);
        sandbox.stub(Math, 'random').returns(0.8);
        sandbox.stub(utils, 'generateUUID').returns('uid-1234');

        const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')

        adagioRtdSubmodule.init(config);

        const expected = {
          session: {
            new: false,
            expiry: 1714116520710,
            id: utils.generateUUID(),
            rnd: Math.random(),
            pages: 1,
            testName: 't',
            testVersion: 'srv',
            v: 2
          }
        }

        expect(spy.withArgs({
          action: 'session',
          ts: Date.now(),
          data: expected,
        }).calledOnce).to.be.true;
      });
    });
  });

  describe('submodule `getBidRequestData`', function () {
    const bidReqConfig = {
      'timeout': 700,
      'adUnits': [
        {
          'code': 'div-gpt-ad-1460505748561-0',
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 250]]
            }
          },
          'ortb2Imp': {},
          'bids': [
            {
              'bidder': 'adagio',
              'params': {
                'organizationId': '1004',
                'site': 'maville',
                'useAdUnitCodeAsPlacement': true,
                'adUnitElementId': 'div-gpt-ad-1460505748561-0',
                'pagetype': 'article',
              }
            },
            {
              'bidder': 'another',
              'params': {
                'pubid': 'xxx',
              }
            }
          ]
        }
      ],
      'adUnitCodes': [
        'div-gpt-ad-1460505748561-0'
      ],
      'ortb2Fragments': {
        'global': {
          'regs': {
            'ext': {
              'gdpr': 1
            }
          },
          'site': {
            'domain': 'example.com',
            'publisher': {
              'domain': 'example.com'
            },
            'page': 'http://example.com/page.html',
          },
          'device': {
            'w': 1359,
            'h': 1253,
            'dnt': 0,
            'ua': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'language': 'fr'
          }
        },
        'bidder': {}
      }
    };

    function cb() {}

    beforeEach(function() {
      _internal.getFeatures().reset();
    });

    it('exists', function () {
      expect(adagioRtdSubmodule.getBidRequestData).to.be.a('function');
    });

    it('update the ortb2Fragments object with adg_rtd signals', function() {
      const bidRequest = utils.deepClone(bidReqConfig);

      sandbox.stub(window.top.document, 'getElementById').returns(getElementByIdMock());
      sandbox.stub(window.top, 'getComputedStyle').returns({ display: 'block' });
      sandbox.stub(utils, 'inIframe').returns(false);

      adagioRtdSubmodule.getBidRequestData(bidRequest, cb);
      const signals = bidRequest.ortb2Fragments.global.site.ext.data.adg_rtd;
      expect(signals).to.have.property('features');
      expect(signals).to.have.property('session');
      expect(signals).to.have.property('uid');
      expect(signals.features.viewport_dimensions).to.match(/\d+x\d+/);
      expect(signals.features.page_dimensions).to.match(/\d+x\d+/);

      expect(bidRequest.adUnits[0]).to.have.property('ortb2Imp');
      expect(bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd.adunit_position).to.match(/\d+x\d+/);
    });

    describe('update the ortb2Fragments object a SafeFrame context', function() {
      it('update', function() {
        sandbox.stub(utils, 'isSafeFrameWindow').returns(true);
        sandbox.stub(utils, 'canAccessWindowTop').returns(false);

        window.$sf = {
          ext: {
            geom() {
              return {
                win: {t: 23, r: 1920, b: 1200, l: 0, w: 1920, h: 1177},
                self: {t: 210, r: 1159, b: 460, l: 859, w: 300, h: 250},
              }
            }
          }
        };

        const bidRequest = utils.deepClone(bidReqConfig);
        adagioRtdSubmodule.getBidRequestData(bidRequest, cb);

        const fragmentExt = bidRequest.ortb2Fragments.global.site.ext.data.adg_rtd;
        expect(fragmentExt.features.viewport_dimensions).equal('1920x1177');
        expect(fragmentExt.features.page_dimensions).equal('');

        const ortb2ImpExt = bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd;
        expect(ortb2ImpExt.adunit_position).equal('210x859');

        window.$sf = undefined;
      });

      it('handle missformated $sf object and update', function() {
        sandbox.stub(utils, 'isSafeFrameWindow').returns(true);
        sandbox.stub(utils, 'canAccessWindowTop').returns(false);

        window.$sf = {
          ext: {
            geom: ''
          }
        };

        const bidRequest = utils.deepClone(bidReqConfig);
        adagioRtdSubmodule.getBidRequestData(bidRequest, cb);

        const fragmentExt = bidRequest.ortb2Fragments.global.site.ext.data.adg_rtd;
        expect(fragmentExt.features.viewport_dimensions).equal('');
        expect(fragmentExt.features.page_dimensions).equal('');

        const ortb2ImpExt = bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd;
        expect(ortb2ImpExt.adunit_position).equal('');

        window.$sf = undefined;
      });
    });

    describe('update the ortb2Fragments object in a "inIframe" context', function() {
      it('update when window.top is accessible', function() {
        sandbox.stub(utils, 'canAccessWindowTop').returns(true);
        sandbox.stub(utils, 'isSafeFrameWindow').returns(false);
        sandbox.stub(utils, 'inIframe').returns(true);

        const bidRequest = utils.deepClone(bidReqConfig);
        adagioRtdSubmodule.getBidRequestData(bidRequest, cb);

        const ortb2ImpExt = bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd;
        expect(ortb2ImpExt.adunit_position).equal('');
      });

      it('catch error when window.top is accessible', function() {
        sandbox.stub(utils, 'canAccessWindowTop').returns(true);
        sandbox.stub(utils, 'isSafeFrameWindow').returns(false);
        sandbox.stub(window.document, 'getElementById').throws();

        const bidRequest = utils.deepClone(bidReqConfig);
        adagioRtdSubmodule.getBidRequestData(bidRequest, cb);

        const ortb2ImpExt = bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd;
        expect(ortb2ImpExt.adunit_position).equal('');
      });
    });

    it('update the ortb2Fragments object when window.top is not accessible', function() {
      sandbox.stub(utils, 'canAccessWindowTop').returns(false);
      sandbox.stub(utils, 'isSafeFrameWindow').returns(false);

      const bidRequest = utils.deepClone(bidReqConfig);
      adagioRtdSubmodule.getBidRequestData(bidRequest, cb);

      const fragmentExt = bidRequest.ortb2Fragments.global.site.ext.data.adg_rtd;
      expect(fragmentExt.features.viewport_dimensions).equal('');
      expect(fragmentExt.features.page_dimensions).equal('');

      const ortb2ImpExt = bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd;
      expect(ortb2ImpExt.adunit_position).equal('');
    });

    describe('set the ortb2Imp.ext.data.adg_rtd.placement', function() {
      const config = {
        name: SUBMODULE_NAME,
        params: {
          organizationId: '1000',
          site: 'mysite'
        }
      };

      it('set the adg_rtd.placement value from the adUnit[].bids adagio.params.placement value', function() {
        const placement = 'placement-value';

        const configCopy = utils.deepClone(config);

        const bidRequest = utils.deepClone(bidReqConfig);
        bidRequest.adUnits[0].bids[0].params.placement = placement;

        adagioRtdSubmodule.getBidRequestData(bidRequest, cb, configCopy);
        expect(bidRequest.adUnits[0]).to.have.property('ortb2Imp');
        expect(bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd.placement).to.equal(placement);
      });

      it('fallback on the adUnit.code value to set the adg_rtd.placement value', function() {
        const configCopy = utils.deepClone(config);
        configCopy.params.placementSource = PLACEMENT_SOURCES.ADUNITCODE;

        const bidRequest = utils.deepClone(bidReqConfig);

        adagioRtdSubmodule.getBidRequestData(bidRequest, cb, configCopy);
        expect(bidRequest.adUnits[0]).to.have.property('ortb2Imp');
        expect(bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd.placement).to.equal('div-gpt-ad-1460505748561-0');
      });

      it('fallback on the the gpid value to set the adg_rtd.placement value ', function() {
        const configCopy = utils.deepClone(config);
        configCopy.params.placementSource = PLACEMENT_SOURCES.GPID;

        const bidRequest = utils.deepClone(bidReqConfig);
        const gpid = '/19968336/header-bid-tag-0'
        utils.deepSetValue(bidRequest.adUnits[0], 'ortb2Imp.ext.gpid', gpid)

        adagioRtdSubmodule.getBidRequestData(bidRequest, cb, configCopy);
        expect(bidRequest.adUnits[0]).to.have.property('ortb2Imp');
        expect(bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd.placement).to.equal(gpid);
      });

      it('it does not populate `ortb2Imp.ext.data.adg_rtd.placement` if no fallback', function() {
        const configCopy = utils.deepClone(config);
        const bidRequest = utils.deepClone(bidReqConfig);

        adagioRtdSubmodule.getBidRequestData(bidRequest, cb, configCopy);
        expect(bidRequest.adUnits[0]).to.have.property('ortb2Imp');
        expect(bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd.placement).to.not.exist;
      });

      it('ensure we create the `ortb2Imp` object if it does not exist', function() {
        const configCopy = utils.deepClone(config);
        configCopy.params.placementSource = PLACEMENT_SOURCES.ADUNITCODE;

        const bidRequest = utils.deepClone(bidReqConfig);
        delete bidRequest.adUnits[0].ortb2Imp;

        adagioRtdSubmodule.getBidRequestData(bidRequest, cb, configCopy);
        expect(bidRequest.adUnits[0]).to.have.property('ortb2Imp');
        expect(bidRequest.adUnits[0].ortb2Imp.ext.data.adg_rtd.placement).to.equal('div-gpt-ad-1460505748561-0');
      });
    });
  });

  describe('submodule `onBidRequestEvent`', function() {
    const bidderRequest = {
      'bidderCode': 'adagio',
      'auctionId': '3de10dc0-fe75-480f-95cc-f15f2c4929fe',
      'bidderRequestId': '4ecd1f17cf829b',
      'bids': [
        {
          'bidder': 'adagio',
          'params': {
            'organizationId': '1000',
            'site': 'example',
            'adUnitElementId': 'div-gpt-ad-1460505748561-0',
            'pagetype': 'article',
            'environment': 'desktop',
            'placement': 'div-gpt-ad-1460505748561-0',
            'adagioAuctionId': '4c259968-0158-443d-af93-551bac594b6c',
            'pageviewId': 'dfb9b067-e5c4-4212-97bb-c67d6313ecaf'
          },
          'ortb2Imp': {
            'ext': {
              'tid': '235c991e-fcc4-416b-95d3-f60e53575bee',
              'data': {
                'adserver': {
                  'name': 'gam',
                  'adslot': '/19968336/header-bid-tag-0'
                },
                'pbadslot': '/19968336/header-bid-tag-0',
                'adunit_position': '8x95'
              },
              'gpid': '/19968336/header-bid-tag-0'
            }
          },
          'mediaTypes': {
            'banner': {
              'sizes': [
                [
                  300,
                  250
                ]
              ]
            }
          },
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'transactionId': '235c991e-fcc4-416b-95d3-f60e53575bee',
          'adUnitId': '79ab5904-0b21-4235-965a-f4905af072b7',
          'bidId': '534aa529a44e0e',
          'bidderRequestId': '4ecd1f17cf829b',
          'auctionId': '3de10dc0-fe75-480f-95cc-f15f2c4929fe',
          'src': 'client',
          'bidRequestsCount': 1,
          'bidderRequestsCount': 1,
          'bidderWinsCount': 0,
          'ortb2': {
            'site': {
              'ext': {
                'data': {
                  'adg_rtd': {
                    'uid': 'dfb9b067-e5c4-4212-97bb-c67d6313ecaf',
                    'features': {
                      'page_dimensions': '1359x1353',
                      'viewport_dimensions': '1359x1253',
                      'user_timestamp': '1715621032',
                      'dom_loading': '28'
                    },
                    'session': {
                      'new': true,
                      'rnd': 0.020644826280300954,
                      'vwSmplg': 0.1,
                      'vwSmplgNxt': 0.1,
                      'pages': 1
                    }
                  }
                }
              }
            }
          },
        },
      ],
      'auctionStart': 1715613832791,
      'timeout': 700,
      'ortb2': {
        'site': {
          'ext': {
            'data': {
              'adg_rtd': {
                'features': {
                  'page_dimensions': '1359x1353',
                  'viewport_dimensions': '1359x1253',
                  'user_timestamp': '1715621032',
                  'dom_loading': '28'
                },
                'session': {
                  'new': true,
                  'rnd': 0.020644826280300954,
                  'vwSmplg': 0.1,
                  'vwSmplgNxt': 0.1,
                  'pages': 1
                }
              }
            }
          }
        }
      },
      'start': 1715613832796
    }

    it('store a copy of computed property', function() {
      const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')
      sandbox.stub(Date, 'now').returns(12345);

      _internal.getGuard().clear();

      const config = {
        params: {
          organizationId: '1000',
          site: 'example'
        }
      };
      const bidderRequestCopy = utils.deepClone(bidderRequest);
      adagioRtdSubmodule.onBidRequestEvent(bidderRequestCopy, config);

      clock.tick(1);

      const {
        bidder,
        adUnitCode,
        mediaTypes,
        params,
        auctionId,
        bidderRequestsCount } = bidderRequestCopy.bids[0];

      const expected = {
        bidder,
        adUnitCode,
        mediaTypes,
        ortb2: bidderRequestCopy.bids[0].ortb2.site.ext.data,
        ortb2Imp: bidderRequestCopy.bids[0].ortb2Imp.ext.data,
        params,
        auctionId,
        bidderRequestsCount,
        organizationId: config.params.organizationId,
        site: config.params.site,
        localPbjs: 'pbjs',
        localPbjsRef: getGlobal()
      }

      expect(spy.withArgs({
        action: 'store',
        ts: Date.now(),
        data: expected,
      }).calledOnce).to.be.true;
    });
  });
});
