import {expect} from 'chai';
import {spec} from 'modules/finnBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

describe('FinnAdapter', () => {
  let req = {
    bidder: 'finn',
    adUnitCode: 'div-gpt-ad-1460505748561-0',
    transactionId: 'acdbf6d8-fc51-4b2b-a1b2-aba86ffeeb05',
    sizes: [[300, 250], [300, 600]],
    bidId: '2b49dcfee699a5',
  };

  let bidderRequest = {
    auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
    bidderCode: 'finn',
    bidderRequestId: '178e34bad3658f1',
    refererInfo: {
      referer: 'SomeURL'
    },
    bids: [
      {
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
        bidId: '2906eca3b3198f',
        bidder: 'finn',
        bidderRequestId: '178e34bad3658f1',
        sizes: [[300, 250], [320, 50]],
        transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
      }
    ],
  };

  let requestToServer = {
    method: 'POST',
    url: 'SomeURL',
    data: JSON.stringify([
      {
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
        bidId: '2906eca3b3198f',
        bidderRequestId: '178e34bad3658f1',
        referer: 'SomeURL',
        sizes: [[300, 250], [320, 50]],
        transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
      }
    ]
    )
  };

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('should return true for valid bidRequests ', () => {
      expect(spec.isBidRequestValid(req)).to.equal(true);
    });
    it('should return false for bidRequests with no bids', () => {
      let badRequest = {
        bids: []
      };
      expect(spec.isBidRequestValid(badRequest)).to.equal(false);
    });
  });

  const adapter = newBidder(spec);

  describe('buildRequests', () => {
    it('buildRequests fires', () => {
      let reqToServer = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(reqToServer).to.exist;
      expect(reqToServer.data).to.exist;

      let testObject = JSON.parse(requestToServer.data);
      expect(testObject.adUnitCode).to.equal(reqToServer.adUnitCode);
      expect(testObject.auctionId).to.equal(reqToServer.auctionId);
      expect(testObject.bidId).to.equal(reqToServer.bidId);
      expect(testObject.bidderRequestId).to.equal(reqToServer.bidderRequestId);
      expect(testObject.referer).to.equal(reqToServer.referer);
      expect(testObject.sizes).to.equal(reqToServer.sizes);
      expect(testObject.transactionId).to.equal(reqToServer.transactionId);
    });

    it('sends bid request to ENDPOINT via POST', () => {
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request.url).to.equal('https://www.finn.no/distribution/ssp');
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponse', () => {
    let response = [{
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      auctionId: 'dadadd6f-1a30-49b3-9ba3-c2526e3dcb47',
      creative: '<h1 style="border- radius: 7px; padding: 20px; border: 14px dotted pink; background: red; ">smashing prebid ad</h1>',
      creativeId: 'crid',
      height: 250,
      price: 0.2,
      priceType: true,
      transactionId: 'ed47c792-11e0-4250-ac6d-8e0e15c4e16a',
      ttl: 360,
      width: 200,
    }];

    it('should get correct bid response', () => {
      let expectedResponse = [
        {
          requestId: '1bae39516fa1fa',
          cpm: 0.2,
          width: 200,
          height: 250,
          creativeId: 'crid',
          dealId: null,
          currency: 'NOK',
          netRevenue: true,
          ttl: 360,
          mediaType: 'banner',
          ad: '<h1 style="border- radius: 7px; padding: 20px; border: 14px dotted pink; background: red; ">smashing prebid ad</h1>',
        }
      ];
      let result = spec.interpretResponse({body: response}, requestToServer);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles empty responses', () => {
      let response = {};
      let result = spec.interpretResponse({body: response}, requestToServer);
      expect(result.length).to.equal(0);
    });

    it('handles no responses', () => {
      let response = [];
      let result = spec.interpretResponse({body: response}, requestToServer);
      expect(result.length).to.equal(0);
    });
  });
});
