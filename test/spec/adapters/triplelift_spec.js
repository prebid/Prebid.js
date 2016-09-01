import {expect} from 'chai';
import Adapter from '../../../src/adapters/triplelift';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';
import {parse as parseURL} from '../../../src/url';

describe('triplelift adapter', () => {

  let bidsRequestedOriginal;
  let adapter;
  let sandbox;

  const bidderRequest = {
    bidderCode: 'triplelift',
    bids: [
      {
        bidId: 'bidId1',
        bidder: 'triplelift',
        placementCode: 'foo',
        sizes: [[728, 90]],
        params: {
          inventoryCode: 'codeA'
        }
      },
      {
        bidId: 'bidId2',
        bidder: 'triplelift',
        placementCode: 'bar',
        sizes: [[300, 600]],
        params: {
          inventoryCode: 'codeB',
          floor: 1
        }
      }
    ]
  };

  beforeEach(() => {
    bidsRequestedOriginal = pbjs._bidsRequested;
    pbjs._bidsRequested = [];

    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();

    pbjs._bidsRequested = bidsRequestedOriginal;
  });

  describe('callBids', () => {

    let firstBidScriptURL;
    let secondBidScriptURL;

    beforeEach(() => {
      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(bidderRequest);

      firstBidScriptURL = adLoader.loadScript.firstCall.args[0];
      secondBidScriptURL = adLoader.loadScript.secondCall.args[0]
    });

    it('should load a script for each bid request', () => {
      sinon.assert.calledTwice(adLoader.loadScript);

      let route = 'http://tlx.3lift.com/header/auction?';
      expect(firstBidScriptURL).to.contain(route);
      expect(secondBidScriptURL).to.contain(route);

      let firstScriptParams = parseURL(firstBidScriptURL).search;
      expect(firstScriptParams).to.have.property('callback','pbjs.TLCB');
      expect(firstScriptParams).to.have.property('callback_id','bidId1');
      expect(firstScriptParams).to.have.property('inv_code','codeA');
      expect(firstScriptParams).to.have.property('size','728x90');
      expect(firstScriptParams).to.have.property('referrer');

      let secondScriptParams = parseURL(secondBidScriptURL).search;
      expect(secondScriptParams).to.have.property('callback','pbjs.TLCB');
      expect(secondScriptParams).to.have.property('callback_id','bidId2');
      expect(secondScriptParams).to.have.property('inv_code','codeB');
      expect(secondScriptParams).to.have.property('size','300x600');
      expect(secondScriptParams).to.have.property('floor','1');
      expect(secondScriptParams).to.have.property('referrer');
    });

  });

  describe('TLCB', () => {

    it('should exist and be a function', () => {
      expect(pbjs.TLCB).to.exist.and.to.be.a('function');
    });

  });

  describe('add bids to the manager', () => {

    let firstBid;
    let secondBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');

      pbjs._bidsRequested.push(bidderRequest);

      // respond
      let bidderReponse1 = {
        "ad": "<script></script>",
        "callback_id": "bidId1",
        "cpm": 0.20,
        "height": 90,
        "iurl": "",
        "width": 728
      };

      let bidderReponse2 = {
        "ad": "<script></script>",
        "callback_id": "bidId2",
        "cpm": 0.30,
        "height": 600,
        "iurl": "",
        "width": 300,
        "deal_id": "dealA"
      };

      pbjs.TLCB(bidderReponse1);
      pbjs.TLCB(bidderReponse2);

      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledTwice(bidManager.addBidResponse);
    });

    it('should pass the correct placement code as first param', () => {
      let firstPlacementCode = bidManager.addBidResponse.firstCall.args[0];
      let secondPlacementCode = bidManager.addBidResponse.secondCall.args[0];

      expect(firstPlacementCode).to.eql('foo');
      expect(secondPlacementCode).to.eql('bar');
    });

    it('should include the bid request bidId as the adId', () => {
      expect(firstBid).to.have.property('adId', 'bidId1');
      expect(secondBid).to.have.property('adId', 'bidId2');
    });

    it('should have a good statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(1);
      expect(secondBid.getStatusCode()).to.eql(1);
    });

    it('should add the CPM to the bid object', () => {
      expect(firstBid).to.have.property('cpm', 0.20);
      expect(secondBid).to.have.property('cpm', 0.30);
    });

    it('should add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'triplelift');
      expect(secondBid).to.have.property('bidderCode', 'triplelift');
    });

    it('should include the ad on the bid object', () => {
      expect(firstBid).to.have.property('ad');
      expect(secondBid).to.have.property('ad');
    });

    it('should include the size on the bid object', () => {
      expect(firstBid).to.have.property('width', 728);
      expect(firstBid).to.have.property('height', 90);
      expect(secondBid).to.have.property('width', 300);
      expect(secondBid).to.have.property('height', 600);
    });

    it('should include the dealId on the bid object if present', () => {
      expect(firstBid).to.have.property('dealId', undefined);
      expect(secondBid).to.have.property('dealId', 'dealA');
    });
  });

  describe('add empty bids if no bid returned', () => {

    let firstBid;
    let secondBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');

      pbjs._bidsRequested.push(bidderRequest);

      // respond
      let bidderReponse1 = {"status":"no_bid","callback_id":"bidId1"};
      let bidderReponse2 = {"status":"no_bid","callback_id":"bidId2"};

      pbjs.TLCB(bidderReponse1);
      pbjs.TLCB(bidderReponse2);

      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledTwice(bidManager.addBidResponse);
    });

    it('should include the bid request bidId as the adId', () => {
      expect(firstBid).to.have.property('adId', 'bidId1');
      expect(secondBid).to.have.property('adId', 'bidId2');
    });

    it('should have an error statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(2);
      expect(secondBid.getStatusCode()).to.eql(2);
    });

    it('should pass the correct placement code as first param', () => {
      let firstPlacementCode = bidManager.addBidResponse.firstCall.args[0];
      let secondPlacementCode = bidManager.addBidResponse.secondCall.args[0];

      expect(firstPlacementCode).to.eql('foo');
      expect(secondPlacementCode).to.eql('bar');
    });

    it('should add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'triplelift');
      expect(secondBid).to.have.property('bidderCode', 'triplelift');
    });

  });
});
