import {expect} from 'chai';
import YieldbotAdapter from 'src/adapters/yieldbot';
import bidManager from 'src/bidmanager';
import adLoader from 'src/adloader';

const bidderRequest = {
  bidderCode: 'yieldbot',
  bidder: 'yieldbot',
  bidderRequestId: '187a340cb9ccc5',
  bids: [
    {
      bidId: '2640ad280208cc',
      sizes: [[300, 250], [300, 600]],
      bidder: 'yieldbot',
      bidderRequestId: '187a340cb9ccc0',
      params: { psn: '1234', slot: 'medrec' },
      requestId: '5f297a1f-3163-46c2-854f-b55fd2e74ece',
      placementCode: '/4294967296/adunit0'
    },
    {
      bidId: '35751f10be5b6b',
      sizes: [[728, 90], [970, 90]],
      bidder: 'yieldbot',
      bidderRequestId: '187a340cb9ccc1',
      params: { psn: '1234', slot: 'leaderboard' },
      requestId: '5f297a1f-3163-46c2-854f-b55fd2e74ece',
      placementCode: '/4294967296/adunit1'
    }
  ]
};

const YB_BID_FIXTURE = {
  medrec: {
    ybot_ad: 'y',
    ybot_slot: 'medrec',
    ybot_cpm: '200',
    ybot_size: '300x250'
  },
  leaderboard: {
    ybot_ad: 'n'
  }
};

function createYieldbotMockLib() {
  // jshint unused:false
  window.yieldbot = {
    _initialized: false,
    pub: (psn) => {},
    defineSlot: (slotName, optionalDomIdOrConfigObject, optionalTime) => {},
    enableAsync: () => {},
    go: () => { window.yieldbot._initialized = true; },
    nextPageview: (slots, callback) => {},
    getSlotCriteria: (slotName) => {
      return YB_BID_FIXTURE[slotName] || {ybot_ad: 'n'};
    }
  };
  // jshint unused:true
}

function restoreYieldbotMockLib() {
  window.yieldbot = null;
}

function mockYieldbotInitBidRequest() {
  window.ybotq = window.ybotq || [];
  window.ybotq.forEach(fn => {
    fn.apply(window.yieldbot);
  });
  window.ybotq = [];
}

let sandbox;
let bidManagerStub;
let yieldbotLibStub;

before(function() {
  window.pbjs._bidsRequested.push(bidderRequest);
});

