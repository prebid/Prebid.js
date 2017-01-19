import { expect } from 'chai';
import Adapter from '../../../src/adapters/sharethrough';
import bidManager from '../../../src/bidmanager';

describe('sharethrough adapter', () => {

  let adapter;
  let sandbox;
  let bidsRequestedOriginal;

  const bidderRequest = {
    bidderCode: 'sharethrough',
    bids: [
      {
        bidder: 'sharethrough',
        bidId: 'bidId1',
        sizes: [[600,300]],
        placementCode: 'foo',
        params: {
          pkey: 'aaaa1111'
        }
      },
      {
        bidder: 'sharethrough',
        bidId: 'bidId2',
        sizes: [[700,400]],
        placementCode: 'bar',
        params: {
          pkey: 'bbbb2222'
        }
      }
    ]
  };

  beforeEach(() => {
    adapter = new Adapter();
    sandbox = sinon.sandbox.create();
    bidsRequestedOriginal = pbjs._bidsRequested;
    pbjs._bidsRequested = [];
  });

  afterEach(() => {
    sandbox.restore();

    pbjs._bidsRequested = bidsRequestedOriginal;
  });

  describe('callBids', () => {

    let firstBidUrl;
    let secondBidUrl;

    beforeEach(() => {
       sandbox.spy(adapter.str, 'loadIFrame');
    });

    it('should call loadIFrame on the adloader for each bid', () => {

      adapter.callBids(bidderRequest);

      firstBidUrl = adapter.str.loadIFrame.firstCall.args[0];
      secondBidUrl = adapter.str.loadIFrame.secondCall.args[0];

      sinon.assert.calledTwice(adapter.str.loadIFrame);

      expect(firstBidUrl).to.contain(adapter.str.STR_BTLR_HOST + '/header-bid/v1?bidId=bidId1&placement_key=aaaa1111&ijson=pbjs.strcallback&hbVersion=%24prebid.version%24&strVersion=0.1.0&hbSource=prebid&');
      expect(secondBidUrl).to.contain(adapter.str.STR_BTLR_HOST + '/header-bid/v1?bidId=bidId2&placement_key=bbbb2222&ijson=pbjs.strcallback&hbVersion=%24prebid.version%24&strVersion=0.1.0&hbSource=prebid&');
    });

  });

  describe('strcallback', () => {

    it('should exist and be a function', () => {
      let shit = sandbox.stub(pbjs, 'strcallback');
      expect(pbjs.strcallback).to.exist.and.to.be.a('function');
    });

  });

  describe('bid requests', () => {

    let firstBid;
    let secondBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');

      pbjs._bidsRequested.push(bidderRequest);
      adapter.str.placementCodeSet['foo'] = {};
      adapter.str.placementCodeSet['bar'] = {};
      // respond

      let bidderReponse1 = {
                              "adserverRequestId": "40b6afd5-6134-4fbb-850a-bb8972a46994",
                              "bidId": "bidId1",
                              "creatives": [
                                {
                                  "cpm": 12.34,
                                  "auctionWinId": "b2882d5e-bf8b-44da-a91c-0c11287b8051",
                                  "version": 1
                                }
                              ],
                              "stxUserId": ""
                            };

      let bidderReponse2 = {
                              "adserverRequestId": "40b6afd5-6134-4fbb-850a-bb8972a46994",
                              "bidId": "bidId2",
                              "creatives": [
                                {
                                  "cpm": 12.35,
                                  "auctionWinId": "b2882d5e-bf8b-44da-a91c-0c11287b8051",
                                  "version": 1
                                }
                              ],
                              "stxUserId": ""
                            };

      pbjs.strcallback(bidderReponse1);
      pbjs.strcallback(bidderReponse2);

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
      expect(firstBid).to.have.property('cpm', 12.34);
      expect(secondBid).to.have.property('cpm', 12.35);
    });

    it('should add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'sharethrough');
      expect(secondBid).to.have.property('bidderCode', 'sharethrough');
    });

    it('should include the ad on the bid object', () => {
      expect(firstBid).to.have.property('ad');
      expect(secondBid).to.have.property('ad');
    });

    it('should include the size on the bid object', () => {
      expect(firstBid).to.have.property('width', 600);
      expect(firstBid).to.have.property('height', 300);
      expect(secondBid).to.have.property('width', 700);
      expect(secondBid).to.have.property('height', 400);
    });

    it('should include the pkey', () => {
      expect(firstBid).to.have.property('pkey', 'aaaa1111');
      expect(secondBid).to.have.property('pkey', 'bbbb2222');
    });

  });

});
