import { expect } from 'chai';
import { spec } from 'modules/dailyhuntBidAdapter.js';

const PROD_PREBID_ENDPOINT_URL = 'https://pbs.dailyhunt.in/openrtb2/auction?partner=dailyhunt';
const PROD_PREBID_TEST_ENDPOINT_URL = 'https://qa-pbs-van.dailyhunt.in/openrtb2/auction?partner=dailyhunt';

const _encodeURIComponent = function (a) {
  if (!a) { return }
  let b = window.encodeURIComponent(a);
  b = b.replace(/'/g, '%27');
  return b;
}

describe('DailyhuntAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'dailyhunt',
      'params': {
        placement_id: 1,
        publisher_id: 1,
        partner_name: 'dailyhunt'
      }
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });
  describe('buildRequests', function() {
    let bidRequests = [
      {
        bidder: 'dailyhunt',
        params: {
          placement_id: 1,
          publisher_id: 1,
          partner_name: 'dailyhunt',
          bidfloor: 0.1,
          device: {
            ip: '47.9.247.217'
          },
          site: {
            cat: ['1', '2', '3']
          }
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 50]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        transactionId: '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }
    ];
    let nativeBidRequests = [
      {
        bidder: 'dailyhunt',
        params: {
          placement_id: 1,
          publisher_id: 1,
          partner_name: 'dailyhunt',
        },
        nativeParams: {
          title: {
            required: true,
            len: 80
          },
          image: {
            required: true,
            sizes: [150, 50]
          },
        },
        mediaTypes: {
          native: {
            title: {
              required: true
            },
          }
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250], [300, 50]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        transactionId: '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }
    ];
    let videoBidRequests = [
      {
        bidder: 'dailyhunt',
        params: {
          placement_id: 1,
          publisher_id: 1,
          partner_name: 'dailyhunt'
        },
        nativeParams: {
          video: {
            context: 'instream'
          }
        },
        mediaTypes: {
          video: {
            context: 'instream'
          }
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250], [300, 50]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        transactionId: '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }
    ];
    let bidderRequest = {
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'bidderCode': 'dailyhunt',
      'bids': [
        {
          ...bidRequests[0]
        }
      ],
      'refererInfo': {
        'referer': 'http://m.dailyhunt.in/'
      }
    };
    let nativeBidderRequest = {
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'bidderCode': 'dailyhunt',
      'bids': [
        {
          ...nativeBidRequests[0]
        }
      ],
      'refererInfo': {
        'referer': 'http://m.dailyhunt.in/'
      }
    };
    let videoBidderRequest = {
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'bidderCode': 'dailyhunt',
      'bids': [
        {
          ...videoBidRequests[0]
        }
      ],
      'refererInfo': {
        'referer': 'http://m.dailyhunt.in/'
      }
    };

    it('sends display bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.url).to.equal(PROD_PREBID_ENDPOINT_URL);
      expect(request.method).to.equal('POST');
    });

    it('sends native bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(nativeBidRequests, nativeBidderRequest)[0];
      expect(request.url).to.equal(PROD_PREBID_ENDPOINT_URL);
      expect(request.method).to.equal('POST');
    });

    it('sends video bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(videoBidRequests, videoBidderRequest)[0];
      expect(request.url).to.equal(PROD_PREBID_ENDPOINT_URL);
      expect(request.method).to.equal('POST');
    });
  });
  describe('interpretResponse', function () {
    let bidResponses = {
      id: 'da32def7-6779-403c-ada7-0b201dbc9744',
      seatbid: [
        {
          bid: [
            {
              id: 'id1',
              impid: 'banner-impid',
              price: 1.4,
              adm: 'adm',
              adid: '66658',
              crid: 'asd5ddbf014cac993.66466212',
              dealid: 'asd5ddbf014cac993.66466212',
              w: 300,
              h: 250,
              nurl: 'winUrl',
              ext: {
                prebid: {
                  type: 'banner'
                }
              }
            },
            {
              id: '5caccc1f-94a6-4230-a1f9-6186ee65da99',
              impid: 'video-impid',
              price: 1.4,
              nurl: 'winUrl',
              adm: 'adm',
              adid: '980',
              crid: '2394',
              w: 300,
              h: 250,
              ext: {
                prebid: {
                  'type': 'video'
                },
                bidder: {
                  cacheKey: 'cache_key',
                  vastUrl: 'vastUrl'
                }
              }
            },
            {
              id: '74973faf-cce7-4eff-abd0-b59b8e91ca87',
              impid: 'native-impid',
              price: 50,
              nurl: 'winUrl',
              adm: '{"native":{"link":{"url":"url","clicktrackers":[]},"assets":[{"id":1,"required":1,"img":{},"video":{},"data":{},"title":{"text":"TITLE"},"link":{}},{"id":1,"required":1,"img":{},"video":{},"data":{"type":2,"value":"Lorem Ipsum Lorem Ipsum Lorem Ipsum."},"title":{},"link":{}},{"id":1,"required":1,"img":{},"video":{},"data":{"type":12,"value":"Install Here"},"title":{},"link":{}},{"id":1,"required":1,"img":{"type":3,"url":"urk","w":990,"h":505},"video":{},"data":{},"title":{},"link":{}}],"imptrackers":[]}}',
              adid: '968',
              crid: '2370',
              w: 300,
              h: 250,
              ext: {
                prebid: {
                  type: 'native'
                },
                bidder: null
              }
            },
            {
              id: '5caccc1f-94a6-4230-a1f9-6186ee65da99',
              impid: 'video-outstream-impid',
              price: 1.4,
              nurl: 'winUrl',
              adm: 'adm',
              adid: '980',
              crid: '2394',
              w: 300,
              h: 250,
              ext: {
                prebid: {
                  'type': 'video'
                },
                bidder: {
                  cacheKey: 'cache_key',
                  vastUrl: 'vastUrl'
                }
              }
            },
          ],
          seat: 'dailyhunt'
        }
      ],
      ext: {
        responsetimemillis: {
          dailyhunt: 119
        }
      }
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          requestId: '1',
          cpm: 1.4,
          creativeId: 'asd5ddbf014cac993.66466212',
          width: 300,
          height: 250,
          ttl: 360,
          netRevenue: true,
          currency: 'USD',
          ad: 'adm',
          mediaType: 'banner',
          winUrl: 'winUrl'
        },
        {
          requestId: '2',
          cpm: 1.4,
          creativeId: '2394',
          width: 300,
          height: 250,
          ttl: 360,
          netRevenue: true,
          currency: 'USD',
          mediaType: 'video',
          winUrl: 'winUrl',
          videoCacheKey: 'cache_key',
          vastUrl: 'vastUrl',
        },
        {
          requestId: '3',
          cpm: 1.4,
          creativeId: '2370',
          width: 300,
          height: 250,
          ttl: 360,
          netRevenue: true,
          currency: 'USD',
          mediaType: 'native',
          winUrl: 'winUrl',
          native: {
            clickUrl: 'https%3A%2F%2Fmontu1996.github.io%2F',
            clickTrackers: [],
            impressionTrackers: [],
            javascriptTrackers: [],
            title: 'TITLE',
            body: 'Lorem Ipsum Lorem Ipsum Lorem Ipsum.',
            cta: 'Install Here',
            image: {
              url: 'url',
              height: 505,
              width: 990
            }
          }
        },
        {
          requestId: '4',
          cpm: 1.4,
          creativeId: '2394',
          width: 300,
          height: 250,
          ttl: 360,
          netRevenue: true,
          currency: 'USD',
          mediaType: 'video',
          winUrl: 'winUrl',
          vastXml: 'adm',
        },
      ];
      let bidderRequest = {
        bids: [
          {
            bidId: 'banner-impid',
            adUnitCode: 'code1',
            requestId: '1'
          },
          {
            bidId: 'video-impid',
            adUnitCode: 'code2',
            requestId: '2',
            mediaTypes: {
              video: {
                context: 'instream'
              }
            }
          },
          {
            bidId: 'native-impid',
            adUnitCode: 'code3',
            requestId: '3'
          },
          {
            bidId: 'video-outstream-impid',
            adUnitCode: 'code4',
            requestId: '4',
            mediaTypes: {
              video: {
                context: 'outstream'
              }
            }
          },
        ]
      }
      let result = spec.interpretResponse({ body: bidResponses }, bidderRequest);
      result.forEach((r, i) => {
        expect(Object.keys(r)).to.have.members(Object.keys(expectedResponse[i]));
      });
    });
  })
  describe('onBidWon', function () {
    it('should hit win url when bid won', function () {
      let bid = {
        requestId: '1',
        cpm: 1.4,
        creativeId: 'asd5ddbf014cac993.66466212',
        width: 300,
        height: 250,
        ttl: 360,
        netRevenue: true,
        currency: 'USD',
        ad: 'adm',
        mediaType: 'banner',
        winUrl: 'winUrl'
      };
      expect(spec.onBidWon(bid)).to.equal(undefined);
    });
  })
})
