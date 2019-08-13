import { expect } from 'chai';
import { spec } from 'modules/videoNowBidAdapter';

describe('videonowAdapterTests', function () {
  describe('bidRequestValidity', function () {
    it('bidRequest with pId', function () {
      expect(spec.isBidRequestValid({
        bidder: 'videonow',
        params: {
          pId: '86858',
        }
      })).to.equal(true);
    });

    it('bidRequest without pId', function () {
      expect(spec.isBidRequestValid({
        bidder: 'videonow',
        params: {
          nomater: 86858
        }
      })).to.equal(false);
    });
  });

  describe('bidRequest', function () {
    const validBidRequests = [{
      'bidder': 'videonow',
      'params': {
        'pId': '1',
        'placementId': 'div-gpt-ad-1438287399331-0',
        'url': 'http://localhost:8086/bid',
        'bidFloor': 10
      },
      'crumbs': {
        'pubcid': '9ab37692-3798-4eee-8510-9cc76e8be8f6'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': 'test-ad',
      'transactionId': '1c48a82f-aaf0-4e70-8b13-5b63c1259fb7',
      'sizes': [[640, 480]],
      'bidId': '2dccf547f2c736',
      'bidderRequestId': '1c495372b6c6b2',
      'auctionId': '8fd34e56-ae49-4d9e-ad04-9ce627cdbcbd',
      'src': 'client',
      'bidRequestsCount': 1
    }];

    const bidderRequest = {
      'bidderCode': 'videonow',
      'auctionId': '8fd34e56-ae49-4d9e-ad04-9ce627cdbcbd',
      'bidderRequestId': '1c495372b6c6b2',
      'bids': [
        {
          'bidder': 'videonow',
          'params': {
            'pId': '1',
            'placementId': 'div-gpt-ad-1438287399331-0',
            'url': 'http://localhost:8086/bid',
            'bidFloor': 10
          },
          'crumbs': {
            'pubcid': '9ab37692-3798-4eee-8510-9cc76e8be8f6'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[640, 480]] }
          },
          'adUnitCode': 'test-ad',
          'transactionId': '1c48a82f-aaf0-4e70-8b13-5b63c1259fb7',
          'sizes': [[640, 480]],
          'bidId': '2dccf547f2c736',
          'bidderRequestId': '1c495372b6c6b2',
          'auctionId': '8fd34e56-ae49-4d9e-ad04-9ce627cdbcbd',
          'src': 'client',
          'bidRequestsCount': 1
        }
      ],
      'auctionStart': 1565711321749,
      'timeout': 3000,
      'refererInfo': {
        'referer': 'http://localhost:8086/page',
        'reachedTop': true,
        'numIframes': 0,
        'stack': [
          'http://localhost:8086/page'
        ]
      },
      'start': 1565711321755
    };

    const requests = spec.buildRequests(validBidRequests, bidderRequest);
    const request = (requests && requests.length && requests[0]) || {}

    it('bidRequest count', function () {
      expect(requests.length).to.equal(1);
    });

    it('bidRequest method', function () {
      expect(request.method).to.equal('GET');
    });

    it('bidRequest url', function () {
      expect(request.url).to.equal('http://localhost:8086/bid?pId=1');
    });

    it('bidRequest data', function () {
      const data = request.data;
      const w = validBidRequests[0].sizes[0][0] + ''
      const h = validBidRequests[0].sizes[0][1] + ''

      expect(decodeURIComponent(data.referer)).to.be.eql(bidderRequest.refererInfo.referer);
      expect(data.aid).to.be.eql(validBidRequests[0].params.aid);
      expect(data.bidId).to.be.eql(validBidRequests[0].bidId);
      expect(data.width).to.be.eql(w);
      expect(data.height).to.be.eql(h);
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      'body': {
        'id': '111-111',
        'bidid': '2955a162-699e-4811-ce88-5c3ac973e73c',
        'cur': 'RUB',
        'seatbid': [
          {
            'bid': [
              {
                'id': 'e3bf2b82e3e9485113fad6c9b27f8768.1',
                'impid': '11111111',
                'price': 10.97,
                'nurl': 'http://localhost:8086/event/nurl',
                'netRevenue': true,
                'ttl': 800,
                'adm': {
                  'profileId': 1,
                  'dataUrl': 'http://localhost:8086/init',
                  'init': 'http://localhost:8086/vn_init.js'
                },
                'crid': 'e3bf2b82e3e9485113fad6c9b27f8768.1'
              }
            ],
            'group': 0
          }
        ],
        'ext': {
          'pixels': [
            'http://localhost:8086/event/pxlcookiematching?uiid=1',
            'http://localhost:8086/event/pxlcookiematching?uiid=2'
          ],
          'iframes': [
            'http://localhost:8086/event/ifrcookiematching?uiid=1',
            'http://localhost:8086/event/ifrcookiematching?uiid=2'
          ]
        }
      },
      'headers': {}
    };

    const bidRequest = {
      'method': 'GET',
      'url': 'http://localhost:8086/bid?pId=1',
      'data': {
        'referer': 'http://localhost:8086/page',
        'cb': 1565715456073,
        'placementId': 'div-gpt-ad-1438287399331-0',
        'bidId': '2467b82a7afaf1',
        'bidFloor': 10,
        'width': '640',
        'height': '480'
      }
    };

    const result = spec.interpretResponse(serverResponse, bidRequest);

    it('Should return an empty array if empty or no bids in response', function () {
      expect(spec.interpretResponse({body: ''}, {}).length).to.equal(0);
    });

    it('Should have only one bid', function () {
      expect(result.length).to.equal(1);
    });

    // it('d', function() {
    //   const res = result[0]
    //   const bid = serverResponse.body.seatbid[0].bid
    //   expect(res).to.be.eql(bid);
    // })
    //
    it('Should have required keys', function () {
      const bid = serverResponse.body.seatbid[0].bid[0]
      const res = result[0]
      expect(res.requestId).to.be.eql(bidRequest.data.bidId);
      expect(res.cpm).to.be.eql(bid.price);
      expect(res.creativeId).to.be.eql(bid.crid);
      expect(res.netRevenue).to.be.eql(true);
      expect(res.ttl).to.be.eql(bid.ttl);
    })
  });
});
