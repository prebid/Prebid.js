import { expect } from 'chai'
import { spec, validateGeoObject, getDomain } from '../../../modules/apacdexBidAdapter.js'
import { newBidder } from 'src/adapters/bidderFactory.js'
import { userSync } from '../../../src/userSync.js';
import { config } from 'src/config.js';
import { deepClone } from 'src/utils.js';

describe('ApacdexBidAdapter', function () {
  const adapter = newBidder(spec)

  describe('.code', function () {
    it('should return a bidder code of apacdex', function () {
      expect(spec.code).to.equal('apacdex')
    })
  })

  describe('inherited functions', function () {
    it('should exist and be a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('.isBidRequestValid', function () {
    it('should return false if there are no params', () => {
      const bid = {
        'bidder': 'apacdex',
        'adUnitCode': 'adunit-code',
        'mediaTypes': {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if there is no siteId or placementId param', () => {
      const bid = {
        'bidder': 'apacdex',
        'adUnitCode': 'adunit-code',
        params: {
          site_id: '1a2b3c4d5e6f1a2b3c4d',
          placement_id: 'plcm12345678',
        },
        'mediaTypes': {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if there is no mediaTypes', () => {
      const bid = {
        'bidder': 'apacdex',
        'adUnitCode': 'adunit-code',
        params: {
          siteId: '1a2b3c4d5e6f1a2b3c4d'
        },
        'mediaTypes': {
        },
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true if the bid is valid', () => {
      const bid = {
        'bidder': 'apacdex',
        'adUnitCode': 'adunit-code',
        params: {
          siteId: '1a2b3c4d5e6f1a2b3c4d'
        },
        'mediaTypes': {
          banner: {
            sizes: [[300, 250], [300, 600]]
          }
        },
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    describe('banner', () => {
      it('should return false if there are no banner sizes', () => {
        const bid = {
          'bidder': 'apacdex',
          'adUnitCode': 'adunit-code',
          params: {
            siteId: '1a2b3c4d5e6f1a2b3c4d'
          },
          'mediaTypes': {
            banner: {

            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true if there is banner sizes', () => {
        const bid = {
          'bidder': 'apacdex',
          'adUnitCode': 'adunit-code',
          params: {
            siteId: '1a2b3c4d5e6f1a2b3c4d'
          },
          'mediaTypes': {
            banner: {
              sizes: [[300, 250], [300, 600]]
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });

    describe('video', () => {
      it('should return false if there is no playerSize defined in the video mediaType', () => {
        const bid = {
          'bidder': 'apacdex',
          'adUnitCode': 'adunit-code',
          params: {
            siteId: '1a2b3c4d5e6f1a2b3c4d',
            sizes: [[300, 250], [300, 600]]
          },
          'mediaTypes': {
            video: {
              context: 'instream'
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true if there is playerSize defined on the video mediaType', () => {
        const bid = {
          'bidder': 'apacdex',
          'adUnitCode': 'adunit-code',
          params: {
            siteId: '1a2b3c4d5e6f1a2b3c4d',
          },
          'mediaTypes': {
            video: {
              context: 'instream',
              playerSize: [[640, 480]]
            }
          },
          'bidId': '30b31c1838de1e',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        };
        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });
    });
  });

  describe('.buildRequests', function () {
    beforeEach(function () {
      sinon.stub(userSync, 'canBidderRegisterSync');
    });
    afterEach(function () {
      userSync.canBidderRegisterSync.restore();
    });
    let bidRequest = [{
      'schain': {
        'ver': '1.0',
        'complete': 1,
        'nodes': [
          {
            'asi': 'indirectseller.com',
            'sid': '00001',
            'hp': 1
          },
          {
            'asi': 'indirectseller-2.com',
            'sid': '00002',
            'hp': 0
          },
        ]
      },
      'bidder': 'apacdex',
      'params': {
        'siteId': '1a2b3c4d5e6f1a2b3c4d',
        'geo': { 'lat': 123.13123456, 'lon': 54.23467311, 'accuracy': 60 }
      },
      'adUnitCode': 'adunit-code-1',
      'sizes': [[300, 250], [300, 600]],
      'targetKey': 0,
      'bidId': '30b31c1838de1f',
      'userIdAsEids': [{
        'source': 'criteo.com',
        'uids': [{
          'id': 'p0cCLF9JazY1ZUFjazJRb3NKbEprVTcwZ0IwRUlGalBjOG9laUZNbFJ0ZGpOSnVFbE9VMjBNMzNBTzladGt4cUVGQzBybDY2Y1FqT1dkUkFsMmJIWDRHNjlvNXJjbiUyQlZDd1dOTmt6VlV2TDhRd0F0RTlBcmpyZU5WRHBPU25GQXpyMnlT',
          'atype': 1
        }]
      }, {
        'source': 'pubcid.org',
        'uids': [{
          'id': '2ae366c2-2576-45e5-bd21-72ed10598f17',
          'atype': 1
        }]
      }],
    },
    {
      'bidder': 'apacdex',
      'params': {
        'ad_unit': '/7780971/sparks_prebid_LB',
        'sizes': [[300, 250], [300, 600]],
        'referrer': 'overrides_top_window_location'
      },
      'adUnitCode': 'adunit-code-2',
      'sizes': [[120, 600], [300, 600], [160, 600]],
      'targetKey': 1,
      'bidId': '30b31c1838de1e',
    }];

    let bidderRequests = {
      'gdprConsent': {
        'consentString': 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        'vendorData': {},
        'gdprApplies': true
      },
      'refererInfo': {
        'numIframes': 0,
        'reachedTop': true,
        'referer': 'https://example.com',
        'stack': ['https://example.com']
      },
      uspConsent: 'someCCPAString'
    };

    it('should return a properly formatted request', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://useast.quantumdex.io/auction/pbjs')
      expect(bidRequests.method).to.equal('POST')
      expect(bidRequests.bidderRequests).to.eql(bidRequest);
    })

    it('should return a properly formatted request with GDPR applies set to true', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://useast.quantumdex.io/auction/pbjs')
      expect(bidRequests.method).to.equal('POST')
      expect(bidRequests.data.gdpr.gdprApplies).to.equal(true)
      expect(bidRequests.data.gdpr.consentString).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==')
    })

    it('should return a properly formatted request with GDPR applies set to false', function () {
      bidderRequests.gdprConsent.gdprApplies = false;
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://useast.quantumdex.io/auction/pbjs')
      expect(bidRequests.method).to.equal('POST')
      expect(bidRequests.data.gdpr.gdprApplies).to.equal(false)
      expect(bidRequests.data.gdpr.consentString).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==')
    })
    it('should return a properly formatted request with GDPR applies set to false with no consent_string param', function () {
      let bidderRequests = {
        'gdprConsent': {
          'consentString': undefined,
          'vendorData': {},
          'gdprApplies': false
        },
        'refererInfo': {
          'numIframes': 0,
          'reachedTop': true,
          'referer': 'https://example.com',
          'stack': ['https://example.com']
        }
      };
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://useast.quantumdex.io/auction/pbjs')
      expect(bidRequests.method).to.equal('POST')
      expect(bidRequests.data.gdpr.gdprApplies).to.equal(false)
      expect(bidRequests.data.gdpr).to.not.include.keys('consentString')
    })
    it('should return a properly formatted request with GDPR applies set to true with no consentString param', function () {
      let bidderRequests = {
        'gdprConsent': {
          'consentString': undefined,
          'vendorData': {},
          'gdprApplies': true
        },
        'refererInfo': {
          'numIframes': 0,
          'reachedTop': true,
          'referer': 'https://example.com',
          'stack': ['https://example.com']
        }
      };
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests)
      expect(bidRequests.url).to.equal('https://useast.quantumdex.io/auction/pbjs')
      expect(bidRequests.method).to.equal('POST')
      expect(bidRequests.data.gdpr.gdprApplies).to.equal(true)
      expect(bidRequests.data.gdpr).to.not.include.keys('consentString')
    })
    it('should return a properly formatted request with schain defined', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.data.schain).to.deep.equal(bidRequest[0].schain)
    });
    it('should return a properly formatted request with eids defined', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.data.eids).to.deep.equal(bidRequest[0].userIdAsEids)
    });
    it('should return a properly formatted request with geo defined', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.data.geo).to.deep.equal(bidRequest[0].params.geo)
    });
    it('should return a properly formatted request with us_privacy included', function () {
      const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
      expect(bidRequests.data.us_privacy).to.equal('someCCPAString');
    });
    it('should attach bidFloor param when either bid param floorPrice or getFloor function exists', function () {
      let getFloorResponse = { currency: 'USD', floor: 3 };
      let singleBidRequest, request, payload = null;

      // 1 -> floorPrice not defined, getFloor not defined > empty
      singleBidRequest = deepClone(bidRequest[0]);
      request = spec.buildRequests([singleBidRequest], bidderRequests);
      payload = request.data;
      expect(payload.bids[0].bidFloor).to.not.exist;

      // 2 -> floorPrice is defined, getFloor not defined > floorPrice is used
      singleBidRequest = deepClone(bidRequest[0]);
      singleBidRequest.params = {
        'siteId': '1890909',
        'floorPrice': 0.5
      };
      request = spec.buildRequests([singleBidRequest], bidderRequests);
      payload = request.data
      expect(payload.bids[0].bidFloor).to.exist.and.to.equal(0.5);

      // 3 -> floorPrice is defined, getFloor is defined > getFloor is used
      singleBidRequest = deepClone(bidRequest[0]);
      singleBidRequest.params = {
        'siteId': '1890909',
        'floorPrice': 0.5
      };
      singleBidRequest.getFloor = () => getFloorResponse;
      request = spec.buildRequests([singleBidRequest], bidderRequests);
      payload = request.data
      expect(payload.bids[0].bidFloor).to.exist.and.to.equal(3);

      // 4 -> floorPrice not defined, getFloor is defined > getFloor is used
      singleBidRequest = deepClone(bidRequest[0]);
      singleBidRequest.getFloor = () => getFloorResponse;
      request = spec.buildRequests([singleBidRequest], bidderRequests);
      payload = request.data
      expect(payload.bids[0].bidFloor).to.exist.and.to.equal(3);
    });
    describe('debug test', function () {
      beforeEach(function () {
        config.setConfig({ debug: true });
      });
      afterEach(function () {
        config.setConfig({ debug: false });
      });
      it('should return a properly formatted request with pbjs_debug is true', function () {
        const bidRequests = spec.buildRequests(bidRequest, bidderRequests);
        expect(bidRequests.data.test).to.equal(1);
      });
    });
  });

  describe('.interpretResponse', function () {
    const bidRequests = {
      'method': 'POST',
      'url': 'https://useast.quantumdex.io/auction/pbjs',
      'withCredentials': true,
      'data': {
        'device': {
          'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
          'height': 937,
          'width': 1920,
          'dnt': 0,
          'language': 'vi'
        },
        'site': {
          'id': '343',
          'page': 'https://www.example.com/page',
          'referrer': '',
          'hostname': 'www.example.com'
        }
      },
      'bidderRequests': [
        {
          'bidder': 'apacdex',
          'params': {
            'siteId': '343'
          },
          'crumbs': {
            'pubcid': 'c2b2ba08-9954-4850-8ee5-2bf4a2b35eff'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[160, 600], [120, 600]]
            }
          },
          'adUnitCode': 'vi_3431035_1',
          'transactionId': '994d8404-4a28-4c43-98d8-a38dbb061910',
          'sizes': [[160, 600], [120, 600]],
          'bidId': '3000aa31c41a29c21',
          'bidderRequestId': '299926b3d3628cdd7',
          'auctionId': '22445943-a0aa-4c63-a413-4deb64fcff1c',
          'src': 'client',
          'bidRequestsCount': 41,
          'bidderRequestsCount': 41,
          'bidderWinsCount': 0,
          'schain': {
            'ver': '1.0',
            'complete': 1,
            'nodes': [
              {
                'asi': 'freegames66.com',
                'sid': '343',
                'hp': 1
              }
            ]
          }
        },
        {
          'bidder': 'apacdex',
          'params': {
            'siteId': '343'
          },
          'crumbs': {
            'pubcid': 'c2b2ba08-9954-4850-8ee5-2bf4a2b35eff'
          },
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 250], [250, 250], [200, 200], [180, 150]]
            }
          },
          'adUnitCode': 'vi_3431033_1',
          'transactionId': '800fe87e-bfec-43a5-ace0-c4e2373ff4b5',
          'sizes': [[300, 250], [250, 250], [200, 200], [180, 150]],
          'bidId': '30024615be22ef66a',
          'bidderRequestId': '299926b3d3628cdd7',
          'auctionId': '22445943-a0aa-4c63-a413-4deb64fcff1c',
          'src': 'client',
          'bidRequestsCount': 41,
          'bidderRequestsCount': 41,
          'bidderWinsCount': 0,
          'schain': {
            'ver': '1.0',
            'complete': 1,
            'nodes': [
              {
                'asi': 'freegames66.com',
                'sid': '343',
                'hp': 1
              }
            ]
          }
        },
        {
          'bidder': 'apacdex',
          'params': {
            'siteId': '343'
          },
          'crumbs': {
            'pubcid': 'c2b2ba08-9954-4850-8ee5-2bf4a2b35eff'
          },
          'mediaTypes': {
            'video': {
              'playerSize': [[640, 480]],
              'context': 'instream',
              'mimes': [
                'video/mp4',
                'video/x-flv',
                'video/x-ms-wmv',
                'application/vnd.apple.mpegurl',
                'application/x-mpegurl',
                'video/3gpp',
                'video/mpeg',
                'video/ogg',
                'video/quicktime',
                'video/webm',
                'video/x-m4v',
                'video/ms-asf',
                'video/x-msvideo'
              ],
              'protocols': [1, 2, 3, 4, 5, 6],
              'playbackmethod': [6],
              'maxduration': 120,
              'linearity': 1,
              'api': [2]
            }
          },
          'adUnitCode': 'vi_3431909',
          'transactionId': '33d83d87-43cc-499b-aabe-5c22eb6acfbb',
          'sizes': [[640, 480]],
          'bidId': '1854b40107d6745c',
          'bidderRequestId': '1840763b6bda185d',
          'auctionId': 'df495de0-5d42-471f-a501-73bcd7254b80',
          'src': 'client',
          'bidRequestsCount': 1,
          'bidderRequestsCount': 1,
          'bidderWinsCount': 0,
          'schain': {
            'ver': '1.0',
            'complete': 1,
            'nodes': [
              {
                'asi': 'freegames66.com',
                'sid': '343',
                'hp': 1
              }
            ]
          }
        }
      ]
    };

    let serverResponse = {
      'body': {
        'bids': [
          {
            'requestId': '3000aa31c41a29c21',
            'cpm': 1.07,
            'width': 160,
            'height': 600,
            'ad': `<div>Apacdex AD</div>`,
            'ttl': 500,
            'creativeId': '1234abcd',
            'netRevenue': true,
            'currency': 'USD',
            'dealId': 'apacdex',
            'mediaType': 'banner',
            'meta': {
              'advertiserDomains': ['https://example.com']
            }
          },
          {
            'requestId': '30024615be22ef66a',
            'cpm': 1,
            'width': 300,
            'height': 250,
            'ad': `<div>Apacdex AD</div>`,
            'ttl': 500,
            'creativeId': '1234abcd',
            'netRevenue': true,
            'currency': 'USD',
            'dealId': 'apacdex',
            'mediaType': 'banner',
            'meta': {
              'advertiserDomains': ['https://example.com']
            }
          },
          {
            'requestId': '1854b40107d6745c',
            'cpm': 1.25,
            'width': 300,
            'height': 250,
            'vastXml': '<VAST><Ad id="20001"><InLine><AdSystem version="4.0">apacdex</AdSystem></InLine></Ad></VAST>',
            'ttl': 500,
            'creativeId': '30292e432662bd5f86d90774b944b038',
            'netRevenue': true,
            'currency': 'USD',
            'dealId': 'apacdex',
            'mediaType': 'video',
            'meta': {
              'advertiserDomains': ['https://example.com']
            }
          }
        ],
        'pixel': [{
          'url': 'https://example.com/pixel.png',
          'type': 'image'
        }]
      }
    };

    let prebidResponse = [
      {
        'requestId': '3000aa31c41a29c21',
        'cpm': 1.07,
        'width': 160,
        'height': 600,
        'ad': `<div>Apacdex AD</div>`,
        'ttl': 500,
        'creativeId': '1234abcd',
        'netRevenue': true,
        'currency': 'USD',
        'dealId': 'apacdex',
        'mediaType': 'banner'
      },
      {
        'requestId': '30024615be22ef66a',
        'cpm': 1,
        'width': 300,
        'height': 250,
        'ad': `<div>Apacdex AD</div>`,
        'ttl': 500,
        'creativeId': '1234abcd',
        'netRevenue': true,
        'currency': 'USD',
        'dealId': 'apacdex',
        'mediaType': 'banner'
      },
      {
        'requestId': '1854b40107d6745c',
        'cpm': 1.25,
        'width': 300,
        'height': 250,
        'vastXml': '<VAST><Ad id="20001"><InLine><AdSystem version="4.0">apacdex</AdSystem></InLine></Ad></VAST>',
        'ttl': 500,
        'creativeId': '30292e432662bd5f86d90774b944b038',
        'netRevenue': true,
        'currency': 'USD',
        'dealId': 'apacdex',
        'mediaType': 'video'
      }
    ];

    it('should map bidResponse to prebidResponse', function () {
      const response = spec.interpretResponse(serverResponse, bidRequests);
      response.forEach((resp, i) => {
        expect(resp.requestId).to.equal(prebidResponse[i].requestId);
        expect(resp.cpm).to.equal(prebidResponse[i].cpm);
        expect(resp.width).to.equal(prebidResponse[i].width);
        expect(resp.height).to.equal(prebidResponse[i].height);
        expect(resp.ttl).to.equal(prebidResponse[i].ttl);
        expect(resp.creativeId).to.equal(prebidResponse[i].creativeId);
        expect(resp.netRevenue).to.equal(prebidResponse[i].netRevenue);
        expect(resp.currency).to.equal(prebidResponse[i].currency);
        expect(resp.dealId).to.equal(prebidResponse[i].dealId);
        if (resp.mediaType === 'video') {
          expect(resp.vastXml.indexOf('apacdex')).to.be.greaterThan(0);
        }
        if (resp.mediaType === 'banner') {
          expect(resp.ad.indexOf('Apacdex AD')).to.be.greaterThan(0);
        }
        expect(resp.meta.advertiserDomains).to.deep.equal(['https://example.com']);
      });
    });
  });

  describe('.getUserSyncs', function () {
    let bidResponse = [{
      'body': {
        'pixel': [{
          'url': 'https://pixel-test',
          'type': 'image'
        }]
      }
    }];

    it('should return one sync pixel', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, bidResponse)).to.deep.equal([{
        type: 'image',
        url: 'https://pixel-test'
      }]);
    });
    it('should return an empty array when sync is enabled but there are no bidResponses', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, [])).to.have.length(0);
    });

    it('should return an empty array when sync is enabled but no sync pixel returned', function () {
      const pixel = Object.assign({}, bidResponse);
      delete pixel[0].body.pixel;
      expect(spec.getUserSyncs({ pixelEnabled: true }, bidResponse)).to.have.length(0);
    });

    it('should return an empty array', function () {
      expect(spec.getUserSyncs({ pixelEnabled: false }, bidResponse)).to.have.length(0);
      expect(spec.getUserSyncs({ pixelEnabled: true }, [])).to.have.length(0);
    });
  });

  describe('validateGeoObject', function () {
    it('should return true if the geo object is valid', () => {
      let geoObject = {
        lat: 123.5624234,
        lon: 23.6712341,
        accuracy: 20
      };
      expect(validateGeoObject(geoObject)).to.equal(true);
    });

    it('should return false if the geo object is not plain object', () => {
      let geoObject = [{
        lat: 123.5624234,
        lon: 23.6712341,
        accuracy: 20
      }];
      expect(validateGeoObject(geoObject)).to.equal(false);
    });

    it('should return false if the geo object is missing lat attribute', () => {
      let geoObject = {
        lon: 23.6712341,
        accuracy: 20
      };
      expect(validateGeoObject(geoObject)).to.equal(false);
    });

    it('should return false if the geo object is missing lon attribute', () => {
      let geoObject = {
        lat: 123.5624234,
        accuracy: 20
      };
      expect(validateGeoObject(geoObject)).to.equal(false);
    });

    it('should return false if the geo object is missing accuracy attribute', () => {
      let geoObject = {
        lat: 123.5624234,
        lon: 23.6712341
      };
      expect(validateGeoObject(geoObject)).to.equal(false);
    });
  });

  describe('getDomain', function () {
    it('should return valid domain from publisherDomain config', () => {
      let pageUrl = 'https://www.example.com/page/prebid/exam.html';
      config.setConfig({ publisherDomain: pageUrl });
      expect(getDomain(pageUrl)).to.equal('example.com');
    });
    it('should return valid domain from pageUrl argument', () => {
      let pageUrl = 'https://www.example.com/page/prebid/exam.html';
      config.setConfig({ publisherDomain: '' });
      expect(getDomain(pageUrl)).to.equal('example.com');
    });
    it('should return undefined if pageUrl and publisherDomain not config', () => {
      let pageUrl;
      config.setConfig({ publisherDomain: '' });
      expect(getDomain(pageUrl)).to.equal(pageUrl);
    });
  });
});
