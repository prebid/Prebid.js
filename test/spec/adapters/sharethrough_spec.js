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
        sizes: [[600, 300]],
        placementCode: 'foo',
        params: {
          pkey: 'aaaa1111'
        }
      },
      {
        bidder: 'sharethrough',
        bidId: 'bidId2',
        sizes: [[700, 400]],
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
      sandbox.spy(adapter.str, 'ajax');
    });

    it('should call ajax to make a request for each bid', () => {
      adapter.callBids(bidderRequest);

      firstBidUrl = adapter.str.ajax.firstCall.args[0];
      secondBidUrl = adapter.str.ajax.secondCall.args[0];

      sinon.assert.calledTwice(adapter.str.ajax);

      expect(firstBidUrl).to.contain(adapter.str.STR_BTLR_HOST + '/header-bid/v1?bidId=bidId1&placement_key=aaaa1111&hbVersion=%24prebid.version%24&strVersion=1.2.0&hbSource=prebid&');
      expect(secondBidUrl).to.contain(adapter.str.STR_BTLR_HOST + '/header-bid/v1?bidId=bidId2&placement_key=bbbb2222&hbVersion=%24prebid.version%24&strVersion=1.2.0&hbSource=prebid&');
    });
  });

  describe('bid requests', () => {
    let firstBid;
    let secondBid;
    let server;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');
      server = sinon.fakeServer.create();

      pbjs._bidsRequested.push(bidderRequest);
      adapter.str.placementCodeSet['foo'] = {};
      adapter.str.placementCodeSet['bar'] = {};
      // respond

      let bidderResponse1 = {
        'adserverRequestId': '40b6afd5-6134-4fbb-850a-bb8972a46994',
        'bidId': 'bidId1',
        'creatives': [
          {
            'cpm': 12.34,
            'auctionWinId': 'b2882d5e-bf8b-44da-a91c-0c11287b8051',
            'version': 1
          }
        ],
        'stxUserId': ''
      };

      let bidderResponse2 = {
        'adserverRequestId': '40b6afd5-6134-4fbb-850a-bb8972a46994',
        'bidId': 'bidId2',
        'creatives': [
          {
            'cpm': 12.35,
            'auctionWinId': 'b2882d5e-bf8b-44da-a91c-0c11287b8051',
            'version': 1
          }
        ],
        'stxUserId': ''
      };

      server.respondWith(/aaaa1111/, JSON.stringify(bidderResponse1));
      server.respondWith(/bbbb2222/, JSON.stringify(bidderResponse2));
      adapter.callBids(bidderRequest);

      server.respond();

      firstBid = bidManager.addBidResponse.firstCall.args[1];
      secondBid = bidManager.addBidResponse.secondCall.args[1];
    });

    afterEach(() => {
      server.restore();
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