describe('Yieldbot adapter tests', function() {
  describe('callBids', function() {
    beforeEach(function () {
      sandbox = sinon.sandbox.create();

      createYieldbotMockLib();

      sandbox.stub(adLoader, 'loadScript');
      yieldbotLibStub = sandbox.stub(window.yieldbot);
      yieldbotLibStub.getSlotCriteria.restore();

      bidManagerStub = sandbox.stub(bidManager, 'addBidResponse');

      const adapter = new YieldbotAdapter();
      adapter.callBids(bidderRequest);
      mockYieldbotInitBidRequest();
    });

    afterEach(function() {
      sandbox.restore();
      restoreYieldbotMockLib();
    });

    it('should request the yieldbot library', function() {
      sinon.assert.calledOnce(adLoader.loadScript);
      sinon.assert.calledWith(adLoader.loadScript, '//cdn.yldbt.com/js/yieldbot.intent.js');
    });

    it('should set a yieldbot psn', function() {
      sinon.assert.called(yieldbotLibStub.pub);
      sinon.assert.calledWith(yieldbotLibStub.pub, '1234');
    });

    it('should define yieldbot slots', function() {
      sinon.assert.calledTwice(yieldbotLibStub.defineSlot);
      sinon.assert.calledWith(yieldbotLibStub.defineSlot, 'medrec', {sizes: [[300, 250], [300, 600]]});
      sinon.assert.calledWith(yieldbotLibStub.defineSlot, 'leaderboard', {sizes: [[728, 90], [970, 90]]});
    });

    it('should enable yieldbot async mode', function() {
      sinon.assert.called(yieldbotLibStub.enableAsync);
    });

    it('should add bid response after yieldbot request callback', function() {
      const plc1 = bidManagerStub.firstCall.args[0];
      expect(plc1).to.equal(bidderRequest.bids[0].placementCode);

      const pb_bid1 = bidManagerStub.firstCall.args[1];
      expect(pb_bid1.bidderCode).to.equal('yieldbot');
      expect(pb_bid1.cpm).to.equal(2);
      expect(pb_bid1.ybot_ad).to.equal('y');
      expect(pb_bid1.ybot_slot).to.equal('medrec');
      expect(pb_bid1.ybot_cpm).to.equal('200');
      expect(pb_bid1.ybot_size).to.equal('300x250');

      expect(pb_bid1.width).to.equal('300');
      expect(pb_bid1.height).to.equal('250');
      expect(pb_bid1.ad).to.match(/src="\/\/cdn\.yldbt\.com\/js\/yieldbot\.intent\.js/);
      expect(pb_bid1.ad).to.match(/yieldbot\.renderAd\('medrec:300x250'\)/);

      const plc2 = bidManagerStub.secondCall.args[0];
      expect(plc2).to.equal(bidderRequest.bids[1].placementCode);

      const pb_bid2 = bidManagerStub.secondCall.args[1];
      expect(pb_bid2.bidderCode).to.equal('yieldbot');
      expect(pb_bid2.width).to.equal(0);
      expect(pb_bid2.height).to.equal(0);
      expect(pb_bid2.statusMessage).to.match(/empty.*response/);
    });
  });

  describe('callBids, refresh', function() {
    beforeEach(function () {
      if (sandbox) { sandbox.restore(); }
      sandbox = sinon.sandbox.create();

      createYieldbotMockLib();

      sandbox.stub(adLoader, 'loadScript');
      yieldbotLibStub = sandbox.stub(window.yieldbot);
      yieldbotLibStub.getSlotCriteria.restore();
      yieldbotLibStub.go.restore();
      bidManagerStub = sandbox.stub(bidManager, 'addBidResponse');
    });

    afterEach(function() {
      sandbox.restore();
      restoreYieldbotMockLib();
    });

    it('should use yieldbot.nextPageview after first callBids', function() {
      const adapter = new YieldbotAdapter();
      adapter.callBids(bidderRequest);
      mockYieldbotInitBidRequest();

      expect(window.yieldbot._initialized).to.equal(true);

      adapter.callBids(bidderRequest);
      mockYieldbotInitBidRequest();
      sinon.assert.calledOnce(yieldbotLibStub.nextPageview);
    });

    it('should not throw on callBids without bidsRequested', function() {
      const adapter = new YieldbotAdapter();
      adapter.callBids(bidderRequest);
      mockYieldbotInitBidRequest();

      expect(window.yieldbot._initialized).to.equal(true);

      window.pbjs._bidsRequested = window.pbjs._bidsRequested.filter(o => {
        return o.bidderCode !== 'yieldbot';
      });

      adapter.callBids(bidderRequest);
      mockYieldbotInitBidRequest();
      sinon.assert.calledOnce(yieldbotLibStub.nextPageview);
    });

    it('should not add empty bidResponse on callBids without bidsRequested', function() {
      window.pbjs._bidsRequested = window.pbjs._bidsRequested.filter(o => {
        return o.bidderCode !== 'yieldbot';
      });

      const adapter = new YieldbotAdapter();
      adapter.callBids(bidderRequest);
      mockYieldbotInitBidRequest();

      let bidResponses = window.pbjs._bidsReceived.filter(o => {
        return o.bidderCode === 'yieldbot';
      });

      expect(bidResponses.length).to.equal(0);

      adapter.callBids(bidderRequest);
      mockYieldbotInitBidRequest();
      sinon.assert.calledOnce(yieldbotLibStub.nextPageview);
    });
  });
});
