import { expect } from 'chai';
import { spec } from 'modules/admediaBidAdapter';

describe('admediaAdapterTests', function () {
  describe('bidRequestValidity', function () {
    it('bidRequest with aid', function () {
      expect(spec.isBidRequestValid({
        bidder: 'admedia',
        params: {
          aid: 86858,
        }
      })).to.equal(true);
    });

    it('bidRequest without aid', function () {
      expect(spec.isBidRequestValid({
        bidder: 'a4g',
        params: {
          key: 86858
        }
      })).to.equal(false);
    });
  });

  describe('bidRequest', function () {
    const validBidRequests = [{
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'auctionId': 'e3010a3c-5b95-4475-9ba2-1b004c737c30',
      'bidId': '2758de47c84ab58',
      'bidRequestsCount': 1,
      'bidder': 'admedia',
      'bidderRequestId': '1033407c6af0c7',
      'params': {
        'aid': 86858,
      },
      'sizes': [[300, 250], [300, 600]],
      'transactionId': '5851b2cf-ee2d-4022-abd2-d581ef01604e'
    }, {
      'adUnitCode': 'div-gpt-ad-1460505748561-1',
      'auctionId': 'e3010a3c-5b95-4475-9ba2-1b004c737c30',
      'bidId': '3d2aaa400371fa',
      'bidRequestsCount': 1,
      'bidder': 'admedia',
      'bidderRequestId': '1033407c6af0c7',
      'params': {
        'aid': 84977,
      },
      'sizes': [[728, 90]],
      'transactionId': 'f8b5247e-7715-4e60-9d51-33153e78c190'
    }];

    const bidderRequest = {
      'auctionId': 'e3010a3c-5b95-4475-9ba2-1b004c737c30',
      'bidderCode': 'admedia',
      'bidderRequestId': '1033407c6af0c7',
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'https://test.com/index.html?pbjs_debug=true'
      }

    };

    const request = spec.buildRequests(validBidRequests, bidderRequest);

    it('bidRequest method', function () {
      expect(request.method).to.equal('POST');
    });

    it('bidRequest url', function () {
      expect(request.url).to.equal('https://prebid.admedia.com/bidder/');
    });

    it('bidRequest data', function () {
      const data = JSON.parse(request.data);
      expect(decodeURIComponent(data.referer)).to.be.eql(bidderRequest.refererInfo.referer);
      expect(data.tags).to.be.an('array');
      expect(data.tags[0].aid).to.be.eql(validBidRequests[0].params.aid);
      expect(data.tags[0].id).to.be.eql(validBidRequests[0].bidId);
      expect(data.tags[0].sizes).to.be.eql(validBidRequests[0].sizes);
      expect(data.tags[1].aid).to.be.eql(validBidRequests[1].params.aid);
      expect(data.tags[1].id).to.be.eql(validBidRequests[1].bidId);
      expect(data.tags[1].sizes).to.be.eql(validBidRequests[1].sizes);
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        tags: [
          {
            ad: '<img src="https://dummyimage.com/300x600/000150/fff.jpg&text=Admedia">',
            cpm: 0.9,
            height: 250,
            id: '5582180864bc41',
            width: 300,
          },
          {
            error: 'Error message',
            id: '6dc6ee4e157749'
          },
          {
            ad: '',
            cpm: 0,
            height: 728,
            id: '5762180864bc41',
            width: 90,
          }
        ]
      },
      headers: {}
    };

    const bidRequest = {};

    const result = spec.interpretResponse(serverResponse, bidRequest);

    it('Should return an empty array if empty or no tags in response', function () {
      expect(spec.interpretResponse({body: ''}, {}).length).to.equal(0);
    });

    it('Should have only one bid', function () {
      expect(result.length).to.equal(1);
    });

    it('Should have required keys', function () {
      expect(result[0].requestId).to.be.eql(serverResponse.body.tags[0].id);
      expect(result[0].cpm).to.be.eql(serverResponse.body.tags[0].cpm);
      expect(result[0].width).to.be.eql(serverResponse.body.tags[0].width);
      expect(result[0].height).to.be.eql(serverResponse.body.tags[0].height);
      expect(result[0].creativeId).to.be.eql(serverResponse.body.tags[0].id);
      expect(result[0].dealId).to.be.eql(serverResponse.body.tags[0].id);
      expect(result[0].netRevenue).to.be.eql(true);
      expect(result[0].ttl).to.be.eql(120);
      expect(result[0].ad).to.be.eql(serverResponse.body.tags[0].ad);
    })
  });
});
