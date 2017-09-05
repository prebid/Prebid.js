import {expect} from 'chai';
import YieldbotAdapter from 'modules/yieldbotBidAdapter';
import bidManager from 'src/bidmanager';
import adLoader from 'src/adloader';
import {cloneJson} from 'src/utils';

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
      requestId: '5f297a1f-3163-46c2-854f-b55fd2e74ec0',
      placementCode: '/4294967296/adunit0'
    },
    {
      bidId: '35751f10be5b6b',
      sizes: [[728, 90], [970, 90]],
      bidder: 'yieldbot',
      bidderRequestId: '187a340cb9ccc1',
      params: { psn: '1234', slot: 'leaderboard' },
      requestId: '5f297a1f-3163-46c2-854f-b55fd2e74ec1',
      placementCode: '/4294967296/adunit1'
    },
    {
      bidId: '2640ad280208cd',
      sizes: [[300, 250]],
      bidder: 'yieldbot',
      bidderRequestId: '187a340cb9ccc2',
      params: { psn: '1234', slot: 'medrec' },
      requestId: '5f297a1f-3163-46c2-854f-b55fd2e74ec2',
      placementCode: '/4294967296/adunit2'
    },
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
  },
  noop: {
    ybot_ad: 'y',
    ybot_slot: 'noop',
    ybot_cpm: '200',
    ybot_size: '300x250'
  }
};

function createYieldbotMockLib() {
  window.yieldbot = {
    _initialized: false,
    pub: (psn) => {},
    defineSlot: (slotName, optionalDomIdOrConfigObject, optionalTime) => {},
    enableAsync: () => {},
    go: () => {},
    nextPageview: (slots, callback) => {},
    getSlotCriteria: (slotName) => {}
  };
}

function restoreYieldbotMockLib() {
  window.yieldbot = null;
}

function mockYieldbotBidRequest() {
  window.ybotq = window.ybotq || [];
  window.ybotq.forEach(fn => {
    fn.apply(window.yieldbot);
  });
  window.ybotq = [];
}

const localSetupTestRegex = /localSetupTest$/;
const MAKE_BID_REQUEST = true;
let sandbox;
let bidManagerStub;
let yieldbotLibStub;

/**
 * Test initialization hook. Makes initial adapter and mock bid requests<br>
 * unless the test is a special case with "localSetupTest". <br>
 * 1. All suite tests are initialized with required mocks and stubs<br>
 * 2. If the test title does <em>not</em> end in "localSetupTest", adapter and
 *  mock bid requests are executed
 * 3. Test titles ending in "localSetupTest" are special case tests and are
 *  expected to call <code>setupTest(object, MAKE_BID_REQUEST)</code> where
 *  applicable
 * @param {object} testRequest bidder request bids fixture
 * @param {boolean} force trigger adapter callBids and Yieldbot library request
 * @private
 */
function setupTest(testRequest, force = false) {
  sandbox = sinon.sandbox.create();

  createYieldbotMockLib();

  sandbox.stub(adLoader, 'loadScript');

  yieldbotLibStub = {};
  yieldbotLibStub.nextPageview = sandbox.stub(window.yieldbot, 'nextPageview');
  yieldbotLibStub.defineSlot = sandbox.stub(window.yieldbot, 'defineSlot');
  yieldbotLibStub.pub = sandbox.stub(window.yieldbot, 'pub');
  yieldbotLibStub.enableAsync = sandbox.stub(window.yieldbot, 'enableAsync');

  yieldbotLibStub.getSlotCriteria =
    sandbox.stub(window.yieldbot, 'getSlotCriteria').callsFake(
      (slotName) => {
        return YB_BID_FIXTURE[slotName] || {ybot_ad: 'n'};
      });

  yieldbotLibStub.go =
    sandbox.stub(window.yieldbot, 'go').callsFake(
      () => {
        window.yieldbot._initialized = true;
      });

  bidManagerStub = sandbox.stub(bidManager, 'addBidResponse');

  const ybAdapter = new YieldbotAdapter();
  let request = testRequest || cloneJson(bidderRequest);
  if ((this && !this.currentTest.parent.title.match(localSetupTestRegex)) || force === MAKE_BID_REQUEST) {
    ybAdapter.callBids(request);
    mockYieldbotBidRequest();
  }
  return { adapter: ybAdapter, localRequest: request };
}

function restoreTest() {
  sandbox.restore();
  restoreYieldbotMockLib();
}

