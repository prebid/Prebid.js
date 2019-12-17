import { expect } from 'chai';
import { spec } from 'modules/rtbdemandBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('rtbdemandAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'rtbdemand',
      'params': {
        'zoneid': '37',
        'floor': '0.05',
        'server': 'bidding.rtbdemand.com',
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'zoneid': '37',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'zoneid': 0,
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidderRequest = {
      bidderCode: 'rtbdemand',
      auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
      bidderRequestId: '178e34bad3658f',
      bids: [
        {
          bidder: 'rtbdemand',
          params: {
            zoneid: '37',
            floor: '0.05',
            server: 'bidding.rtbdemand.com',
          },
          placementCode: '/19968336/header-bid-tag-0',
          sizes: [[300, 250], [320, 50]],
          bidId: '2ffb201a808da7',
          bidderRequestId: '178e34bad3658f',
          auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
          transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
        },
        {
          bidder: 'rtbdemand',
          params: {
            zoneid: '37',
            floor: '0.05',
            server: 'bidding.rtbdemand.com',
          },
          placementCode: '/19968336/header-bid-tag-0',
          sizes: [[728, 90], [320, 50]],
          bidId: '2ffb201a808da7',
          bidderRequestId: '178e34bad3658f',
          auctionId: 'c45dd708-a418-42ec-b8a7-b70a6c6fab0a',
          transactionId: 'd45dd707-a418-42ec-b8a7-b70a6c6fab0b'
        }
      ],
      start: 1472239426002,
      auctionStart: 1472239426000,
      timeout: 5000
    };

    it('should add source and verison to the tag', function () {
      const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const payload = request.data;
      expect(payload.from).to.exist;
      expect(payload.v).to.exist;
      expect(payload.request_id).to.exist;
      expect(payload.imp_id).to.exist;
      expect(payload.aff).to.exist;
      expect(payload.bid_floor).to.exist;
      expect(payload.charset).to.exist;
      expect(payload.site_domain).to.exist;
      expect(payload.site_page).to.exist;
      expect(payload.subid).to.exist;
      expect(payload.flashver).to.exist;
      expect(payload.tmax).to.exist;
    });

    it('sends bid request to ENDPOINT via GET', function () {
      const [request] = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request.url).to.equal('https://bidding.rtbdemand.com/hb');
      expect(request.method).to.equal('GET');
    });
  })

  describe('interpretResponse', function () {
    let response = {
      'id': '543210',
      'seatbid': [ {
        'bid': [ {
          'id': '1111111',
          'impid': 'bidId-123456-1',
          'w': 728,
          'h': 90,
          'price': 0.09,
          'adm': '<!-- Creative -->',
        } ],
      } ]
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          requestId: 'bidId-123456-1',
          creativeId: 'bidId-123456-1',
          cpm: 0.09,
          width: 728,
          height: 90,
          ad: '<!-- Creative -->',
          netRevenue: true,
          currency: 'USD',
          ttl: 360,
        }
      ];

      let result = spec.interpretResponse({ body: response });
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      let response = {
        'id': '543210',
        'seatbid': [ ]
      };

      let result = spec.interpretResponse({ body: response });
      expect(result.length).to.equal(0);
    });
  });

  describe('user sync', function () {
    const syncUrl = 'https://bidding.rtbdemand.com/delivery/matches.php?type=iframe';

    it('should register the sync iframe', function () {
      expect(spec.getUserSyncs({})).to.be.undefined;
      expect(spec.getUserSyncs({iframeEnabled: false})).to.be.undefined;
      const options = spec.getUserSyncs({iframeEnabled: true});
      expect(options).to.not.be.undefined;
      expect(options).to.have.lengthOf(1);
      expect(options[0].type).to.equal('iframe');
      expect(options[0].url).to.equal(syncUrl);
    });
  });
});
