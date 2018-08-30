import { expect } from 'chai';
import { spec } from 'modules/bridgewellBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

describe('bridgewellBidAdapter', function () {
  let bidRequests = [
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk'
      },
      'adUnitCode': 'adunit-code-1',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    },
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ'
      },
      'adUnitCode': 'adunit-code-2',
      'sizes': [[728, 90]],
      'bidId': '3150ccb55da321',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    },
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CgUxMjMzOBIBNiIFcGVubnkqCQisAhD6ARoBOQ'
      },
      'adUnitCode': 'adunit-code-1',
      'sizes': [[300, 250]],
      'bidId': '42dbe3a7168a6a',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    },
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CgUxMjMzOBIBNiIFcGVubnkqCQisAhD6ARoBOQ',
        'cpmWeight': 0.5
      },
      'adUnitCode': 'adunit-code-1',
      'sizes': [[300, 250]],
      'bidId': '42dbe3a7168a6a',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    },
    {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ',
        'cpmWeight': -0.5
      },
      'adUnitCode': 'adunit-code-2',
      'sizes': [[728, 90]],
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
      'sizes': [728, 90],
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
            'required': false,
            'len': 15
          },
          'body': {
            'required': false
          },
          'image': {
            'required': false,
            'sizes': [150, 150]
          },
          'icon': {
            'required': false,
            'sizes': [50, 50]
          },
          'clickUrl': {
            'required': false
          },
          'cta': {
            'required': false
          },
          'sponsoredBy': {
            'required': false
          }
        }
      },
      'bidId': '3150ccb55da321',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    }
  ];
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bidWithoutCpmWeight = {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    let bidWithCorrectCpmWeight = {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk',
        'cpmWeight': 0.5
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    let bidWithUncorrectCpmWeight = {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk',
        'cpmWeight': -1.0
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    let bidWithZeroCpmWeight = {
      'bidder': 'bridgewell',
      'params': {
        'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk',
        'cpmWeight': 0
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bidWithoutCpmWeight)).to.equal(true);
      expect(spec.isBidRequestValid(bidWithCorrectCpmWeight)).to.equal(true);
      expect(spec.isBidRequestValid(bidWithUncorrectCpmWeight)).to.equal(false);
      expect(spec.isBidRequestValid(bidWithZeroCpmWeight)).to.equal(false);
    });

    it('should return false when required params not found', function () {
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    it('should return false when required params are not passed', function () {
      let bidWithoutCpmWeight = Object.assign({}, bidWithoutCpmWeight);
      let bidWithCorrectCpmWeight = Object.assign({}, bidWithCorrectCpmWeight);
      let bidWithUncorrectCpmWeight = Object.assign({}, bidWithUncorrectCpmWeight);
      let bidWithZeroCpmWeight = Object.assign({}, bidWithZeroCpmWeight);

      delete bidWithoutCpmWeight.params;
      delete bidWithCorrectCpmWeight.params;
      delete bidWithUncorrectCpmWeight.params;
      delete bidWithZeroCpmWeight.params;

      bidWithoutCpmWeight.params = {
        'ChannelID': 0
      };

      bidWithCorrectCpmWeight.params = {
        'ChannelID': 0
      };

      bidWithUncorrectCpmWeight.params = {
        'ChannelID': 0
      };

      bidWithZeroCpmWeight.params = {
        'ChannelID': 0
      };

      expect(spec.isBidRequestValid(bidWithoutCpmWeight)).to.equal(false);
      expect(spec.isBidRequestValid(bidWithCorrectCpmWeight)).to.equal(false);
      expect(spec.isBidRequestValid(bidWithUncorrectCpmWeight)).to.equal(false);
      expect(spec.isBidRequestValid(bidWithZeroCpmWeight)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should attach valid params to the tag', function () {
      const request = spec.buildRequests(bidRequests);
      const payload = request.data;
      const adUnits = payload.adUnits;

      expect(payload).to.be.an('object');
      expect(adUnits).to.be.an('array');
      for (let i = 0, max_i = adUnits.length; i < max_i; i++) {
        let adUnit = adUnits[i];
        expect(adUnit).to.have.property('ChannelID').that.is.a('string');
      }
    });

    it('should attach validBidRequests to the tag', function () {
      const request = spec.buildRequests(bidRequests);
      const validBidRequests = request.validBidRequests;
      expect(validBidRequests).to.deep.equal(bidRequests);
    });
  });

  describe('interpretResponse', function () {
    const request = spec.buildRequests(bidRequests);
    const serverResponses = [
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
      {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 728,
        'height': 90,
        'mediaType': 'banner',
        'ad': '<div>test 728x90</div>',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      },
      {
        'id': '8f12c646-3b87-4326-a837-c2a76999f168',
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
      {
        'id': '8f12c646-3b87-4326-a837-c2a76999f168',
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
      {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 728,
        'height': 90,
        'mediaType': 'banner',
        'ad': '<div>test 728x90</div>',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      },
      {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 728,
        'height': 90,
        'mediaType': 'banner',
        'ad': '<div>test 728x90</div>',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      },
      {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 728,
        'height': 90,
        'mediaType': 'banner',
        'ad': '<div>test 728x90</div>',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      },
      {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      },
      {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      }
    ];

    it('should return all required parameters', function () {
      const result = spec.interpretResponse({'body': serverResponses}, request);
      result.every(res => expect(res.cpm).to.be.a('number'));
      result.every(res => expect(res.width).to.be.a('number'));
      result.every(res => expect(res.height).to.be.a('number'));
      result.every(res => expect(res.ttl).to.be.a('number'));
      result.every(res => expect(res.netRevenue).to.be.a('boolean'));
      result.every(res => expect(res.currency).to.be.a('string'));
      result.every(res => {
        if (res.ad) {
          expect(res.ad).to.be.an('string');
        } else if (res.native) {
          expect(res.native).to.be.an('object');
        }
      });
    });

    it('should give up bid if server response is undefiend', function () {
      const result = spec.interpretResponse({'body': undefined}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if request sizes is missing', function () {
      let target = Object.assign({}, serverResponses[0]);
      target.consumed = false;
      const result = spec.interpretResponse({'body': [target]}, spec.buildRequests([{
        'bidder': 'bridgewell',
        'params': {
          'ChannelID': 'CLJgEAYYvxUiBXBlbm55KgkIrAIQ-gEaATk'
        },
        'adUnitCode': 'adunit-code-1',
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }]));
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if response sizes is invalid', function () {
      let target = {
        'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'ad': '<div>test 300x250</div>',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if cpm is missing', function () {
      let target = {
        'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
        'bidder_code': 'bridgewell',
        'width': 300,
        'height': 250,
        'ad': '<div>test 300x250</div>',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if width or height is missing', function () {
      let target = {
        'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'ad': '<div>test 300x250</div>',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if ad is missing', function () {
      let target = {
        'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 300,
        'height': 250,
        'mediaType': 'banner',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if revenue mode is missing', function () {
      let target = {
        'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 300,
        'height': 250,
        'ad': '<div>test 300x250</div>',
        'ttl': 360,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if currency is missing', function () {
      let target = {
        'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 300,
        'height': 250,
        'ad': '<div>test 300x250</div>',
        'ttl': 360,
        'netRevenue': true
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if mediaType is missing', function () {
      let target = {
        'id': 'e5b10774-32bf-4931-85ee-05095e8cff21',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 300,
        'height': 250,
        'ad': '<div>test 300x250</div>',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if property native of mediaType native is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native title is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native title is too long', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native body is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);

      it('should give up bid if native image url is missing', function () {
        let target = {
          'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
          'bidder_code': 'bridgewell',
          'cpm': 5.0,
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
          'ttl': 360,
          'netRevenue': true,
          'currency': 'NTD'
        };

        const result = spec.interpretResponse({'body': [target]}, request);
        expect(result).to.deep.equal([]);
      });
    });

    it('should give up bid if native image is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native image url is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'image': {
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native image sizes is unmatch', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native sponsoredBy is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native icon is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native icon url is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native icon sizes is unmatch', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
            'url': 'https://img.scupio.com/test/test-icon.jpg'
          },
          'clickUrl': 'https://img.scupio.com/test-clickUrl',
          'clickTrackers': ['https://img.scupio.com/test-clickTracker'],
          'impressionTrackers': ['https://img.scupio.com/test-impressionTracker']
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native clickUrl is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native clickTrackers is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native clickTrackers is empty', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native impressionTrackers is missing', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
          'clickTrackers': ['https://img.scupio.com/test-clickTracker']
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native impressionTrackers is empty', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
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
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if mediaType is not support', function () {
      let target = {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'superNiceAd',
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      };

      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });
  });
});
