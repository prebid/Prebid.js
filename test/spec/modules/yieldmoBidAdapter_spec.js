import {expect} from 'chai';
import Adapter from '../../../modules/yieldmoBidAdapter';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';
import {parse as parseURL} from '../../../src/url';

describe('Yieldmo adapter', () => {
  let bidsRequestedOriginal;
  let adapter;
  let sandbox;

  const bidderRequest = {
    bidderCode: 'yieldmo',
    bids: [
      {
        bidId: 'bidId1',
        bidder: 'yieldmo',
        placementCode: 'foo',
        sizes: [[728, 90]]
      },
      {
        bidId: 'bidId2',
        bidder: 'yieldmo',
        placementCode: 'bar',
        sizes: [[300, 600]]
      }
    ]
  };

  beforeEach(() => {
    bidsRequestedOriginal = $$PREBID_GLOBAL$$._bidsRequested;
    $$PREBID_GLOBAL$$._bidsRequested = [];

    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();

    $$PREBID_GLOBAL$$._bidsRequested = bidsRequestedOriginal;
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

      let route = 'http://ads.yieldmo.com/ads?';
      expect(firstBidScriptURL).to.contain(route);
      expect(secondBidScriptURL).to.contain(route);

      let firstScriptParams = parseURL(firstBidScriptURL).search;
      expect(firstScriptParams).to.have.property('callback', '$$PREBID_GLOBAL$$.YMCB');
      expect(firstScriptParams).to.have.property('callback_id', 'bidId1');
      expect(firstScriptParams).to.have.property('p', 'foo');
      expect(firstScriptParams).to.have.property('page_url');

      let secondScriptParams = parseURL(secondBidScriptURL).search;
      expect(secondScriptParams).to.have.property('callback', '$$PREBID_GLOBAL$$.YMCB');
      expect(secondScriptParams).to.have.property('callback_id', 'bidId2');
      expect(secondScriptParams).to.have.property('p', 'bar');
      expect(secondScriptParams).to.have.property('page_url');
    });
  });

  describe('YMCB', () => {
    it('should exist and be a function', () => {
      expect($$PREBID_GLOBAL$$.YMCB).to.exist.and.to.be.a('function');
    });
  });

  describe('add bids to the manager', () => {
    let firstBid;
    let secondBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');

      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);

      // respond
      let bidderReponse1 = {
        'cpm': 3.45455,
        'width': 300,
        'height': 250,
        'callback_id': 'bidId1',
        'ad': '<html><head></head><body>HELLO YIELDMO AD</body></html>'
      };

      let bidderReponse2 = {
        'cpm': 4.35455,
        'width': 400,
        'height': 350,
        'callback_id': 'bidId2',
        'ad': '<html><head></head><body>HELLO YIELDMO AD</body></html>'
      };

      $$PREBID_GLOBAL$$.YMCB(bidderReponse1);
      $$PREBID_GLOBAL$$.YMCB(bidderReponse2);

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

    it('should have a good statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(1);
      expect(secondBid.getStatusCode()).to.eql(1);
    });

    it('should add the CPM to the bid object', () => {
      expect(firstBid).to.have.property('cpm', 3.45455);
      expect(secondBid).to.have.property('cpm', 4.35455);
    });

    it('should add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'yieldmo');
      expect(secondBid).to.have.property('bidderCode', 'yieldmo');
    });

    it('should include the ad on the bid object', () => {
      expect(firstBid).to.have.property('ad');
      expect(secondBid).to.have.property('ad');
    });

    it('should include the size on the bid object', () => {
      expect(firstBid).to.have.property('width', 300);
      expect(firstBid).to.have.property('height', 250);
      expect(secondBid).to.have.property('width', 400);
      expect(secondBid).to.have.property('height', 350);
    });
  });

  describe('add empty bids if no bid returned', () => {
    let firstBid;
    let secondBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');

      $$PREBID_GLOBAL$$._bidsRequested.push(bidderRequest);

      // respond
      let bidderReponse1 = {'status': 'no_bid', 'callback_id': 'bidId1'};
      let bidderReponse2 = {'status': 'no_bid', 'callback_id': 'bidId2'};

      $$PREBID_GLOBAL$$.YMCB(bidderReponse1);
      $$PREBID_GLOBAL$$.YMCB(bidderReponse2);

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
      expect(firstBid).to.have.property('bidderCode', 'yieldmo');
      expect(secondBid).to.have.property('bidderCode', 'yieldmo');
    });
  });
});
