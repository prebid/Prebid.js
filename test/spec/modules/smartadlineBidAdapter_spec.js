import {expect} from 'chai';
import {spec} from 'modules/smartadlineBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

describe('smartadlineBidAdapter', function () {
  const adapter = newBidder(spec);
  let bid = {
    adUnitCode: 'adunit-code',
    auctionId: '5kaj89l8-3456-2s56-c455-4g6h78jsdfgf',
    bidRequestsCount: 1,
    bidder: 'smartadline',
    bidderRequestId: '24081afs940568',
    bidderRequestsCount: 1,
    bidderWinsCount: 0,
    bidId: '22499d052045',
    mediaTypes: {banner: {sizes: [[300, 250]]}},
    params: {
      publisherId: 'testPlacementId'
    },
    sizes: [
      [300, 250]
    ],
    transactionId: '34562345-4dg7-46g7-4sg6-45gdsdj8fd56'
  }
  let bidderRequests = {
    auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    auctionStart: 1579746300522,
    bidderCode: 'myBidderCode',
    bidderRequestId: '15246a574e859f',
    bids: [bid],
    refererInfo: {
      canonicalUrl: '',
      numIframes: 0,
      reachedTop: true
    }
  }
  describe('isBidRequestValid', function () {
    it('should return true where required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });
  describe('buildRequests', function () {
    let bidRequests = [ bid ];
    let request = spec.buildRequests(bidRequests, bidderRequests);
    it('sends bid request via POST', function () {
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = {
      method: 'POST',
      url: 'https://smartadline.com/hb.php',
      bids: [bid],
      data: [{
        bidId: '22499d052045',
        publiserId: 'testPlacementId',
      }]
    };
    let serverResponse = {
      body: [{
        bidId: '22499d052045',
        id: 987654,
        cpm: 10,
        netRevenue: 0,
        creativeId: 987654,
        currency: 'EUR',
        ttl: 30,
        ad: 'some ad markup',
        bannerFormatWidth: 300,
        bannerFormatHeight: 250,
        bannerFormatAlias: 'medium_rectangle',
        domains: ['www.advertiser.com'],
        title: 'Advertiser'
      }]
    };
    let expectedResponse = [{
      requestId: bid.bidId,
      cpm: 10,
      width: 300,
      height: 250,
      creativeId: 987654,
      currency: 'EUR',
      netRevenue: false, // gross
      ttl: 30,
      ad: 'some ad markup',
      meta: {
        advertiserDomains: ['www.advertiser.com'],
        advertiserName: 'Advertiser'
      }}];
    let result = spec.interpretResponse(serverResponse, bidRequest);
    it('should contain correct creativeId', function () {
	  expect(result[0].creativeId).to.equal(expectedResponse[0].creativeId)
    });
    it('should contain correct cpm', function () {
	  expect(result[0].cpm).to.equal(expectedResponse[0].cpm)
    });
    it('should contain correct requestId', function () {
	  expect(result[0].requestId).to.equal(expectedResponse[0].requestId)
    });
    it('should contain correct ad content', function () {
	  expect(result[0].ad).to.equal(expectedResponse[0].ad)
    });
  });
});
