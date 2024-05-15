import { adagioRtdSubmodule, _internal, storage } from 'modules/adagioRtdProvider.js';
import * as utils from 'src/utils.js';
import { loadExternalScript } from '../../../src/adloader.js';
import { expect } from 'chai';

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
    sandbox = sinon.sandbox.create();
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
        organizationId: '1000'
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
          organizationId: 1000
        }
      });
      expect(value).to.equal(false);
    });

    it('returns true if organizationId param included', function () {
      const value = adagioRtdSubmodule.init(config);
      expect(value).to.equal(true);
    });

    it('load an external script if localStorageIsEnabled is enabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsArgWith(0, true)
      adagioRtdSubmodule.init(config);
      expect(loadExternalScript.called).to.be.true;
    });

    it('do not load an external script if localStorageIsEnabled is disabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsArgWith(0, false)
      adagioRtdSubmodule.init(config);
      expect(loadExternalScript.called).to.be.false;
    });

    describe('store session data in localStorage', function () {
      const session = {
        lastActivityTime: 1714116520700,
        rnd: 0.5697,
        vwSmplg: 0.1,
        vwSmplgNxt: 0.1
      };

      it('store new session data for further usage', function () {
        const storageValue = null;
        sandbox.stub(storage, 'getDataFromLocalStorage').callsArgWith(1, storageValue);
        sandbox.stub(Date, 'now').returns(1714116520710);
        sandbox.stub(Math, 'random').returns(0.8);

        const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')

        adagioRtdSubmodule.init(config);

        const expected = {
          session: {
            new: true,
            rnd: Math.random()
          }
        }

        expect(spy.withArgs({
          action: 'session',
          ts: Date.now(),
          data: expected,
        }).calledOnce).to.be.true;
      });

      it('store existing session data for further usage', function () {
        const storageValue = JSON.stringify({session: session});
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
        const storageValue = JSON.stringify({session: session});
        sandbox.stub(Date, 'now').returns(1715679344351);
        sandbox.stub(storage, 'getDataFromLocalStorage').callsArgWith(1, storageValue);
        sandbox.stub(Math, 'random').returns(0.8);

        const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')

        adagioRtdSubmodule.init(config);

        const expected = {
          session: {
            ...session,
            new: true,
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

    beforeEach(function() {
      _internal.getFeatures().reset();
    });

    it('exists', function () {
      expect(adagioRtdSubmodule.getBidRequestData).to.be.a('function');
    });

    it('update the ortb2Fragments object for the Adagio bidder only', function() {
      const bidRequest = utils.deepClone(bidReqConfig);

      sandbox.stub(window.top.document, 'getElementById').returns(getElementByIdMock());
      sandbox.stub(window.top, 'getComputedStyle').returns({ display: 'block' });
      sandbox.stub(utils, 'inIframe').returns(false);

      adagioRtdSubmodule.getBidRequestData(bidRequest);

      Object.keys(bidRequest.ortb2Fragments.bidder).forEach(bidderCode => {
        if (bidderCode !== 'adagio') {
          expect(bidRequest.ortb2Fragments.bidder[bidderCode]).to.be.empty;
          expect(bidRequest.adUnits[0].bids[0]).to.have.property('ortb2Imp');
          expect(bidRequest.adUnits[0].bids[0].ortb2Imp.ext.data.adunit_position).to.not.exist;
        } else {
          const bidderExt = bidRequest.ortb2Fragments.bidder.adagio.ext;
          expect(bidderExt).to.have.property('features');
          expect(bidderExt).to.have.property('session');
          expect(bidderExt.features.viewport_dimensions).to.match(/\d+x\d+/);
          expect(bidderExt.features.page_dimensions).to.match(/\d+x\d+/);

          expect(bidRequest.adUnits[0].bids[0]).to.have.property('ortb2Imp');
          expect(bidRequest.adUnits[0].bids[0].ortb2Imp.ext).to.have.property('data');
          expect(bidRequest.adUnits[0].bids[0].ortb2Imp.ext.data.adunit_position).to.match(/\d+x\d+/);
        }
      });
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
        adagioRtdSubmodule.getBidRequestData(bidRequest);

        const bidderFragmentExt = bidRequest.ortb2Fragments.bidder.adagio.ext;
        expect(bidderFragmentExt.features.viewport_dimensions).equal('1920x1177');
        expect(bidderFragmentExt.features.page_dimensions).equal('');

        const ortb2ImpExt = bidRequest.adUnits[0].bids[0].ortb2Imp.ext;
        expect(ortb2ImpExt.data.adunit_position).equal('210x859');

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
        adagioRtdSubmodule.getBidRequestData(bidRequest);

        const bidderFragmentExt = bidRequest.ortb2Fragments.bidder.adagio.ext;
        expect(bidderFragmentExt.features.viewport_dimensions).equal('');
        expect(bidderFragmentExt.features.page_dimensions).equal('');

        const ortb2ImpExt = bidRequest.adUnits[0].bids[0].ortb2Imp.ext;
        expect(ortb2ImpExt.data.adunit_position).equal('');

        window.$sf = undefined;
      });
    });

    describe('update the ortb2Fragments object in a "inIframe" context', function() {
      it('update when window.top is accessible', function() {
        sandbox.stub(utils, 'canAccessWindowTop').returns(true);
        sandbox.stub(utils, 'isSafeFrameWindow').returns(false);
        sandbox.stub(utils, 'inIframe').returns(true);

        const bidRequest = utils.deepClone(bidReqConfig);
        adagioRtdSubmodule.getBidRequestData(bidRequest);

        const ortb2ImpExt = bidRequest.adUnits[0].bids[0].ortb2Imp.ext;
        expect(ortb2ImpExt.data.adunit_position).equal('');
      });

      it('catch error when window.top is accessible', function() {
        sandbox.stub(utils, 'canAccessWindowTop').returns(true);
        sandbox.stub(utils, 'isSafeFrameWindow').returns(false);
        sandbox.stub(window.document, 'getElementById').throws();

        const bidRequest = utils.deepClone(bidReqConfig);
        adagioRtdSubmodule.getBidRequestData(bidRequest);

        const ortb2ImpExt = bidRequest.adUnits[0].bids[0].ortb2Imp.ext;
        expect(ortb2ImpExt.data.adunit_position).equal('');
      });
    });

    it('update the ortb2Fragments object when window.top is not accessible', function() {
      sandbox.stub(utils, 'canAccessWindowTop').returns(false);
      sandbox.stub(utils, 'isSafeFrameWindow').returns(false);

      const bidRequest = utils.deepClone(bidReqConfig);
      adagioRtdSubmodule.getBidRequestData(bidRequest);

      const bidderFragmentExt = bidRequest.ortb2Fragments.bidder.adagio.ext;
      expect(bidderFragmentExt.features.viewport_dimensions).equal('');
      expect(bidderFragmentExt.features.page_dimensions).equal('');

      const ortb2ImpExt = bidRequest.adUnits[0].bids[0].ortb2Imp.ext;
      expect(ortb2ImpExt.data.adunit_position).equal('');
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
            'ext': {
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
                'vwSmplgNxt': 0.1
              }
            }
          }
        },
      ],
      'auctionStart': 1715613832791,
      'timeout': 700,
      'ortb2': {
        'ext': {
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
            'vwSmplgNxt': 0.1
          }
        }
      },
      'start': 1715613832796
    }

    it('do nothing if bidderCode is not "adagio"', function() {
      const bidderRequestCopy = utils.deepClone(bidderRequest);
      bidderRequestCopy.bidderCode = 'anotherAdapter';

      adagioRtdSubmodule.onBidRequestEvent(bidderRequestCopy);
      clock.tick(1);
      expect(bidderRequestCopy.bids[0].features).to.not.exist;
    });

    it('store a copy of computed property', function() {
      const spy = sandbox.spy(_internal.getAdagioNs().queue, 'push')
      sandbox.stub(Date, 'now').returns(12345);

      const bidderRequestCopy = utils.deepClone(bidderRequest);
      adagioRtdSubmodule.onBidRequestEvent(bidderRequestCopy);

      clock.tick(1);

      const expected = {
        features: {
          ...bidderRequestCopy.bids[0].ortb2.ext.features,
          ...{
            print_number: bidderRequestCopy.bids[0].bidRequestsCount.toString(),
            adunit_position: bidderRequestCopy.bids[0].ortb2Imp.ext.data.adunit_position,
          },
        },
        params: { ...bidderRequestCopy.bids[0].params },
        adUnitCode: bidderRequestCopy.bids[0].adUnitCode,
      }

      expect(spy.withArgs({
        action: 'features',
        ts: Date.now(),
        data: expected,
      }).calledOnce).to.be.true;
    });
  });
});
