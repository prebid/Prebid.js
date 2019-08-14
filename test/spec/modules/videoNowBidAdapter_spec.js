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
    const validBidRequests = [
      {
        'bidder': 'videonow',
        'params': {
          'pId': '1',
          'placementId': 'div-gpt-ad-1438287399331-0',
          'url': 'http://localhost:8086/bid',
          'bidFloor': 10,
          'cur': 'RUB'
        },
        'crumbs': {
          'pubcid': 'feded041-35dd-4b54-979a-6d7805abfa75'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[640, 480], [320, 200]]
          }
        },
        'adUnitCode': 'test-ad',
        'transactionId': '676403c7-09c9-4b56-be82-e7cae81f40b9',
        'sizes': [[640, 480], [320, 200]],
        'bidId': '268c309f46390d',
        'bidderRequestId': '1dfdd514c36ef6',
        'auctionId': '4d523546-889a-4029-9a79-13d3c69f9922',
        'src': 'client',
        'bidRequestsCount': 1
      }
    ];

    const bidderRequest = {
      'bidderCode': 'videonow',
      'auctionId': '4d523546-889a-4029-9a79-13d3c69f9922',
      'bidderRequestId': '1dfdd514c36ef6',
      'bids': [
        {
          'bidder': 'videonow',
          'params': {
            'pId': '1',
            'placementId': 'div-gpt-ad-1438287399331-0',
            'url': 'http://localhost:8086/bid',
            'bidFloor': 10,
            'cur': 'RUB'
          },
          'crumbs': {
            'pubcid': 'feded041-35dd-4b54-979a-6d7805abfa75'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[640, 480], [320, 200]]
            }
          },
          'adUnitCode': 'test-ad',
          'transactionId': '676403c7-09c9-4b56-be82-e7cae81f40b9',
          'sizes': [[640, 480], [320, 200]],
          'bidId': '268c309f46390d',
          'bidderRequestId': '1dfdd514c36ef6',
          'auctionId': '4d523546-889a-4029-9a79-13d3c69f9922',
          'src': 'client',
          'bidRequestsCount': 1
        }
      ],
      'auctionStart': 1565794308584,
      'timeout': 3000,
      'refererInfo': {
        'referer': 'http://localhost:8086/page',
        'reachedTop': true,
        'numIframes': 0,
        'stack': [
          'http://localhost:8086/page'
        ]
      },
      'start': 1565794308589
    };

    const requests = spec.buildRequests(validBidRequests, bidderRequest);
    const request = (requests && requests.length && requests[0]) || {}

    it('bidRequest count', function () {
      expect(requests.length).to.equal(1);
    });

    it('bidRequest method', function () {
      expect(request.method).to.equal('POST');
    });

    it('bidRequest url', function () {
      expect(request.url).to.equal('http://localhost:8086/bid?profile_id=1');
    });

    it('bidRequest data', function () {
      const data = request.data;
      // const w = validBidRequests[0].sizes[0][0] + ''
      // const h = validBidRequests[0].sizes[0][1] + ''

      // expect(decodeURIComponent(data.referer)).to.be.eql(bidderRequest.refererInfo.referer);
      expect(data.aid).to.be.eql(validBidRequests[0].params.aid);
      expect(data.id).to.be.eql(validBidRequests[0].bidId);
      expect(data.sizes).to.be.eql(validBidRequests[0].sizes);
      // expect(data.height).to.be.eql(h);
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
                'impid': '1',
                'price': 10.97,
                'nurl': 'http://localhost:8086/event/nurl',
                'netRevenue': false,
                'ttl': 800,
                'adm': 'stub',
                'crid': 'e3bf2b82e3e9485113fad6c9b27f8768.1',
                'h': 640,
                'w': 480
              }
            ],
            'group': 0
          }
        ],
        'ext': {
          'placementId': 'div-gpt-ad-1438287399331-0',
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
      'method': 'POST',
      'url': 'http://localhost:8086/bid?profile_id=1',
      'data': {
        'id': '217b8ab59a18e8',
        'cpm': 10,
        'sizes': [[640, 480], [320, 200]],
        'cur': 'RUB',
        'placementId': 'div-gpt-ad-1438287399331-0',
        'ref': 'http://localhost:8086/page'
      }
    };

    const result = spec.interpretResponse(serverResponse, bidRequest);

    it('Should return an empty array if empty or no bids in response', function () {
      expect(spec.interpretResponse({body: ''}, {}).length).to.equal(0);
    });

    it('Should have only one bid', function () {
      expect(result.length).to.equal(1);
    });

    it('Should have required keys', function () {
      const bid = serverResponse.body.seatbid[0].bid[0]
      const res = result[0]
      expect(res.requestId).to.be.eql(bidRequest.data.id);
      expect(res.cpm).to.be.eql(bid.price);
      expect(res.creativeId).to.be.eql(bid.crid);
      expect(res.netRevenue).to.be.a('boolean');
      expect(res.ttl).to.be.eql(bid.ttl);
      expect(res.renderer).to.be.a('Object');
      expect(res.renderer.render).to.be.a('function');
    })
  });
});
