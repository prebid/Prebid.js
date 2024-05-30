import { spec } from 'modules/ajaBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const ENDPOINT = 'https://ad.as.amanad.adtdp.com/v2/prebid';

describe('AjaAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'aja',
      'params': {
        'asi': '123456'
      },
      'adUnitCode': 'adunit',
      'sizes': [[300, 250]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'asi': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        bidder: 'aja',
        params: {
          asi: '123456'
        },
        adUnitCode: 'adunit',
        sizes: [[300, 250]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        ortb2: {
          device: {
            sua: {
              source: 2,
              platform: {
                brand: 'Android',
                version: ['8', '0', '0']
              },
              browsers: [
                {brand: 'Not_A Brand', version: ['99', '0', '0', '0']},
                {brand: 'Google Chrome', version: ['109', '0', '5414', '119']},
                {brand: 'Chromium', version: ['109', '0', '5414', '119']}
              ],
              mobile: 1,
              model: 'SM-G955U',
              bitness: '64',
              architecture: ''
            },
            ext: {
              cdep: 'example_label_1'
            }
          }
        },
        ortb2Imp: {
          ext: {
            tid: 'cea1eb09-d970-48dc-8585-634d3a7b0544',
            gpid: '/1111/homepage#300x250'
          }
        },
        schain: {
          ver: '1.0',
          complete: 1,
          nodes: [
            {
              asi: 'exchange1.com',
              sid: '1234',
              hp: 1,
              rid: 'bid-request-1',
              name: 'publisher',
              domain: 'publisher.com'
            },
            {
              asi: 'exchange2.com',
              sid: 'abcd',
              hp: 1,
              rid: 'bid-request-2',
              name: 'intermediary',
              domain: 'intermediary.com'
            }
          ]
        },
      }
    ];
    const serializedSchain = encodeURIComponent('1.0,1!exchange1.com,1234,1,bid-request-1,publisher,publisher.com!exchange2.com,abcd,1,bid-request-2,intermediary,intermediary.com')

    const bidderRequest = {
      refererInfo: {
        page: 'https://hoge.com'
      }
    };

    it('sends bid request to ENDPOINT via GET', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].data).to.equal(`asi=123456&skt=5&gpid=%2F1111%2Fhomepage%23300x250&tid=cea1eb09-d970-48dc-8585-634d3a7b0544&cdep=example_label_1&prebid_id=30b31c1838de1e&prebid_ver=$prebid.version$&page_url=https%3A%2F%2Fhoge.com&schain=${serializedSchain}&ad_format_ids=2&sua=%7B%22source%22%3A2%2C%22platform%22%3A%7B%22brand%22%3A%22Android%22%2C%22version%22%3A%5B%228%22%2C%220%22%2C%220%22%5D%7D%2C%22browsers%22%3A%5B%7B%22brand%22%3A%22Not_A%20Brand%22%2C%22version%22%3A%5B%2299%22%2C%220%22%2C%220%22%2C%220%22%5D%7D%2C%7B%22brand%22%3A%22Google%20Chrome%22%2C%22version%22%3A%5B%22109%22%2C%220%22%2C%225414%22%2C%22119%22%5D%7D%2C%7B%22brand%22%3A%22Chromium%22%2C%22version%22%3A%5B%22109%22%2C%220%22%2C%225414%22%2C%22119%22%5D%7D%5D%2C%22mobile%22%3A1%2C%22model%22%3A%22SM-G955U%22%2C%22bitness%22%3A%2264%22%2C%22architecture%22%3A%22%22%7D&`);
    });
  });

  describe('buildRequests with UserModule', function () {
    const bidRequests = [
      {
        bidder: 'aja',
        params: {
          asi: '123456'
        },
        adUnitCode: 'adunit',
        sizes: [[300, 250]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        userIdAsEids: [
          {
            source: 'pubcid.org',
            uids: [{
              id: 'some-random-id-value',
              atype: 1
            }]
          }
        ]
      }
    ];

    const bidderRequest = {
      refererInfo: {
        page: 'https://hoge.com'
      }
    };

    it('sends bid request to ENDPOINT via GET', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].data).to.equal('asi=123456&skt=5&prebid_id=30b31c1838de1e&prebid_ver=$prebid.version$&page_url=https%3A%2F%2Fhoge.com&ad_format_ids=2&eids=%7B%22eids%22%3A%5B%7B%22source%22%3A%22pubcid.org%22%2C%22uids%22%3A%5B%7B%22id%22%3A%22some-random-id-value%22%2C%22atype%22%3A1%7D%5D%7D%5D%7D&');
    });
  });

  describe('interpretResponse', function () {
    it('should get correct banner bid response', function () {
      let response = {
        'is_ad_return': true,
        'ad': {
          'ad_type': 1,
          'prebid_id': '51ef8751f9aead',
          'price': 12.34,
          'currency': 'USD',
          'creative_id': '123abc',
          'banner': {
            'w': 300,
            'h': 250,
            'tag': '<div></div>',
            'imps': [
              'https://as.amanad.adtdp.com/v1/imp'
            ],
            'adomain': [
              'www.example.com'
            ]
          },
        },
        'syncs': [
          'https://example.com'
        ]
      };

      let expectedResponse = [
        {
          'requestId': '51ef8751f9aead',
          'cpm': 12.34,
          'creativeId': '123abc',
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div></div>',
          'mediaType': 'banner',
          'currency': 'USD',
          'ttl': 300,
          'netRevenue': true,
          'meta': {
            'advertiserDomains': [
              'www.example.com'
            ]
          }
        }
      ];

      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      let response = {
        'is_ad_return': false,
        'ad': {}
      };

      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse1 = {
      body: {
        'is_ad_return': true,
        'ad': { /* ad body */ },
        'syncs': [
          'https://example.test/pixel/1'
        ],
        'sync_htmls': [
          'https://example.test/iframe/1'
        ]
      }
    };

    const bidResponse2 = {
      body: {
        'is_ad_return': true,
        'ad': { /* ad body */ },
        'syncs': [
          'https://example.test/pixel/2'
        ]
      }
    };

    it('should use a sync url from first response (pixel and iframe)', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, [bidResponse1, bidResponse2]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://example.test/pixel/1'
        },
        {
          type: 'iframe',
          url: 'https://example.test/iframe/1'
        }
      ]);
    });

    it('handle empty response (e.g. timeout)', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, []);
      expect(syncs).to.deep.equal([]);
    });

    it('returns empty syncs when not pixel enabled and not iframe enabled', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: false, iframeEnabled: false }, [bidResponse1]);
      expect(syncs).to.deep.equal([]);
    });

    it('returns pixel syncs when pixel enabled and not iframe enabled', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: false }, [bidResponse1]);
      expect(syncs).to.deep.equal([
        {
          type: 'image',
          url: 'https://example.test/pixel/1'
        }
      ]);
    });

    it('returns iframe syncs when not pixel enabled and iframe enabled', function() {
      const syncs = spec.getUserSyncs({ pixelEnabled: false, iframeEnabled: true }, [bidResponse1]);
      expect(syncs).to.deep.equal([
        {
          type: 'iframe',
          url: 'https://example.test/iframe/1'
        }
      ]);
    });
  });
});
