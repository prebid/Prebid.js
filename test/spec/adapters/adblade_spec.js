import {expect} from 'chai';
import Adapter from '../../../src/adapters/adblade';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

describe('adblade adapter', () => {
  'use strict';

  let bidsRequestedOriginal;
  let adapter;
  let sandbox;

  const bidderRequest = {
    bidderCode: 'adblade',
    bids: [
      {
        bidId: 'bidId1',
        bidder: 'adblade',
        placementCode: 'foo',
        sizes: [[728, 90]],
        params: {
          partnerId: 1,
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

  describe('sizes', () => {
    beforeEach(() => {
      sandbox.stub(adLoader, 'loadScript');
    });

    let bidderRequest = {
      bidderCode: 'adblade',
      bids: [
        {
          bidId: 'bidId1',
          bidder: 'adblade',
          placementCode: 'foo',
          sizes: [[728, 90], [300, 250]],
          params: {
            partnerId: 1,
          }
        }
      ]
    };

    it('array of arrays', () => {
      adapter.callBids(bidderRequest);
      sinon.assert.calledTwice(adLoader.loadScript);

      expect(adLoader.loadScript.firstCall.args[0]).to.include('%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%7D%2C'); // banner:{w:728, h:90}
      expect(adLoader.loadScript.firstCall.args[0]).to.include('adblade.com');
      expect(adLoader.loadScript.firstCall.args[0]).to.include('prebidjs');

      expect(adLoader.loadScript.secondCall.args[0]).to.include('%22banner%22%3A%7B%22w%22%3A300%2C%22h%22%3A250%7D%2C'); // banner:{w:300, h:250}
      expect(adLoader.loadScript.secondCall.args[0]).to.include('adblade.com');
      expect(adLoader.loadScript.secondCall.args[0]).to.include('prebidjs');
    });

    it('array of strings', () => {
      bidderRequest.bids[0].sizes = [728, 90];
      adapter.callBids(bidderRequest);
      sinon.assert.calledOnce(adLoader.loadScript);

      expect(adLoader.loadScript.firstCall.args[0]).to.include('%22banner%22%3A%7B%22w%22%3A728%2C%22h%22%3A90%7D%2C'); // banner:{w:728, h:90}
      expect(adLoader.loadScript.firstCall.args[0]).to.include('adblade.com');
      expect(adLoader.loadScript.firstCall.args[0]).to.include('prebidjs');
    });
  });

  describe('callBids', () => {
    beforeEach(() => {
      sandbox.stub(adLoader, 'loadScript');
      adapter.callBids(bidderRequest);
    });

    it('should load script', () => {
      sinon.assert.calledOnce(adLoader.loadScript);

      expect(adLoader.loadScript.firstCall.args[0]).to.include('adblade.com');
      expect(adLoader.loadScript.firstCall.args[0]).to.include('prebidjs');
    });
  });

  describe('adbladeResponse', () => {
    it('should exist and be a function', () => {
      expect(pbjs.adbladeResponse).to.exist.and.to.be.a('function');
    });
  });

  describe('add bids to the manager', () => {
    let firstBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');

      pbjs._bidsRequested.push(bidderRequest);

      // respond
      let bidderReponse = {
        'cur': 'USD',
        'id': '03a9404f-7b39-4d04-b50b-6459b9aa3ffa',
        'seatbid': [
          {
            'seat': '1',
            'bid': [
              {
                'nurl': 'http://example.com',
                'crid': '20063',
                'adomain': [
                  'www.adblade.com'
                ],
                'price': 3,
                'w': 728,
                'h': 90,
                'id': '1',
                'adm': '<div></div>',
                'impid': 'bidId1',
                'cid': '99'
              }
            ]
          }
        ]
      };
      pbjs.adbladeResponse(bidderReponse);

      firstBid = bidManager.addBidResponse.firstCall.args[1];
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledOnce(bidManager.addBidResponse);
    });

    it('should pass the correct placement code as first param', () => {
      let firstPlacementCode = bidManager.addBidResponse.firstCall.args[0];

      expect(firstPlacementCode).to.eql('foo');
    });

    it('should have a good statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(1);
    });

    it('should add the CPM to the bid object', () => {
      expect(firstBid).to.have.property('cpm', 3);
    });

    it('should include the ad to the bid object', () => {
      expect(firstBid).to.have.property('ad');
    });

    it('should include the size to the bid object', () => {
      expect(firstBid).to.have.property('width', 728);
      expect(firstBid).to.have.property('height', 90);
    });
  });

  describe('add empty bids if no bid returned', () => {
    let firstBid;

    beforeEach(() => {
      sandbox.stub(bidManager, 'addBidResponse');

      pbjs._bidsRequested.push(bidderRequest);

      // respond
      let bidderReponse = {};
      pbjs.adbladeResponse(bidderReponse);

      firstBid = bidManager.addBidResponse.firstCall.args[1];
    });

    it('should add a bid object for each bid', () => {
      sinon.assert.calledOnce(bidManager.addBidResponse);
    });

    it('should have an error statusCode', () => {
      expect(firstBid.getStatusCode()).to.eql(2);
    });

    it('should pass the correct placement code as first param', () => {
      let firstPlacementCode = bidManager.addBidResponse.firstCall.args[0];

      expect(firstPlacementCode).to.eql('foo');
    });

    it('should add the bidder code to the bid object', () => {
      expect(firstBid).to.have.property('bidderCode', 'adblade');
    });
  });
});
