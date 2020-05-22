import { expect } from 'chai';
import { spec } from 'modules/eywamediaBidAdapter';

describe('EywamediaAdapter', function () {
  let serverResponse, bidRequests, bidRequest, bidResponses;
  const ENDPOINT = 'https://adtarbostg.eywamedia.com/auctions/prebidjs/3000';

  bidRequests = [
    {
      'auctionId': 'fc917230-a5e1-4a42-b7d9-8fb776124e43',
      'sizes': [[300, 250]],
      'bidRequestsCount': 1,
      'params': {
        'publisherId': '1234_abcd'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250]]
        }
      },
      'crumbs': {
        'pubcid': '8b640d4e-1f6d-4fd3-b63f-2570572d8100'
      },
      'bidId': '28b09d0543d671',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd909c39c-ecc9-41a4-897c-2d2fdfdf41b1',
      'src': 'client',
      'bidder': 'eywamedia',
      'bidderRequestId': '14d8cbc769114b'
    },
    {
      'auctionId': 'fc917230-a5e1-4a42-b7d9-8fb776124e43',
      'sizes': [[728, 90]],
      'bidRequestsCount': 1,
      'params': {
        'publisherId': '1234_abcd'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]]
        }
      },
      'crumbs': {
        'pubcid': '8b640d4e-1f6d-4fd3-b63f-2570572d8100'
      },
      'bidId': '28b09d0543d672',
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'transactionId': 'd909c39c-ecc9-41a4-897c-2d2fdfdf41b2',
      'src': 'client',
      'bidder': 'eywamedia',
      'bidderRequestId': '14d8cbc769114b'
    }
  ];

  bidRequest = {
    'auctionId': 'c88115a4-7e71-43d0-9c96-a9b43ebd143d',
    'auctionStart': 1564725164517,
    'bidderCode': 'eywamedia',
    'bidderRequestId': '191afa18994fdd',
    'bids': [],
    'refererInfo': {
      'canonicalUrl': '',
      'numIframes': 0,
      'reachedTop': true,
      'referer': ''
    },
    'stack': [
      ''
    ],
    'start': 1564725164520,
    'timeout': 3000
  };

  let testBid = {
    'bidder': 'eywamedia',
    'params': {
      'publisherId': '1234_abcd'
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(testBid));
    });

    it('should return false when required params are missing', function () {
      testBid.params = {
        test: '231212312'
      };
      assert.isFalse(spec.isBidRequestValid(testBid));
    });
  });

  describe('buildRequests', function () {
    it('should attempt to send bid requests to the endpoint via POST', function () {
      const requests = spec.buildRequests(bidRequests, bidRequest);
      expect(requests.method).to.equal('POST');
      expect(requests.url).to.be.equal(ENDPOINT);
    });

    it('should not blow up if crumbs is undefined', function () {
      let bidArray = [
        { ...testBid, crumbs: undefined }
      ]
      expect(function () { spec.buildRequests(bidArray, bidRequest) }).not.to.throw()
    })

    it('should return true when required params found', function () {
      testBid.params.publisherId = '1234_abcd';
      assert(spec.isBidRequestValid(testBid));
    });
  });

  describe('interpretResponse', function () {
    beforeEach(function () {
      serverResponse = {
        'body':
        [
          {
            'ad': '<a href="https://adtarbostg.eywamedia.com/click/2/4/prebidjs?adpl=site&ip=&locn=&ssp=eywamedia&id=28b09d0543d671&exch=prebidjs&c=&ma=&d=&g=&la=lat&lo=lon&mo=&camp=2&l=&p=prebidjs%3A1234_abcd&u=bc6ca9f9-da6e-39b6-e325-c70ce023a62d&y=" target="_blank"><img width="300" height="250" src="https://adtarbo.s3.ap-south-1.amazonaws.com/prebidjs/300x250.jpg"/><img width="1" height="1" src=https://adtarbostg.eywamedia.com/win/prebidjs/1.000000/2/4/${AUCTION_PRICE}?adpl=site&ip=&locn=&ssp=eywamedia&id=28b09d0543d671&exch=prebidjs&c=&ma=&d=&g=&la=lat&lo=lon&mo=&camp=2&l=&p=prebidjs%3A1234_abcd&u=bc6ca9f9-da6e-39b6-e325-c70ce023a62d&y= style="display:none;"/></a>',
            'adSlot': '',
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'adUrl': 'http://eywamedia.com',
            'bidId': '28b09d0543d671',
            'bidder': 'eywamedia',
            'bidderCode': 'eywamedia',
            'cpm': 1,
            'height': 250,
            'requestTimestamp': 1564725162,
            'respType': 'banner',
            'size': '300X250',
            'statusMessage': 'Bid available',
            'transactionId': 'd909c39c-ecc9-41a4-897c-2d2fdfdf41b1',
            'usesGenericKeys': true,
            'width': 300
          },
          {
            'ad': '<a href="https://adtarbostg.eywamedia.com/click/4/4/prebidjs?adpl=site&ip=&locn=&ssp=eywamedia&id=28b09d0543d672&exch=prebidjs&c=&ma=&d=&g=&la=lat&lo=lon&mo=&camp=2&l=&p=prebidjs%3A1234_abcd&u=bc6ca9f9-da6e-39b6-e325-c70ce023a62d&y=" target="_blank"><img width="728" height="90" src="https://adtarbo.s3.ap-south-1.amazonaws.com/prebidjs/728x90.jpg"/><img width="1" height="1" src=https://adtarbostg.eywamedia.com/win/prebidjs/1.000000/4/4/${AUCTION_PRICE}?adpl=site&ip=&locn=&ssp=eywamedia&id=28b09d0543d672&exch=prebidjs&c=&ma=&d=&g=&la=lat&lo=lon&mo=&camp=2&l=&p=prebidjs%3A1234_abcd&u=bc6ca9f9-da6e-39b6-e325-c70ce023a62d&y= style="display:none;"/></a>',
            'adSlot': '',
            'adUnitCode': 'div-gpt-ad-1460505748561-1',
            'adUrl': 'http://eywamedia.com',
            'bidId': '28b09d0543d672',
            'bidder': 'eywamedia',
            'bidderCode': 'eywamedia',
            'cpm': 1,
            'height': 90,
            'requestTimestamp': 1564725164,
            'respType': 'banner',
            'size': '728X90',
            'statusMessage': 'Bid available',
            'transactionId': 'd909c39c-ecc9-41a4-897c-2d2fdfdf41b2',
            'usesGenericKeys': true,
            'width': 728
          }
        ],
        'headers': 'header?'
      };

      bidRequest = {
        'data':
          {
            'bidPayload':
              [
                {
                  'auctionId': 'fc917230-a5e1-4a42-b7d9-8fb776124e43',
                  'sizes': [[300, 250]],
                  'bidRequestsCount': 1,
                  'params': {
                    'publisherId': '1234_abcd'
                  },
                  'mediaTypes': {
                    'banner': {
                      'sizes': [[300, 250]]
                    }
                  },
                  'crumbs': {
                    'pubcid': '8b640d4e-1f6d-4fd3-b63f-2570572d8100'
                  },
                  'bidId': '28b09d0543d671',
                  'adUnitCode': 'div-gpt-ad-1460505748561-0',
                  'transactionId': 'd909c39c-ecc9-41a4-897c-2d2fdfdf41b1',
                  'src': 'client',
                  'bidder': 'eywamedia',
                  'bidderRequestId': '14d8cbc769114b'
                },
                {
                  'auctionId': 'fc917230-a5e1-4a42-b7d9-8fb776124e43',
                  'sizes': [[728, 90]],
                  'bidRequestsCount': 1,
                  'params': {
                    'publisherId': '1234_abcd'
                  },
                  'mediaTypes': {
                    'banner': {
                      'sizes': [[728, 90]]
                    }
                  },
                  'crumbs': {
                    'pubcid': '8b640d4e-1f6d-4fd3-b63f-2570572d8100'
                  },
                  'bidId': '28b09d0543d672',
                  'adUnitCode': 'div-gpt-ad-1460505748561-0',
                  'transactionId': 'd909c39c-ecc9-41a4-897c-2d2fdfdf41b2',
                  'src': 'client',
                  'bidder': 'eywamedia',
                  'bidderRequestId': '14d8cbc769114b'
                }
              ]
          }
      };
      bidResponses = [
        {
          'ad': '<a href="https://adtarbostg.eywamedia.com/click/2/4/prebidjs?adpl=site&ip=&locn=&ssp=eywamedia&id=28b09d0543d671&exch=prebidjs&c=&ma=&d=&g=&la=lat&lo=lon&mo=&camp=2&l=&p=prebidjs%3A1234_abcd&u=bc6ca9f9-da6e-39b6-e325-c70ce023a62d&y=" target="_blank"><img width="300" height="250" src="https://adtarbo.s3.ap-south-1.amazonaws.com/prebidjs/300x250.jpg"/><img width="1" height="1" src=https://adtarbostg.eywamedia.com/win/prebidjs/1.000000/2/4/${AUCTION_PRICE}?adpl=site&ip=&locn=&ssp=eywamedia&id=28b09d0543d671&exch=prebidjs&c=&ma=&d=&g=&la=lat&lo=lon&mo=&camp=2&l=&p=prebidjs%3A1234_abcd&u=bc6ca9f9-da6e-39b6-e325-c70ce023a62d&y= style="display:none;"/></a>',
          'bidderCode': 'eywamedia',
          'cpm': 1,
          'creativeId': '28b09d0543d671',
          'currency': 'USD',
          'height': 250,
          'mediaType': 'banner',
          'netRevenue': true,
          'requestId': '28b09d0543d671',
          'transactionId': 'd909c39c-ecc9-41a4-897c-2d2fdfdf41b1',
          'ttl': 360,
          'width': 300
        },
        {
          'ad': '<a href="https://adtarbostg.eywamedia.com/click/4/4/prebidjs?adpl=site&ip=&locn=&ssp=eywamedia&id=28b09d0543d672&exch=prebidjs&c=&ma=&d=&g=&la=lat&lo=lon&mo=&camp=2&l=&p=prebidjs%3A1234_abcd&u=bc6ca9f9-da6e-39b6-e325-c70ce023a62d&y=" target="_blank"><img width="728" height="90" src="https://adtarbo.s3.ap-south-1.amazonaws.com/prebidjs/728x90.jpg"/><img width="1" height="1" src=https://adtarbostg.eywamedia.com/win/prebidjs/1.000000/4/4/${AUCTION_PRICE}?adpl=site&ip=&locn=&ssp=eywamedia&id=28b09d0543d672&exch=prebidjs&c=&ma=&d=&g=&la=lat&lo=lon&mo=&camp=2&l=&p=prebidjs%3A1234_abcd&u=bc6ca9f9-da6e-39b6-e325-c70ce023a62d&y= style="display:none;"/></a>',
          'bidderCode': 'eywamedia',
          'cpm': 1,
          'creativeId': '28b09d0543d672',
          'currency': 'USD',
          'height': 90,
          'mediaType': 'banner',
          'netRevenue': true,
          'requestId': '28b09d0543d672',
          'transactionId': 'd909c39c-ecc9-41a4-897c-2d2fdfdf41b2',
          'ttl': 360,
          'width': 728
        }
      ]
    });

    it('should respond with empty response when there is empty serverResponse', function () {
      let result = spec.interpretResponse({ body: {} }, bidRequest);
      assert.deepEqual(result, []);
    });

    it('should respond with multile response when there is multiple serverResponse', function () {
      let result = spec.interpretResponse(serverResponse, bidRequest);
      assert.deepEqual(result, bidResponses);
    });
  });
});
