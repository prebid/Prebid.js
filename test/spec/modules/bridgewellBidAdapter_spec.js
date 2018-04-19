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
          'sizes': [728, 90],
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
      'mediaTypes': {
        'banner': {
          'sizes': [[728, 90]],
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
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
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

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bidWithoutCpmWeight)).to.equal(true);
      expect(spec.isBidRequestValid(bidWithCorrectCpmWeight)).to.equal(true);
      expect(spec.isBidRequestValid(bidWithUncorrectCpmWeight)).to.equal(false);
      expect(spec.isBidRequestValid(bidWithZeroCpmWeight)).to.equal(false);
    });

    it('should return false when required params are not passed', () => {
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

  describe('buildRequests', () => {
    it('should attach valid params to the tag', () => {
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

    it('should attach validBidRequests to the tag', () => {
      const request = spec.buildRequests(bidRequests);
      const validBidRequests = request.validBidRequests;
      expect(validBidRequests).to.deep.equal(bidRequests);
    });
  });

  describe('interpretResponse', () => {
    const request = spec.buildRequests(bidRequests);
    const serverResponses = [{
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
    }, {
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
    }, {
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
    }, {
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
    }, {
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
    }, {
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
    }, {
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
    }, {
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
    }, {
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
    }];

    it('should return all required parameters', () => {
      const result = spec.interpretResponse({'body': serverResponses}, request);
      result.every(res => expect(res.cpm).to.be.a('number'));
      result.every(res => expect(res.width).to.be.a('number'));
      result.every(res => expect(res.height).to.be.a('number'));
      result.every(res => expect(res.ttl).to.be.a('number'));
      result.every(res => expect(res.netRevenue).to.be.a('boolean'));
      result.every(res => expect(res.currency).to.be.a('string'));
      result.every(res => expect(res.mediaType).to.be.a('string'));

      result.every(res => {
        if (res.ad) {
          expect(res.ad).to.be.an('string');
        }
      });

      result.every(res => {
        if (res.native) {
          expect(res.native).to.be.an('object');
        }
      });
    });

    it('should give up bid if server response is undefiend', () => {
      const result = spec.interpretResponse({'body': undefined}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if cpm is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.cpm;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if typeof cpm is not number', () => {
      let target = Object.assign({}, {
        'cpm': ''
      });
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if width or height is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.height;
      delete target.width;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if typeof ad is not string', () => {
      let target = Object.assign({}, {
        'cpm': 1,
        'currency': '',
        'mediaType': 'banner',
        'ad': 55688
      });
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if property native not existed', () => {
      let target = Object.assign({}, {
        'cpm': 1,
        'currency': '',
        'mediaType': 'native'
      });
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if revenue mode is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.netRevenue;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if currency is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.currency;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if typeof currency is not string', () => {
      let target = Object.assign({}, {
        'cpm': 1,
        'currency': 55688
      });
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if mediaType is missing', () => {
      let target = Object.assign({}, serverResponses[0]);
      delete target.mediaType;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if typeof mediaType is not string', () => {
      let target = Object.assign({}, {
        'cpm': 1,
        'currency': '',
        'mediaType': 55688
      });
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if mediaType is not supported', () => {
      let target = Object.assign({}, {
        'cpm': 1,
        'currency': '',
        'mediaType': 'superNiceAd'
      });
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native is missing', () => {
      let target = Object.assign({}, serverResponses[8]);
      delete target.native;
      const result = spec.interpretResponse({'body': [target]}, request);
      expect(result).to.deep.equal([]);
    });

    it('should give up bid if native required parameter is invalid', () => {
      // wrong title type
      let wrongTitleType = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': 55688
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongTitleTypeResult = spec.interpretResponse({'body': [wrongTitleType]}, request);
      expect(wrongTitleTypeResult).to.deep.equal([]);

      // native title length exceed limit
      let invalidTitle = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': 'testtesttesttest'
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const invalidTitleResult = spec.interpretResponse({'body': [invalidTitle]}, request);
      expect(invalidTitleResult).to.deep.equal([]);

      // wrong body type
      let wrongBodyType = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': 'test',
          'body': 55688
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongBodyTypeResult = spec.interpretResponse({'body': [wrongBodyType]}, request);
      expect(wrongBodyTypeResult).to.deep.equal([]);

      // wrong image type
      let wrongImageType = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': 'test',
          'body': '55688',
          'image': ''
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongImageTypeResult = spec.interpretResponse({'body': [wrongImageType]}, request);
      expect(wrongImageTypeResult).to.deep.equal([]);

      // wrong image url type
      let wrongImageUrlType = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': 'test',
          'body': '55688',
          'image': {
            'url': 55688
          }
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongImageUrlTypeResult = spec.interpretResponse({'body': [wrongImageUrlType]}, request);
      expect(wrongImageUrlTypeResult).to.deep.equal([]);

      // wrong image size
      let wrongImageSize = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': 'test',
          'body': '55688',
          'image': {
            'url': '',
            'width': 50,
            'height': 50
          }
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongImageSizeResult = spec.interpretResponse({'body': [wrongImageSize]}, request);
      expect(wrongImageSizeResult).to.deep.equal([]);

      // wrong sponsoredBy type
      let wrongSponsoredByType = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': 'test',
          'body': '55688',
          'image': {
            'url': '',
            'width': 150,
            'height': 150
          },
          'sponsoredBy': 55688
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongSponsoredByTypeResult = spec.interpretResponse({'body': [wrongSponsoredByType]}, request);
      expect(wrongSponsoredByTypeResult).to.deep.equal([]);

      // wrong icon type
      let wrongIconType = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': '',
          'body': '',
          'image': {
            'url': '',
            'width': 150,
            'height': 150
          },
          'icon': '',
          'sponsoredBy': '',
          'clickUrl': 55688
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongIconTypeResult = spec.interpretResponse({'body': [wrongIconType]}, request);
      expect(wrongIconTypeResult).to.deep.equal([]);

      // wrong icon url
      let wrongIconUrl = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': '',
          'body': '',
          'image': {
            'url': '',
            'width': 150,
            'height': 150
          },
          'icon': {
            'url': 55688,
            'width': 30,
            'hieght': 30
          },
          'sponsoredBy': '',
          'clickUrl': 55688
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongIconUrlResult = spec.interpretResponse({'body': [wrongIconUrl]}, request);
      expect(wrongIconUrlResult).to.deep.equal([]);

      // wrong icon size
      let wrongIconSize = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': '',
          'body': '',
          'image': {
            'url': '',
            'width': 150,
            'height': 150
          },
          'icon': {
            'url': '',
            'width': 30,
            'hieght': 30
          },
          'sponsoredBy': '',
          'clickUrl': 55688
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongIconSizeResult = spec.interpretResponse({'body': [wrongIconSize]}, request);
      expect(wrongIconSizeResult).to.deep.equal([]);

      // wrong clickUrl type
      let wrongClickUrlType = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': '',
          'body': '',
          'image': {
            'url': '',
            'width': 150,
            'height': 150
          },
          'icon': {
            'url': '',
            'width': 50,
            'height': 50
          },
          'sponsoredBy': '',
          'clickUrl': 55688
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongClickUrlTypeResult = spec.interpretResponse({'body': [wrongClickUrlType]}, request);
      expect(wrongClickUrlTypeResult).to.deep.equal([]);

      // wrong clickTrackers type
      let wrongClickTrackersType = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': '',
          'body': '',
          'image': {
            'url': '',
            'width': 150,
            'height': 150
          },
          'icon': {
            'url': '',
            'width': 50,
            'height': 50
          },
          'sponsoredBy': '',
          'clickUrl': ''
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongClickTrackersTypeResult = spec.interpretResponse({'body': [wrongClickTrackersType]}, request);
      expect(wrongClickTrackersTypeResult).to.deep.equal([]);

      // wrong clickTrackers length
      let wrongClickTrackersLength = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': '',
          'body': '',
          'image': {
            'url': '',
            'width': 150,
            'height': 150
          },
          'icon': {
            'url': '',
            'width': 50,
            'height': 50
          },
          'sponsoredBy': '',
          'clickUrl': '',
          'clickTrackers': []
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongClickTrackersLengthResult = spec.interpretResponse({'body': [wrongClickTrackersLength]}, request);
      expect(wrongClickTrackersLengthResult).to.deep.equal([]);

      // wrong impressionTrackers type
      let wrongImpressionTrackersType = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': '',
          'body': '',
          'image': {
            'url': '',
            'width': 150,
            'height': 150
          },
          'icon': {
            'url': '',
            'width': 50,
            'height': 50
          },
          'sponsoredBy': '',
          'clickUrl': '',
          'clickTrackers': [''],
          'impressionTrackers': ''
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongImpressionTrackersTypeResult = spec.interpretResponse({'body': [wrongImpressionTrackersType]}, request);
      expect(wrongImpressionTrackersTypeResult).to.deep.equal([]);

      // wrong impressionTrackers length
      let wrongImpressionTrackersLength = Object.assign({}, {
        'id': '0e4048d3-5c74-4380-a21a-00ba35629f7d',
        'bidder_code': 'bridgewell',
        'cpm': 5.0,
        'width': 1,
        'height': 1,
        'mediaType': 'native',
        'native': {
          'title': '',
          'body': '',
          'image': {
            'url': '',
            'width': 150,
            'height': 150
          },
          'icon': {
            'url': '',
            'width': 50,
            'height': 50
          },
          'sponsoredBy': '',
          'clickUrl': '',
          'clickTrackers': [''],
          'impressionTrackers': []
        },
        'ttl': 360,
        'netRevenue': true,
        'currency': 'NTD'
      });
      const wrongImpressionTrackersLengthResult = spec.interpretResponse({'body': [wrongImpressionTrackersLength]}, request);
      expect(wrongImpressionTrackersLengthResult).to.deep.equal([]);
    });

    it('should give up bid if native required parameter is missing', () => {
      // missing title
      let missingTitle = Object.assign({}, serverResponses[8]);
      delete missingTitle.native.title;
      const missingTitleResult = spec.interpretResponse({'body': [missingTitle]}, request);
      expect(missingTitleResult).to.deep.equal([]);

      // missing body
      let missingBody = Object.assign({}, serverResponses[8]);
      delete missingBody.native.body;
      const missingBodyResult = spec.interpretResponse({'body': [missingBody]}, request);
      expect(missingBodyResult).to.deep.equal([]);

      // missing image
      let missingImage = Object.assign({}, serverResponses[8]);
      delete missingImage.native.image;
      const missingImageResult = spec.interpretResponse({'body': [missingImage]}, request);
      expect(missingImageResult).to.deep.equal([]);

      // missing clickUrl
      let missingClickUrl = Object.assign({}, serverResponses[8]);
      delete missingClickUrl.native.clickUrl;
      const missingClickUrlResult = spec.interpretResponse({'body': [missingClickUrl]}, request);
      expect(missingClickUrlResult).to.deep.equal([]);

      // missing clickTrackers
      let missingClickTrackers = Object.assign({}, serverResponses[8]);
      delete missingClickTrackers.native.clickTrackers;
      const missingClickTrackersResult = spec.interpretResponse({'body': [missingClickTrackers]}, request);
      expect(missingClickTrackersResult).to.deep.equal([]);

      // missing impressionTrackers
      let missingImpressionTrackers = Object.assign({}, serverResponses[8]);
      delete missingImpressionTrackers.native.impressionTrackers;
      const missingImpressionTrackersResult = spec.interpretResponse({'body': [missingImpressionTrackers]}, request);
      expect(missingImpressionTrackersResult).to.deep.equal([]);
    });

    it('should be the valid response if native sizes dont match', () => {
      const result = spec.interpretResponse({'body': {
        'width': 150,
        'height': 150,
        'mediaType': 'native'
      }}, request);
      result.every(res => expect(res).to.be.a('object'));
    });
  });
});
