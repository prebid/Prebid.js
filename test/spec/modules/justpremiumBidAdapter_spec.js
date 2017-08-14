import { expect, assert } from 'chai';
import Adapter from 'modules/justpremiumBidAdapter';
import bidmanager from 'src/bidmanager';
import adLoader from 'src/adloader';
import PREBID_CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils';

const CONST = {
  COOKIE: '//ox-d.justpremium.com/w/1.0/cj',
  LIB: '//cdn-cf.justpremium.com/js/jpx.js'
};

function createCookie(name, value, days) {
  var expires = '';
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + value + expires + '; path=/';
}

describe('justpremium adapter', () => {
  describe('setup', () => {
    let sandbox;
    let factory;

    beforeEach(() => {
      factory = {
        JAM: {
          instance: () => {
          }
        }
      };
      sandbox = sinon.sandbox.create();
      sandbox.stub(adLoader, 'loadScript', (url, callback) => {
        if (url === window.location.protocol + CONST.LIB) {
          window.Jpx = factory;
          callback();
        }
      });
      sandbox.stub(factory.JAM, 'instance', () => {
        return {};
      })
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('callBids should exists and be a function', () => {
      const adapter = new Adapter();
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });

    it('should request script to sync cookies and download jpx ad manager lib', () => {
      const adapter = new Adapter();
      const _request = adLoader.loadScript;
      const _instance = factory.JAM.instance;

      adapter.callBids({});

      assert(_request.calledTwice);
      assert.lengthOf(_request.args[0], 1);
      assert.lengthOf(_request.args[1], 2);
      assert.equal(_request.args[0][0], window.location.protocol + CONST.COOKIE);
      assert.equal(_request.args[1][0], window.location.protocol + CONST.LIB);
      expect(_request.args[1][1]).to.exist.and.to.be.a('function');
      assert(_instance.calledOnce);
    });

    it('should request proper version of jpx ad manager', () => {
      createCookie('jpxhbjs', 'v2.0.0', 1);

      const adapter = new Adapter();
      const _request = adLoader.loadScript;
      const parts = CONST.LIB.split('/');
      parts.splice(parts.length - 1, 0, 'v2.0.0');

      adapter.callBids({});

      assert.equal(_request.args[1][0], window.location.protocol + parts.join('/'));
      expect(_request.args[1][1]).to.exist.and.to.be.a('function');

      createCookie('jpxhbjs', '', 0);
    });
  });

  describe('callBids', () => {
    let sandbox;
    let adapter;
    let jPAM;
    let bidder;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      window.top.jPAM = jPAM = {
        initialized: true,
        cmd: [],
        cb: {
          bidder20000: {
            createBid: () => {
            }
          }
        },
        listeners: {},
        hasPlugin: () => {
          return true;
        },
        getPlugin: () => {
          return bidder;
        }
      };
      sandbox.stub(adLoader, 'loadScript');
      sandbox.spy(jPAM, 'hasPlugin');
      adapter = new Adapter();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should detect that jpx manager is ready', () => {
      const _request = adLoader.loadScript;
      const _check = jPAM.hasPlugin;

      adapter.callBids({});

      expect(_check.callCount).to.be.equal(1);
      assert(_request.calledOnce);
    });

    it('should throw an error', () => {
      const _request = adLoader.loadScript;
      const req = {
        bidderCode: 'justpremium',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'justpremium',
            params: {},
            sizes: [[1, 1]],
            placementCode: 'div-gpt-ad-1471513102552-1'
          }
        ]
      };

      try {
        adapter.callBids(req);
      } catch (e) {
        assert.instanceOf(e, Error);
      }
      assert(_request.calledOnce);
    });

    it('should request bids and send proper arguments', () => {
      const _request = adLoader.loadScript;
      const req = {
        bidderCode: 'justpremium',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'justpremium',
            params: {
              zone: 20000
            },
            sizes: [[1, 1]],
            placementCode: 'div-gpt-ad-1471513102552-1'
          }
        ]
      };

      adapter.callBids(req);

      const params = {};
      _request.getCall(1).args[0].split('?').pop().split('&').forEach(keypair => {
        const kp = keypair.split('=');
        params[kp[0]] = kp[1];
      });

      assert(_request.calledTwice);
      assert.equal(req.bids[0].params.zone, parseInt(params['zone']));
      assert.equal(req.bids[0].params.zone, parseInt(params['id']));
      assert.equal('1', params['c']);
      assert.equal(window.top.innerHeight, parseInt(params['wh']));
      assert.equal(window.top.innerWidth, parseInt(params['ww']));
      assert.equal(window.top.screen.width, parseInt(params['sw']));
      assert.equal(window.top.screen.height, parseInt(params['sh']));
    });

    it('should parse bid allow param and send proper arguments to the server', () => {
      const _request = adLoader.loadScript;
      const req = {
        bidderCode: 'justpremium',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'justpremium',
            params: {
              zone: 20000,
              allow: ['wp']
            },
            sizes: [[1, 1]],
            placementCode: 'div-gpt-ad-1471513102552-1'
          }
        ]
      };

      adapter.callBids(req);

      const params = {};
      _request.getCall(1).args[0].split('?').pop().split('&').forEach(keypair => {
        const kp = keypair.split('=');
        params[kp[0]] = kp[1];
      });

      assert(_request.calledTwice);
      assert.equal(encodeURIComponent('[["wp"],[]]'), params['c']);
    });

    it('should parse bid exclude param and send proper arguments to the server', () => {
      const _request = adLoader.loadScript;
      const req = {
        bidderCode: 'justpremium',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'justpremium',
            params: {
              zone: 20000,
              exclude: ['wp', 'lb']
            },
            sizes: [[1, 1]],
            placementCode: 'div-gpt-ad-1471513102552-1'
          }
        ]
      };

      adapter.callBids(req);

      const params = {};
      _request.getCall(1).args[0].split('?').pop().split('&').forEach(keypair => {
        const kp = keypair.split('=');
        params[kp[0]] = kp[1];
      });

      assert(_request.calledTwice);
      assert.equal(encodeURIComponent('[[],["wp","lb"]]'), params['c']);
    });

    it('should add empty bid if there was no valid response', () => {
      adLoader.loadScript.restore();
      const stubLoadScript = sandbox.stub(adLoader, 'loadScript', (url, callback) => {
        if (callback) {
          callback(new Error('test'));
        }
      });
      const stubUtilLogError = sandbox.stub(utils, 'logError');
      const stubAddBidResponse = sandbox.stub(bidmanager, 'addBidResponse');
      const req = {
        bidderCode: 'justpremium',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'justpremium',
            params: {
              zone: 20000,
              allow: ['wp']
            },
            sizes: [[1, 1]],
            placementCode: 'div-gpt-ad-1471513102552-1'
          }
        ]
      };

      adapter.callBids(req);

      const bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
      const bidResponse = stubAddBidResponse.getCall(0).args[1];

      assert(stubLoadScript.calledTwice);
      assert(stubUtilLogError.calledOnce);
      assert(stubAddBidResponse.calledOnce);
      expect(bidPlacementCode).to.equal('div-gpt-ad-1471513102552-1');
      expect(bidResponse.getStatusCode()).to.equal(PREBID_CONSTANTS.STATUS.NO_BID);
      expect(bidResponse.bidderCode).to.equal('justpremium');
    });

    it('should add empty bid if response was empty', () => {
      adLoader.loadScript.restore();
      const req = {
        bidderCode: 'justpremium',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'justpremium',
            params: {
              zone: 20000,
              allow: ['wp']
            },
            sizes: [[1, 1]],
            placementCode: 'div-gpt-ad-1471513102552-1'
          }
        ]
      };

      const stubLoadScript = sandbox.stub(adLoader, 'loadScript', (url, callback) => {
        if (callback) {
          callback();
        }
      });
      const stubAddBidResponse = sandbox.stub(bidmanager, 'addBidResponse');
      const stubCreateBid = sandbox.stub(jPAM.cb.bidder20000, 'createBid', (factory) => {
        return factory();
      });

      adapter.callBids(req);

      const bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
      const bidResponse = stubAddBidResponse.getCall(0).args[1];

      assert(stubAddBidResponse.calledOnce);
      expect(stubLoadScript.callCount).to.be.equal(2);
      expect(stubCreateBid.callCount).to.be.equal(1);
      expect(bidPlacementCode).to.equal('div-gpt-ad-1471513102552-1');
      expect(bidResponse.getStatusCode()).to.equal(PREBID_CONSTANTS.STATUS.NO_BID);
      expect(bidResponse.bidderCode).to.equal('justpremium');

      stubAddBidResponse.restore();
    });

    it('should add bid if tag contains any', () => {
      adLoader.loadScript.restore();
      const req = {
        bidderCode: 'justpremium',
        bids: [
          {
            bidId: 'bidId1',
            bidder: 'justpremium',
            params: {
              zone: 20000,
              allow: ['wp']
            },
            sizes: [[1, 1]],
            placementCode: 'div-gpt-ad-1471513102552-2'
          }
        ]
      };
      const responseData = {
        width: 1,
        height: 1,
        ad: `<script>window.top.jPAM.execute(147516)</script>`,
        cpm: 5.98,
        format: 'wp'
      };

      const stubLoadScript = sandbox.stub(adLoader, 'loadScript', (url, callback) => {
        if (callback) {
          callback();
        }
      });
      const stubAddBidResponse = sandbox.stub(bidmanager, 'addBidResponse');
      const stubCreateBid = sandbox.stub(jPAM.cb.bidder20000, 'createBid', (factory) => {
        const bid = factory({});

        Object.assign(bid, responseData);

        return bid;
      });

      adapter.callBids(req);

      const bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      const bidResponse1 = stubAddBidResponse.getCall(0).args[1];

      assert(stubAddBidResponse.calledOnce);
      expect(stubLoadScript.callCount).to.be.equal(2);
      expect(stubCreateBid.callCount).to.be.equal(1);
      expect(bidPlacementCode1).to.equal('div-gpt-ad-1471513102552-2');
      expect(bidResponse1.getStatusCode()).to.equal(PREBID_CONSTANTS.STATUS.GOOD);
      expect(bidResponse1.bidderCode).to.equal('justpremium');
      expect(bidResponse1.width).to.equal(responseData.width);
      expect(bidResponse1.height).to.equal(responseData.height);
      expect(bidResponse1.cpm).to.equal(responseData.cpm);
      expect(bidResponse1.format).to.equal(responseData.format);
      expect(bidResponse1.ad).to.equal(responseData.ad);

      stubAddBidResponse.restore();
    });
  });
});
