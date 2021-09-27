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
      }
    ];

    const bidderRequest = {
      refererInfo: {
        referer: 'https://hoge.com'
      }
    };

    it('sends bid request to ENDPOINT via GET', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].data).to.equal('asi=123456&skt=5&prebid_id=30b31c1838de1e&prebid_ver=$prebid.version$&page_url=https%3A%2F%2Fhoge.com&');
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
        referer: 'https://hoge.com'
      }
    };

    it('sends bid request to ENDPOINT via GET', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].data).to.equal('asi=123456&skt=5&prebid_id=30b31c1838de1e&prebid_ver=$prebid.version$&page_url=https%3A%2F%2Fhoge.com&eids=%7B%22eids%22%3A%5B%7B%22source%22%3A%22pubcid.org%22%2C%22uids%22%3A%5B%7B%22id%22%3A%22some-random-id-value%22%2C%22atype%22%3A1%7D%5D%7D%5D%7D&');
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

    it('handles video responses', function () {
      let response = {
        'is_ad_return': true,
        'ad': {
          'ad_type': 3,
          'prebid_id': '51ef8751f9aead',
          'price': 12.34,
          'currency': 'JPY',
          'creative_id': '123abc',
          'video': {
            'w': 300,
            'h': 250,
            'vtag': '<VAST></VAST>',
            'purl': 'https://cdn/player',
            'progress': true,
            'loop': false,
            'inread': false,
            'adomain': [
              'www.example.com'
            ]
          }
        },
        'syncs': [
          'https://example.com'
        ]
      };

      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result[0]).to.have.property('vastXml');
      expect(result[0]).to.have.property('renderer');
      expect(result[0]).to.have.property('mediaType', 'video');
    });

    it('handles native response', function () {
      let response = {
        'is_ad_return': true,
        'ad': {
          'ad_type': 2,
          'prebid_id': '51ef8751f9aead',
          'price': 12.34,
          'currency': 'JPY',
          'creative_id': '123abc',
          'native': {
            'template_and_ads': {
              'head': '',
              'body_wrapper': '',
              'body': '',
              'ads': [
                {
                  'ad_format_id': 10,
                  'assets': {
                    'ad_spot_id': '123abc',
                    'index': 0,
                    'adchoice_url': 'https://aja-kk.co.jp/optout',
                    'cta_text': 'cta',
                    'img_icon': 'https://example.com/img_icon',
                    'img_icon_width': '50',
                    'img_icon_height': '50',
                    'img_main': 'https://example.com/img_main',
                    'img_main_width': '200',
                    'img_main_height': '100',
                    'lp_link': 'https://example.com/lp?k=v',
                    'sponsor': 'sponsor',
                    'title': 'ad_title',
                    'description': 'ad_desc'
                  },
                  'imps': [
                    'https://example.com/imp'
                  ],
                  'inviews': [
                    'https://example.com/inview'
                  ],
                  'jstracker': '',
                  'disable_trimming': false,
                  'adomain': [
                    'www.example.com'
                  ]
                }
              ]
            }
          }
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
          'mediaType': 'native',
          'currency': 'JPY',
          'ttl': 300,
          'netRevenue': true,
          'native': {
            'title': 'ad_title',
            'body': 'ad_desc',
            'cta': 'cta',
            'sponsoredBy': 'sponsor',
            'image': {
              'url': 'https://example.com/img_main',
              'width': 200,
              'height': 100
            },
            'icon': {
              'url': 'https://example.com/img_icon',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://example.com/lp?k=v',
            'impressionTrackers': [
              'https://example.com/imp'
            ],
            'privacyLink': 'https://aja-kk.co.jp/optout'
          },
          'meta': {
            'advertiserDomains': [
              'www.example.com'
            ]
          }
        }
      ];

      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest})
      expect(result).to.deep.equal(expectedResponse)
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
