import { expect } from 'chai';
import { spec } from 'modules/bridgewellBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('bridgewellBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const validTag = {
        'bidder': 'bridgewell',
        'params': {
          'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk'
        },
      };
      expect(spec.isBidRequestValid(validTag)).to.equal(true);
    });

    it('should return true when required params found', function () {
      const validTag = {
        'bidder': 'bridgewell',
        'params': {
          'cid': 1234
        },
      };
      expect(spec.isBidRequestValid(validTag)).to.equal(true);
    });

    it('should return false when required params not found', function () {
      const invalidTag = {
        'bidder': 'bridgewell',
        'params': {},
      };
      expect(spec.isBidRequestValid(invalidTag)).to.equal(false);
    });

    it('should return false when required params are empty', function () {
      const invalidTag = {
        'bidder': 'bridgewell',
        'params': {
          'ChannelID': '',
        },
      };
      expect(spec.isBidRequestValid(invalidTag)).to.equal(false);
    });

    it('should return false when required params are empty', function () {
      const invalidTag = {
        'bidder': 'bridgewell',
        'params': {
          'cid': '',
        },
      };
      expect(spec.isBidRequestValid(invalidTag)).to.equal(false);
    });

    it('should return false when required param cid is not a number', function () {
      const invalidTag = {
        'bidder': 'bridgewell',
        'params': {
          'cid': 'bad_cid',
        },
      };
      expect(spec.isBidRequestValid(invalidTag)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        'bidder': 'bridgewell',
        'params': {
          'ChannelID': 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ',
        },
        'adUnitCode': 'adunit-code-2',
        'mediaTypes': {
          'banner': {
            'sizes': [728, 90]
          }
        },
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'bridgewell',
        'params': {
          'ChannelID': 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ',
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [1, 1],
        'mediaTypes': {
          'native': {
            'title': {
              'required': true,
              'len': 15
            },
            'body': {
              'required': true
            },
            'image': {
              'required': true,
              'sizes': [150, 150]
            },
            'icon': {
              'required': true,
              'sizes': [50, 50]
            },
            'clickUrl': {
              'required': true
            },
            'cta': {
              'required': true
            },
            'sponsoredBy': {
              'required': true
            }
          }
        },
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should attach valid params to the tag', function () {
      const bidderRequest = {
        refererInfo: {
          referer: 'https://www.bridgewell.com/'
        }
      }
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload).to.be.an('object');
      expect(payload.adUnits).to.be.an('array');
      expect(payload.url).to.exist.and.to.equal('https://www.bridgewell.com/');
      for (let i = 0, max_i = payload.adUnits.length; i < max_i; i++) {
        expect(payload.adUnits[i]).to.have.property('ChannelID').that.is.a('string');
        expect(payload.adUnits[i]).to.have.property('adUnitCode').and.to.equal('adunit-code-2');
      }
    });

    it('should attach validBidRequests to the tag', function () {
      const request = spec.buildRequests(bidRequests);
      const validBidRequests = request.validBidRequests;
      expect(validBidRequests).to.deep.equal(bidRequests);
    });
  });

  describe('interpretResponse', function () {
    const nativeBidRequests = {
      validBidRequests: [
        {
          'bidder': 'bridgewell',
          'params': {
            'ChannelID': 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ',
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [1, 1],
          'mediaTypes': {
            'native': {
              'title': {
                'required': true,
                'len': 15
              },
              'body': {
                'required': true
              },
              'image': {
                'required': true,
                'sizes': [150, 150]
              },
              'icon': {
                'required': true,
                'sizes': [50, 50]
              },
              'clickUrl': {
                'required': true
              },
              'cta': {
                'required': true
              },
              'sponsoredBy': {
                'required': true
              }
            }
          },
          'bidId': '3150ccb55da321',
          'bidderRequestId': '22edbae2733bf6',
          'auctionId': '1d1a030790a475',
        },
      ]
    };
    const nativeServerResponses = [
      {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 7.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'image': {
            'url': 'https://img.scupio.com/test/test-image.jpg',
            'width': 150,
            'height': 150
          },
          'title': 'test-title',
          'sponsoredBy': 'test-sponsoredBy',
          'body': 'test-body',
          'icon': {
            'url': 'https://img.scupio.com/test/test-icon.jpg',
            'width': 50,
            'height': 50
          },
          'clickUrl': 'https://img.scupio.com/test-clickUrl',
          'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
          'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
        },
        'ttl': 400,
        'netRevenue': true,
        'currency': 'NTD'
      },
    ];
    const bannerBidRequests = {
      validBidRequests: [
        {
          'mediaTypes': {
            'banner': {
              'sizes': [300, 250]
            }
          },
          'bidId': '3150ccb55da321',
        },
      ]
    };
    const bannerServerResponses = [
      {
        'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ad': '<div>test 300x250</div>',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      },
    ];

    it('should return all required parameters', function () {
      const result = spec.interpretResponse({ 'body': nativeServerResponses }, nativeBidRequests);

      expect(result[0].requestId).to.equal('3150ccb55da321');
      expect(result[0].cpm).to.equal(7.0);
      expect(result[0].width).to.equal(1);
      expect(result[0].height).to.equal(1);
      expect(result[0].ttl).to.equal(400);
      expect(result[0].creativeId).to.equal('0e4048d3-5c74-4380-a21a-00ba35629f7d');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].currency).to.equal('NTD');
      expect(result[0].mediaType).to.equal('native');
      expect(result[0].native.image.url).to.equal('https://img.scupio.com/test/test-image.jpg');
    });

    it('should return all required parameters banner', function () {
      const result = spec.interpretResponse({ 'body': bannerServerResponses }, bannerBidRequests);

      expect(result[0].requestId).to.equal('3150ccb55da321');
      expect(result[0].cpm).to.equal(5.0);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].ttl).to.equal(360);
      expect(result[0].creativeId).to.equal('e5b10774-32bf-4931-85ee-05095e8cff21');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].currency).to.equal('NTD');
      expect(result[0].mediaType).to.equal('banner');
      expect(result[0].ad).to.equal('<div>test 300x250</div>');
    });

    it('should give up bid if server response is undefiend', function () {
      let result = spec.interpretResponse({ 'body': undefined }, bannerBidRequests);

      expect(result).to.deep.equal([]);
    });

    it('should give up bid if request sizes is missing', function () {
      const request = {
        validBidRequests: [
          {
            'mediaTypes': {
              'banner': {}
            },
            'bidId': '3150ccb55da321',
          },
        ]
      };
      const result = spec.interpretResponse({ 'body': bannerServerResponses }, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if response sizes is invalid', function () {
      const request = {
        validBidRequests: [
          {
            'mediaTypes': {
              'banner': {
                'sizes': [728, 90]
              }
            },
            'bidId': '3150ccb55da321',
          },
        ]
      };
      const result = spec.interpretResponse({ 'body': bannerServerResponses }, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if cpm is missing', function () {
      const response = [
        {
          'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
          'bidder_code': 'bridgewell',
          'width': 300,
          'height': 250,
          'mediaType': 'banner',
          'ad': '<div>test 300x250</div>',
          'ttl': 360,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, bannerBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if width or height is missing', function () {
      const response = [
        {
          'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
          'bidder_code': 'bridgewell',
          'cpm': 5.0,
          'mediaType': 'banner',
          'ad': '<div>test 300x250</div>',
          'ttl': 360,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, bannerBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if ad is missing', function () {
      const response = [
        {
          'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
          'bidder_code': 'bridgewell',
          'cpm': 5.0,
          'width': 300,
          'height': 250,
          'mediaType': 'banner',
          'ttl': 360,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, bannerBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if revenue mode is missing', function () {
      const response = [
        {
          'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
          'bidder_code': 'bridgewell',
          'cpm': 5.0,
          'width': 300,
          'height': 250,
          'mediaType': 'banner',
          'ad': '<div>test 300x250</div>',
          'ttl': 360,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, bannerBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if currency is missing', function () {
      const response = [
        {
          'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
          'bidder_code': 'bridgewell',
          'cpm': 5.0,
          'width': 300,
          'height': 250,
          'mediaType': 'banner',
          'ad': '<div>test 300x250</div>',
          'ttl': 360,
          'netRevenue': true,
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, bannerBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if mediaType is missing', function () {
      const response = [
        {
          'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
          'bidder_code': 'bridgewell',
          'cpm': 5.0,
          'width': 300,
          'height': 250,
          'ad': '<div>test 300x250</div>',
          'ttl': 360,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, bannerBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if mediaType is not support', function () {
      const responses = [
        {
          'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
          'bidder_code': 'bridgewell',
          'cpm': 5.0,
          'width': 300,
          'height': 250,
          'mediaType': 'superNiceAd',
          'ad': '<div>test 300x250</div>',
          'ttl': 360,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': responses }, bannerBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if property native of mediaType native is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native title is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native title is too long', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-titletest-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native body is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native image url is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native image is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native image is empty', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {},
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native image sizes is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg'
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native sponsoredBy is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native icon is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native icon url is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native icon sizes is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native clickUrl is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native clickTrackers is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native clickTrackers is empty', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': [],
            'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native impressionTrackers is missing', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native impressionTrackers is empty', function () {
      const response = [
        {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 7.0,
          'width': 1,
          'height': 1,
          'mediaType': 'native',
          'native': {
            'image': {
              'url': 'https://img.scupio.com/test/test-image.jpg',
              'width': 150,
              'height': 150
            },
            'title': 'test-title',
            'sponsoredBy': 'test-sponsoredBy',
            'body': 'test-body',
            'icon': {
              'url': 'https://img.scupio.com/test/test-icon.jpg',
              'width': 50,
              'height': 50
            },
            'clickUrl': 'https://img.scupio.com/test-clickUrl',
            'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
            'impressionTrackers': []
          },
          'ttl': 400,
          'netRevenue': true,
          'currency': 'NTD'
        },
      ];

      const result = spec.interpretResponse({ 'body': response }, nativeBidRequests);
      expect(result).to.deep.equal([]);
    });

    it('should contain every request bid id in responses', function () {
      const request = {
        validBidRequests: [
          {
            'mediaTypes': {
              'banner': {
                'sizes': [300, 250]
              }
            },
            'bidId': '3150ccb55da321',
          },
          {
            'mediaTypes': {
              'banner': {
                'sizes': [300, 250]
              }
            },
            'bidId': '3150ccb55da322',
          }
        ],
      };
      const response = [{
        'id': '0cd250f4-f40e-4a78-90f5-5168eb0a97e9',
        'bidder_code': 'bridgewell',
        'cpm': 7.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ad': '<div>test 300x250</div>',
        'ttl': 400,
        'netRevenue': true,
        'currency': 'NTD'
      }, {
        'id': '8a740063-6820-45e4-b01f-34ce9b38e858',
        'bidder_code': 'bridgewell',
        'cpm': 7.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ad': '<div>test 300x250</div>',
        'ttl': 400,
        'netRevenue': true,
        'currency': 'NTD'
      }];
      const result = spec.interpretResponse({ 'body': response }, request);
      let actualBidId = result.map(obj => obj.requestId);
      let expectedBidId = ['3150ccb55da321', '3150ccb55da322'];

      expect(actualBidId).to.include(expectedBidId[0]).and.to.include(expectedBidId[1]);
    });

    it('should have 2 consumed responses when two requests with same sizes are given', function () {
      const request = {
        validBidRequests: [
          {
            'mediaTypes': {
              'banner': {
                'sizes': [300, 250]
              }
            },
            'bidId': '3150ccb55da321',
          },
          {
            'mediaTypes': {
              'banner': {
                'sizes': [300, 250]
              }
            },
            'bidId': '3150ccb55da322',
          }
        ],
      };
      const response = [{
        'id': '0cd250f4-f40e-4a78-90f5-5168eb0a97e9',
        'bidder_code': 'bridgewell',
        'cpm': 7.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ad': '<div>test 300x250</div>',
        'ttl': 400,
        'netRevenue': true,
        'currency': 'NTD'
      }, {
        'id': '8a740063-6820-45e4-b01f-34ce9b38e858',
        'bidder_code': 'bridgewell',
        'cpm': 7.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ad': '<div>test 300x250</div>',
        'ttl': 400,
        'netRevenue': true,
        'currency': 'NTD'
      }];
      const reducer = function(accumulator, currentValue) {
        if (currentValue.consumed) accumulator++;
        return accumulator;
      };

      spec.interpretResponse({ 'body': response }, request);
      expect(response.reduce(reducer, 0)).to.equal(2);
    });

    it('should use adUnitCode to build bidResponses', function () {
      const request = {
        validBidRequests: [
          {
            'adUnitCode': 'div-gpt-ad-1564632520056-0',
            'bidId': '3150ccb55da321',
          },
          {
            'adUnitCode': 'div-gpt-ad-1564632520056-1',
            'bidId': '3150ccb55da322',
          }
        ],
      };
      const response = [{
        'id': '0cd250f4-f40e-4a78-90f5-5168eb0a97e9',
        'bidder_code': 'bridgewell',
        'adUnitCode': 'div-gpt-ad-1564632520056-0',
        'cpm': 7.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ad': '<div>test 300x250</div>',
        'ttl': 400,
        'netRevenue': true,
        'currency': 'NTD'
      }, {
        'id': '8a740063-6820-45e4-b01f-34ce9b38e858',
        'bidder_code': 'bridgewell',
        'adUnitCode': 'div-gpt-ad-1564632520056-1',
        'cpm': 7.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ad': '<div>test 300x250</div>',
        'ttl': 400,
        'netRevenue': true,
        'currency': 'NTD'
      }];
      const result = spec.interpretResponse({ 'body': response }, request);
      let actualBidId = result.map(obj => obj.requestId);
      let expectedBidId = ['3150ccb55da321', '3150ccb55da322'];

      expect(actualBidId).to.include(expectedBidId[0]).and.to.include(expectedBidId[1]);
    });

    it('should use size to match when adUnitCode is empty string in server response', function () {
      const request = {
        validBidRequests: [
          {
            'mediaTypes': {
              'banner': {
                'sizes': [300, 250]
              }
            },
            'adUnitCode': 'div-gpt-ad-1564632520056-0',
            'bidId': '3150ccb55da321',
          },
          {
            'mediaTypes': {
              'banner': {
                'sizes': [300, 250]
              }
            },
            'adUnitCode': 'div-gpt-ad-1564632520056-1',
            'bidId': '3150ccb55da322',
          }
        ],
      };
      const response = [{
        'id': '0cd250f4-f40e-4a78-90f5-5168eb0a97e9',
        'bidder_code': 'bridgewell',
        'adUnitCode': '',
        'cpm': 7.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ad': '<div>test 300x250</div>',
        'ttl': 400,
        'netRevenue': true,
        'currency': 'NTD'
      }, {
        'id': '8a740063-6820-45e4-b01f-34ce9b38e858',
        'bidder_code': 'bridgewell',
        'adUnitCode': '',
        'cpm': 7.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ad': '<div>test 300x250</div>',
        'ttl': 400,
        'netRevenue': true,
        'currency': 'NTD'
      }];
      const result = spec.interpretResponse({ 'body': response }, request);
      let actualBidId = result.map(obj => obj.requestId);
      let expectedBidId = ['3150ccb55da321', '3150ccb55da322'];

      expect(actualBidId).to.include(expectedBidId[0]).and.to.include(expectedBidId[1]);
    });
  });
});
