import { expect, assert } from 'chai';
import Adapter from 'src/adapters/justpremium';
import bidmanager from 'src/bidmanager';
import adLoader from 'src/adloader';
import PREBID_CONSTANTS from 'src/constants.json';

const CONST = {
  COOKIE: '//ox-d.justpremium.com/w/1.0/cj',
  LIB: '//d2nvliyzbo36lk.cloudfront.net/adp/bc.js'
};

const processCmd = (cmd) => {
  cmd.forEach(_c => {
    _c();
  })
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
      createCookie('jpxhbadp', 'v2.0.0', 1);

      const adapter = new Adapter();
      const _request = adLoader.loadScript;
      const parts = CONST.LIB.split('/');
      parts.splice(parts.length - 1, 0, 'v2.0.0');

      adapter.callBids({});

      assert.equal(_request.args[1][0], window.location.protocol + parts.join('/'));
      expect(_request.args[1][1]).to.exist.and.to.be.a('function');

      createCookie('jpxhbadp', '', 0);
    });
  });

  describe('callBids', () => {
    let sandbox;
    let adapter;
    let jPAM;
    let bidder;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      bidder = {
        createBid: () => {
        }
      };
      window.top.jPAM = jPAM = {
        initialized: true,
        cmd: [],
        listeners: {},
        hasPlugin: () => {
          return true;
        },
        getPlugin: () => {
          return bidder;
        },
        publish: (evName, args) => {
          jPAM.listeners[evName].call(this, args);
        },
        subscribe: (evName, listener) => {
          jPAM.listeners[evName] = listener;
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

    it('should request bids and register task in jpx manager ', () => {
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

      assert(_request.calledTwice);
      assert.lengthOf(jPAM.cmd, 1);
    });

    it('should add empty bid if there was no valid response', () => {
      adLoader.loadScript.restore();
      const stubLoadScript = sandbox.stub(adLoader, 'loadScript', (url, callback) => {
        if (callback) {
          callback(new Error('test'));
        }
      });
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

      assert(stubLoadScript.calledOnce);
      assert(stubAddBidResponse.calledOnce);
      expect(bidPlacementCode).to.equal('div-gpt-ad-1471513102552-1');
      expect(bidResponse.getStatusCode()).to.equal(PREBID_CONSTANTS.STATUS.NO_BID);
      expect(bidResponse.bidderCode).to.equal('justpremium');
    });

    it('should add empty bid if response was empty', () => {
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

      const spySubscribe = sandbox.spy(jPAM, 'subscribe');
      const stubAddBidResponse = sandbox.stub(bidmanager, 'addBidResponse');
      const stubCreateBid = sandbox.stub(bidder, 'createBid', (factory) => {
        return factory();
      });

      adapter.callBids(req);
      processCmd(jPAM.cmd);
      jPAM.publish('tagLoaded:20000', []);

      const bidPlacementCode = stubAddBidResponse.getCall(0).args[0];
      const bidResponse = stubAddBidResponse.getCall(0).args[1];

      assert(stubAddBidResponse.calledOnce);
      expect(spySubscribe.callCount).to.be.equal(1);
      expect(stubCreateBid.callCount).to.be.equal(1);
      expect(bidPlacementCode).to.equal('div-gpt-ad-1471513102552-1');
      expect(bidResponse.getStatusCode()).to.equal(PREBID_CONSTANTS.STATUS.NO_BID);
      expect(bidResponse.bidderCode).to.equal('justpremium');

      stubAddBidResponse.restore();
    });

    it('should add bid if tag contains any', () => {
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

      const spySubscribe = sandbox.spy(jPAM, 'subscribe');
      const stubAddBidResponse = sandbox.stub(bidmanager, 'addBidResponse');
      const stubCreateBid = sandbox.stub(bidder, 'createBid', (factory) => {
        const bid = factory({});

        Object.assign(bid, responseData);

        return bid;
      });

      adapter.callBids(req);
      processCmd(jPAM.cmd);
      jPAM.publish('tagLoaded:20000', []);

      const bidPlacementCode1 = stubAddBidResponse.getCall(0).args[0];
      const bidResponse1 = stubAddBidResponse.getCall(0).args[1];

      assert(stubAddBidResponse.calledOnce);
      expect(spySubscribe.callCount).to.be.equal(1);
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
