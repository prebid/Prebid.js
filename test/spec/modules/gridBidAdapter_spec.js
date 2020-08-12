import { expect } from 'chai';
import { spec, resetUserSync, getSyncUrl } from 'modules/gridBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('TheMediaGrid Adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'grid',
      'params': {
        'uid': '1'
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

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'uid': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    function parseRequest(url) {
      const res = {};
      url.split('&').forEach((it) => {
        const couple = it.split('=');
        res[couple[0]] = decodeURIComponent(couple[1]);
      });
      return res;
    }
    const bidderRequest = {refererInfo: {referer: 'https://example.com'}};
    const referrer = bidderRequest.refererInfo.referer;
    let bidRequests = [
      {
        'bidder': 'grid',
        'params': {
          'uid': '1'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'grid',
        'params': {
          'uid': '1'
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90]],
        'mediaTypes': {
          'video': {
            'playerSize': [400, 600]
          },
          'banner': {
            'sizes': [[728, 90]]
          }
        },
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'grid',
        'params': {
          'uid': '2'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'mediaTypes': {
          'video': {
            'playerSize': [400, 600]
          },
          'banner': {
            'sizes': [[300, 250], [300, 600]]
          }
        },
        'bidId': '42dbe3a7168a6a',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should attach valid params to the tag', function () {
      const request = spec.buildRequests([bidRequests[0]], bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('auids', '1');
      expect(payload).to.have.property('sizes', '300x250,300x600');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('wrapperType', 'Prebid_js');
      expect(payload).to.have.property('wrapperVersion', '$prebid.version$');
    });

    it('sizes must be added from mediaTypes', function () {
      const request = spec.buildRequests([bidRequests[0], bidRequests[1]], bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('auids', '1,1');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90,400x600');
      expect(payload).to.have.property('r', '22edbae2733bf6');
    });

    it('sizes must not be duplicated', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('auids', '1,1,2');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90,400x600');
      expect(payload).to.have.property('r', '22edbae2733bf6');
    });

    it('if gdprConsent is present payload must have gdpr params', function () {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA', gdprApplies: true}, refererInfo: bidderRequest.refererInfo});
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '1');
    });

    it('if gdprApplies is false gdpr_applies must be 0', function () {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA', gdprApplies: false}});
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '0');
    });

    it('if gdprApplies is undefined gdpr_applies must be 1', function () {
      const request = spec.buildRequests(bidRequests, {gdprConsent: {consentString: 'AAA'}});
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '1');
    });

    it('if usPrivacy is present payload must have us_privacy param', function () {
      const bidderRequestWithUSP = Object.assign({uspConsent: '1YNN'}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithUSP);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('us_privacy', '1YNN');
    });
  });

  describe('interpretResponse', function () {
    const responses = [
      {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 1, 'h': 250, 'w': 300, dealid: 11}], 'seat': '1'},
      {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 2, 'h': 600, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0.15, 'adm': '<div>test content 3</div>', 'auid': 1, 'h': 90, 'w': 728}], 'seat': '1'},
      {'bid': [{'price': 0, 'auid': 3, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0, 'adm': '<div>test content 5</div>', 'h': 250, 'w': 300}], 'seat': '1'},
      undefined,
      {'bid': [], 'seat': '1'},
      {'seat': '1'},
    ];

    it('should get correct bid response', function () {
      const bidRequests = [
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '659423fff799cb',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
          'cpm': 1.15,
          'creativeId': 1,
          'dealId': 11,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should get correct multi bid response', function () {
      const bidRequests = [
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71a5b',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '2'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4dff80cc4ee346',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '5703af74d0472a',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '300bfeb0d71a5b',
          'cpm': 1.15,
          'creativeId': 1,
          'dealId': 11,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        },
        {
          'requestId': '4dff80cc4ee346',
          'cpm': 0.5,
          'creativeId': 2,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 2</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        },
        {
          'requestId': '5703af74d0472a',
          'cpm': 0.15,
          'creativeId': 1,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 3</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': responses.slice(0, 3)}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should get correct video bid response', function () {
      const bidRequests = [
        {
          'bidder': 'grid',
          'params': {
            'uid': '11'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '659423fff799cb',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
          'mediaTypes': {
            'video': {
              'context': 'instream'
            }
          }
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '12'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '2bc598e42b6a',
          'bidderRequestId': '5f2009617a7c0a',
          'auctionId': '1cbd2feafe5e8b',
          'mediaTypes': {
            'video': {
              'context': 'instream'
            }
          }
        }
      ];
      const response = [
        {'bid': [{'price': 1.15, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>', 'auid': 11, content_type: 'video', w: 300, h: 600}], 'seat': '2'},
        {'bid': [{'price': 1.00, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21331274\"><\/Ad>\n<\/VAST>', 'auid': 12, content_type: 'video'}], 'seat': '2'}
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
          'cpm': 1.15,
          'creativeId': 11,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'video',
          'netRevenue': false,
          'ttl': 360,
          'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>',
          'adResponse': {
            'content': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>'
          }
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': response}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('handles wrong and nobid responses', function () {
      const bidRequests = [
        {
          'bidder': 'grid',
          'params': {
            'uid': '3'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d7190gf',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '4'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71321',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '5'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '300bfeb0d7183bb',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const result = spec.interpretResponse({'body': {'seatbid': responses.slice(2)}}, request);
      expect(result.length).to.equal(0);
    });

    it('complicated case', function () {
      const fullResponse = [
        {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 1, 'h': 250, 'w': 300, dealid: 11}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 2, 'h': 600, 'w': 300, dealid: 12}], 'seat': '1'},
        {'bid': [{'price': 0.15, 'adm': '<div>test content 3</div>', 'auid': 1, 'h': 90, 'w': 728}], 'seat': '1'},
        {'bid': [{'price': 0.15, 'adm': '<div>test content 4</div>', 'auid': 1, 'h': 600, 'w': 300}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'adm': '<div>test content 5</div>', 'auid': 2, 'h': 600, 'w': 350}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '2164be6358b9',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '326bde7fbf69',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '2'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4e111f1b66e4',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '26d6f897b516',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '2'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '1751cd90161',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '2164be6358b9',
          'cpm': 1.15,
          'creativeId': 1,
          'dealId': 11,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        },
        {
          'requestId': '4e111f1b66e4',
          'cpm': 0.5,
          'creativeId': 2,
          'dealId': 12,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 2</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        },
        {
          'requestId': '26d6f897b516',
          'cpm': 0.15,
          'creativeId': 1,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 3</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        },
        {
          'requestId': '326bde7fbf69',
          'cpm': 0.15,
          'creativeId': 1,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 4</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('dublicate uids and sizes in one slot', function () {
      const fullResponse = [
        {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 1, 'h': 250, 'w': 300}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 1, 'h': 250, 'w': 300}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '5126e301f4be',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '57b2ebe70e16',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        },
        {
          'bidder': 'grid',
          'params': {
            'uid': '1'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '225fcd44b18c',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '5126e301f4be',
          'cpm': 1.15,
          'creativeId': 1,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        },
        {
          'requestId': '57b2ebe70e16',
          'cpm': 0.5,
          'creativeId': 1,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 2</div>',
          'bidderCode': 'grid',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': false,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });
  });

  describe('user sync', function () {
    const syncUrl = getSyncUrl();

    beforeEach(function () {
      resetUserSync();
    });

    it('should register the Emily iframe', function () {
      let syncs = spec.getUserSyncs({
        pixelEnabled: true
      });

      expect(syncs).to.deep.equal({type: 'image', url: syncUrl});
    });

    it('should not register the Emily iframe more than once', function () {
      let syncs = spec.getUserSyncs({
        pixelEnabled: true
      });
      expect(syncs).to.deep.equal({type: 'image', url: syncUrl});

      // when called again, should still have only been called once
      syncs = spec.getUserSyncs();
      expect(syncs).to.equal(undefined);
    });

    it('should pass gdpr params if consent is true', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {
        gdprApplies: true, consentString: 'foo'
      })).to.deep.equal({
        type: 'image', url: `${syncUrl}&gdpr=1&gdpr_consent=foo`
      });
    });

    it('should pass gdpr params if consent is false', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {
        gdprApplies: false, consentString: 'foo'
      })).to.deep.equal({
        type: 'image', url: `${syncUrl}&gdpr=0&gdpr_consent=foo`
      });
    });

    it('should pass gdpr param gdpr_consent only when gdprApplies is undefined', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {
        consentString: 'foo'
      })).to.deep.equal({
        type: 'image', url: `${syncUrl}&gdpr_consent=foo`
      });
    });

    it('should pass no params if gdpr consentString is not defined', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {})).to.deep.equal({
        type: 'image', url: syncUrl
      });
    });

    it('should pass no params if gdpr consentString is a number', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {
        consentString: 0
      })).to.deep.equal({
        type: 'image', url: syncUrl
      });
    });

    it('should pass no params if gdpr consentString is null', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {
        consentString: null
      })).to.deep.equal({
        type: 'image', url: syncUrl
      });
    });

    it('should pass no params if gdpr consentString is a object', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {
        consentString: {}
      })).to.deep.equal({
        type: 'image', url: syncUrl
      });
    });

    it('should pass no params if gdpr is not defined', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined)).to.deep.equal({
        type: 'image', url: syncUrl
      });
    });

    it('should pass usPrivacy param if it is available', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {}, '1YNN')).to.deep.equal({
        type: 'image', url: `${syncUrl}&us_privacy=1YNN`
      });
    });
  });
});