describe('Yieldbot adapter tests', function() {
  let adapter;
  let localRequest;
  beforeEach(function () {
    const testSetupCtx = setupTest.call(this);
    adapter = testSetupCtx.adapter;
    localRequest = testSetupCtx.localRequest;
  });

  afterEach(function() {
    restoreTest();
  });

  describe('getUniqueSlotSizes', function() {
    it('should return [] for string sizes', function() {
      const sizes = adapter.getUniqueSlotSizes('widthxheight');
      expect(sizes).to.deep.equal([]);
    });

    it('should return [] for Object sizes', function() {
      const sizes = adapter.getUniqueSlotSizes({width: 300, height: 250});
      expect(sizes).to.deep.equal([]);
    });

    it('should return [] for boolean sizes', function() {
      const sizes = adapter.getUniqueSlotSizes(true);
      expect(sizes).to.deep.equal([]);
    });

    it('should return [] for undefined sizes', function() {
      const sizes = adapter.getUniqueSlotSizes(undefined);
      expect(sizes).to.deep.equal([]);
    });

    it('should return [] for function sizes', function() {
      const sizes = adapter.getUniqueSlotSizes(function () {});
      expect(sizes).to.deep.equal([]);
    });

    it('should return [] for number sizes', function() {
      const sizes = adapter.getUniqueSlotSizes(1111);
      expect(sizes).to.deep.equal([]);
    });

    it('should return [] for array of numbers', function() {
      const sizes = adapter.getUniqueSlotSizes([300, 250]);
      expect(sizes).to.deep.equal([]);
    });

    it('should return array of unique strings', function() {
      const sizes = adapter.getUniqueSlotSizes(['300x250', '300x600', '728x90', '300x250']);
      expect(sizes).to.deep.equal([['300', '250'], ['300', '600'], ['728', '90']]);
    });

    it('should return array of unique strings for string elements only', function() {
      const sizes = adapter.getUniqueSlotSizes(['300x250', ['threexfour']]);
      expect(sizes).to.deep.equal([['300', '250']]);
    });

    it('should return array of unique strings, including non-numeric', function() {
      const sizes = adapter.getUniqueSlotSizes(['300x250', 'threexfour', 'fivexsix']);
      expect(sizes).to.deep.equal([['300', '250'], ['three', 'four'], ['five', 'si']]);
    });
  });

  describe('callBids', function() {
    it('should request the yieldbot library', function() {
      sinon.assert.calledOnce(adLoader.loadScript);
      sinon.assert.calledWith(adLoader.loadScript, '//cdn.yldbt.com/js/yieldbot.intent.js');
    });

    it('should set a yieldbot psn', function() {
      sinon.assert.called(yieldbotLibStub.pub);
      sinon.assert.calledWith(yieldbotLibStub.pub, '1234');
    });

    it('should not repeat multiply defined slot sizes', function() {
      sinon.assert.calledTwice(yieldbotLibStub.defineSlot);
      sinon.assert.neverCalledWith(yieldbotLibStub.defineSlot, 'medrec', {sizes: [['300', '250'], ['300', '600'], ['300', '250']]});
    });

    it('should define yieldbot slots', function() {
      sinon.assert.calledTwice(yieldbotLibStub.defineSlot);
      sinon.assert.calledWith(yieldbotLibStub.defineSlot, 'medrec', {sizes: [['300', '250'], ['300', '600']]});
      sinon.assert.calledWith(yieldbotLibStub.defineSlot, 'leaderboard', {sizes: [['728', '90'], ['970', '90']]});
    });

    it('should not use inherited Object properties, localSetupTest', function() {
      let oProto = Object.prototype;
      oProto.superProp = ['300', '250'];

      expect(Object.prototype.superProp).to.be.an('array');
      localRequest.bids.forEach((bid) => {
        expect(bid.superProp).to.be.an('array');
      });

      expect(YB_BID_FIXTURE.medrec.superProp).to.deep.equal(['300', '250']);
      expect(YB_BID_FIXTURE.leaderboard.superProp).to.deep.equal(['300', '250']);

      restoreTest();
      setupTest(localRequest, MAKE_BID_REQUEST);

      sinon.assert.neverCalledWith(yieldbotLibStub.defineSlot, 'superProp', {sizes: ['300', '250']});
      sinon.assert.calledWith(yieldbotLibStub.defineSlot, 'medrec', {sizes: [['300', '250'], ['300', '600']]});
      sinon.assert.calledWith(yieldbotLibStub.defineSlot, 'leaderboard', {sizes: [['728', '90'], ['970', '90']]});

      delete oProto.superProp;
      expect(Object.prototype.superProp).to.be.an('undefined');
    });

    it('should enable yieldbot async mode', function() {
      sinon.assert.called(yieldbotLibStub.enableAsync);
    });

    it('should add bid response after yieldbot request callback', function() {
      const plc1 = bidManagerStub.firstCall.args[0];
      expect(plc1).to.equal(localRequest.bids[0].placementCode);

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
      expect(plc2).to.equal(localRequest.bids[1].placementCode);

      const pb_bid2 = bidManagerStub.secondCall.args[1];
      expect(pb_bid2.bidderCode).to.equal('yieldbot');
      expect(pb_bid2.width).to.equal(0);
      expect(pb_bid2.height).to.equal(0);
      expect(pb_bid2.statusMessage).to.match(/empty.*response/);
    });

    it('should validate slot dimensions, localSetupTest', function() {
      let invalidSizeBid = {
        bidId: '2640ad280208ce',
        sizes: [[728, 90], [300, 250], [970, 90]],
        bidder: 'yieldbot',
        bidderRequestId: '187a340cb9ccc3',
        params: { psn: '1234', slot: 'medrec' },
        requestId: '5f297a1f-3163-46c2-854f-b55fd2e74ec3',
        placementCode: '/4294967296/adunit3'
      };

      const bidResponseMedrec = {
        bidderCode: 'yieldbot',
        width: '300',
        height: '250',
        statusMessage: 'Bid available',
        cpm: 2,
        ybot_ad: 'y',
        ybot_slot: 'medrec',
        ybot_cpm: '200',
        ybot_size: '300x250'
      };

      localRequest.bids = [invalidSizeBid];
      restoreTest();
      setupTest(localRequest, MAKE_BID_REQUEST);

      let bidManagerFirstCall = bidManagerStub.firstCall;

      expect(bidManagerFirstCall.args[0]).to.equal('/4294967296/adunit3');
      expect(bidManagerFirstCall.args[1]).to.include(bidResponseMedrec);
    });

    it('should make slot bid available once only', function() {
      const bidResponseMedrec = {
        bidderCode: 'yieldbot',
        width: '300',
        height: '250',
        statusMessage: 'Bid available',
        cpm: 2,
        ybot_ad: 'y',
        ybot_slot: 'medrec',
        ybot_cpm: '200',
        ybot_size: '300x250'
      };

      const bidResponseNone = {
        bidderCode: 'yieldbot',
        width: 0,
        height: 0,
        statusMessage: 'Bid returned empty or error response'
      };

      let firstCall = bidManagerStub.firstCall;
      let secondCall = bidManagerStub.secondCall;
      let thirdCall = bidManagerStub.thirdCall;

      expect(firstCall.args[0]).to.equal('/4294967296/adunit0');
      expect(firstCall.args[1]).to.include(bidResponseMedrec);

      expect(secondCall.args[0]).to.equal('/4294967296/adunit1');
      expect(secondCall.args[1]).to.include(bidResponseNone);

      expect(thirdCall.args[0]).to.equal('/4294967296/adunit2');
      expect(thirdCall.args[1]).to.include(bidResponseNone);
    });
  });

  describe('callBids, refresh', function() {
    it('should use yieldbot.nextPageview after first callBids', function() {
      expect(window.yieldbot._initialized).to.equal(true);

      adapter.callBids(localRequest);
      mockYieldbotBidRequest();
      sinon.assert.calledOnce(yieldbotLibStub.nextPageview);
    });

    it('should call yieldbot.nextPageview with slot config of requested bids', function() {
      expect(window.yieldbot._initialized).to.equal(true);
      sinon.assert.calledWith(yieldbotLibStub.defineSlot, 'medrec');
      sinon.assert.calledWith(yieldbotLibStub.defineSlot, 'leaderboard');

      const refreshBids = localRequest.bids.filter((object) => { return object.placementCode === '/4294967296/adunit1'; });
      let refreshRequest = cloneJson(localRequest);
      refreshRequest.bids = refreshBids;
      expect(refreshRequest.bids.length).to.equal(1);

      adapter.callBids(refreshRequest);
      mockYieldbotBidRequest();

      const expectedSlots = { 'leaderboard': [['728', '90'], ['970', '90']] };

      sinon.assert.calledWithExactly(yieldbotLibStub.nextPageview, expectedSlots);
    });

    it('should not repeat multiply defined slot sizes', function() {
      // placementCode: '/4294967296/adunit0'
      // placementCode: '/4294967296/adunit2'
      // Both placements declare medrec:300x250
      adapter.callBids(localRequest);
      mockYieldbotBidRequest();

      sinon.assert.calledOnce(yieldbotLibStub.nextPageview);
      const expectedSlots = { 'leaderboard': [['728', '90'], ['970', '90']], 'medrec': [['300', '250'], ['300', '600']]};
      sinon.assert.calledWithExactly(yieldbotLibStub.nextPageview, expectedSlots);
    });

    it('should not add empty bidResponse on callBids without bidsRequested', function() {
      expect(window.yieldbot._initialized).to.equal(true);
      expect(bidManagerStub.calledThrice).to.equal(true);

      adapter.callBids({});
      mockYieldbotBidRequest();

      expect(bidManagerStub.calledThrice).to.equal(true); // the initial bids
      sinon.assert.notCalled(yieldbotLibStub.nextPageview);
    });

    it('should validate slot dimensions', function() {
      localRequest.bids.map(bid => {
        bid.sizes = [[640, 480], [1024, 768]];
      });

      const bidResponseNone = {
        bidderCode: 'yieldbot',
        width: 0,
        height: 0,
        statusMessage: 'Bid returned empty or error response'
      };

      adapter.callBids(localRequest);
      mockYieldbotBidRequest();

      expect(bidManagerStub.getCalls().length).to.equal(6);

      let lastNextPageview = yieldbotLibStub.nextPageview.lastCall;
      let nextPageviewSlots = lastNextPageview.args[0];
      expect(nextPageviewSlots.medrec).to.deep.equal([['640', '480'], ['1024', '768']]);
      expect(nextPageviewSlots.leaderboard).to.deep.equal([['640', '480'], ['1024', '768']]);

      let fourthCall = bidManagerStub.getCall(3);
      let fifthCall = bidManagerStub.getCall(4);
      let sixthCall = bidManagerStub.getCall(5);

      expect(fourthCall.args[0]).to.equal('/4294967296/adunit0');
      expect(fourthCall.args[1]).to.include(bidResponseNone);

      expect(fifthCall.args[0]).to.equal('/4294967296/adunit1');
      expect(fifthCall.args[1]).to.include(bidResponseNone);

      expect(sixthCall.args[0]).to.equal('/4294967296/adunit2');
      expect(sixthCall.args[1]).to.include(bidResponseNone);
    });

    it('should not make requests for previously requested bids', function() {
      const bidResponseMedrec = {
        bidderCode: 'yieldbot',
        width: '300',
        height: '250',
        statusMessage: 'Bid available',
        cpm: 2,
        ybot_ad: 'y',
        ybot_slot: 'medrec',
        ybot_cpm: '200',
        ybot_size: '300x250'
      };

      const bidResponseNone = {
        bidderCode: 'yieldbot',
        width: 0,
        height: 0,
        statusMessage: 'Bid returned empty or error response'
      };

      // Refresh #1
      adapter.callBids(localRequest);
      mockYieldbotBidRequest();

      expect(bidManagerStub.getCalls().length).to.equal(6);

      let lastNextPageview = yieldbotLibStub.nextPageview.lastCall;
      let nextPageviewSlots = lastNextPageview.args[0];
      expect(nextPageviewSlots.medrec).to.deep.equal([['300', '250'], ['300', '600']]);
      expect(nextPageviewSlots.leaderboard).to.deep.equal([['728', '90'], ['970', '90']]);

      let fourthCall = bidManagerStub.getCall(3);
      let fifthCall = bidManagerStub.getCall(4);
      let sixthCall = bidManagerStub.getCall(5);

      expect(fourthCall.args[0]).to.equal('/4294967296/adunit0');
      expect(fourthCall.args[1]).to.include(bidResponseMedrec);

      expect(fifthCall.args[0]).to.equal('/4294967296/adunit1');
      expect(fifthCall.args[1]).to.include(bidResponseNone);

      expect(sixthCall.args[0]).to.equal('/4294967296/adunit2');
      expect(sixthCall.args[1]).to.include(bidResponseNone);

      localRequest.bids.map(bid => {
        bid.sizes = [[640, 480], [1024, 768]];
      });
      let bidForNinethCall = localRequest.bids[localRequest.bids.length - 1];
      bidForNinethCall.sizes = [[300, 250]];

      // Refresh #2
      adapter.callBids(localRequest);
      mockYieldbotBidRequest();

      expect(bidManagerStub.getCalls().length).to.equal(9);

      lastNextPageview = yieldbotLibStub.nextPageview.lastCall;
      nextPageviewSlots = lastNextPageview.args[0];
      expect(nextPageviewSlots.medrec).to.deep.equal([['640', '480'], ['1024', '768'], ['300', '250']]);
      expect(nextPageviewSlots.leaderboard).to.deep.equal([['640', '480'], ['1024', '768']]);

      let seventhCall = bidManagerStub.getCall(6);
      let eighthCall = bidManagerStub.getCall(7);
      let ninethCall = bidManagerStub.getCall(8);

      expect(seventhCall.args[0]).to.equal('/4294967296/adunit0');
      expect(seventhCall.args[1]).to.include(bidResponseNone);

      expect(eighthCall.args[0]).to.equal('/4294967296/adunit1');
      expect(eighthCall.args[1]).to.include(bidResponseNone);

      expect(ninethCall.args[0]).to.equal('/4294967296/adunit2');
      expect(ninethCall.args[1]).to.include(bidResponseMedrec);
    });
  });
});
