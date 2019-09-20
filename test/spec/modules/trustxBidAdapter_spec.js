import { expect } from 'chai';
import { spec } from 'modules/trustxBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('TrustXAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'trustx',
      'params': {
        'uid': '44'
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

    const bidderRequest = {
      refererInfo: {
        referer: 'http://example.com'
      }
    };
    const referrer = bidderRequest.refererInfo.referer;

    let bidRequests = [
      {
        'bidder': 'trustx',
        'params': {
          'uid': '43'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '43'
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90], [300, 250]],
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '45'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
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
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '43');
      expect(payload).to.have.property('sizes', '300x250,300x600');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      expect(payload).to.have.property('wrapperType', 'Prebid_js');
      expect(payload).to.have.property('wrapperVersion', '$prebid.version$');
    });

    it('sizes must not be duplicated', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '43,43,45');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
    });

    it('pt parameter must be "gross" if params.priceType === "gross"', function () {
      bidRequests[1].params.priceType = 'gross';
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'gross');
      expect(payload).to.have.property('auids', '43,43,45');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      delete bidRequests[1].params.priceType;
    });

    it('pt parameter must be "net" or "gross"', function () {
      bidRequests[1].params.priceType = 'some';
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('pt', 'net');
      expect(payload).to.have.property('auids', '43,43,45');
      expect(payload).to.have.property('sizes', '300x250,300x600,728x90');
      expect(payload).to.have.property('r', '22edbae2733bf6');
      delete bidRequests[1].params.priceType;
    });

    it('if gdprConsent is present payload must have gdpr params', function () {
      const bidderRequestWithGDPR = Object.assign({gdprConsent: {consentString: 'AAA', gdprApplies: true}}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithGDPR);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '1');
    });

    it('if gdprApplies is false gdpr_applies must be 0', function () {
      const bidderRequestWithGDPR = Object.assign({gdprConsent: {consentString: 'AAA', gdprApplies: false}}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithGDPR);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '0');
    });

    it('if gdprApplies is undefined gdpr_applies must be 1', function () {
      const bidderRequestWithGDPR = Object.assign({gdprConsent: {consentString: 'AAA'}}, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequestWithGDPR);
      expect(request.data).to.be.an('string');
      const payload = parseRequest(request.data);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '1');
    });
  });

  describe('interpretResponse', function () {
    const responses = [
      {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 43, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 44, 'h': 600, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0.15, 'adm': '<div>test content 3</div>', 'auid': 43, 'h': 90, 'w': 728}], 'seat': '1'},
      {'bid': [{'price': 0, 'auid': 45, 'h': 250, 'w': 300}], 'seat': '1'},
      {'bid': [{'price': 0, 'adm': '<div>test content 5</div>', 'h': 250, 'w': 300}], 'seat': '1'},
      undefined,
      {'bid': [], 'seat': '1'},
      {'seat': '1'},
    ];

    it('should get correct bid response', function () {
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
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
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': [responses[0]]}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should get correct multi bid response', function () {
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71a5b',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '44'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4dff80cc4ee346',
          'bidderRequestId': '2c2bb1972df9a',
          'auctionId': '1fa09aee5c8c99',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
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
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '4dff80cc4ee346',
          'cpm': 0.5,
          'creativeId': 44,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 2</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '5703af74d0472a',
          'cpm': 0.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 3</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': responses.slice(0, 3)}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('handles wrong and nobid responses', function () {
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '45'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d7190gf',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '46'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '300bfeb0d71321',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '50'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '300bfeb0d7183bb',
          'bidderRequestId': '2c2bb1972d23af',
          'auctionId': '1fa09aee5c84d34',
        }
      ];
      const request = spec.buildRequests(bidRequests);
      const result = spec.interpretResponse({'body': {'seatbid': responses.slice(3)}}, request);
      expect(result.length).to.equal(0);
    });

    it('complicated case', function () {
      const fullResponse = [
        {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 43, 'h': 250, 'w': 300}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 44, 'h': 600, 'w': 300}], 'seat': '1'},
        {'bid': [{'price': 0.15, 'adm': '<div>test content 3</div>', 'auid': 43, 'h': 90, 'w': 728}], 'seat': '1'},
        {'bid': [{'price': 0.15, 'adm': '<div>test content 4</div>', 'auid': 43, 'h': 600, 'w': 300}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'adm': '<div>test content 5</div>', 'auid': 44, 'h': 600, 'w': 350}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '2164be6358b9',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '326bde7fbf69',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '44'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4e111f1b66e4',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-2',
          'sizes': [[728, 90]],
          'bidId': '26d6f897b516',
          'bidderRequestId': '106efe3247',
          'auctionId': '32a1f276cb87cb8',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '44'
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
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '4e111f1b66e4',
          'cpm': 0.5,
          'creativeId': 44,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 2</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '26d6f897b516',
          'cpm': 0.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 728,
          'height': 90,
          'ad': '<div>test content 3</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '326bde7fbf69',
          'cpm': 0.15,
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'ad': '<div>test content 4</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('dublicate uids and sizes in one slot', function () {
      const fullResponse = [
        {'bid': [{'price': 1.15, 'adm': '<div>test content 1</div>', 'auid': 43, 'h': 250, 'w': 300}], 'seat': '1'},
        {'bid': [{'price': 0.5, 'adm': '<div>test content 2</div>', 'auid': 43, 'h': 250, 'w': 300}], 'seat': '1'},
      ];
      const bidRequests = [
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '5126e301f4be',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '57b2ebe70e16',
          'bidderRequestId': '171c5405a390',
          'auctionId': '35bcbc0f7e79c',
        },
        {
          'bidder': 'trustx',
          'params': {
            'uid': '43'
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
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 1</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        },
        {
          'requestId': '57b2ebe70e16',
          'cpm': 0.5,
          'creativeId': 43,
          'dealId': undefined,
          'width': 300,
          'height': 250,
          'ad': '<div>test content 2</div>',
          'bidderCode': 'trustx',
          'currency': 'USD',
          'mediaType': 'banner',
          'netRevenue': true,
          'ttl': 360,
        }
      ];

      const result = spec.interpretResponse({'body': {'seatbid': fullResponse}}, request);
      expect(result).to.deep.equal(expectedResponse);
    });
  });

  it('should get correct video bid response', function () {
    const bidRequests = [
      {
        'bidder': 'trustx',
        'params': {
          'uid': '50'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '57dfefb80eca',
        'bidderRequestId': '20394420a762a2',
        'auctionId': '140132d07b031',
        'mediaTypes': {
          'video': {
            'context': 'instream'
          }
        }
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '51'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'e893c787c22dd',
        'bidderRequestId': '20394420a762a2',
        'auctionId': '140132d07b031',
        'mediaTypes': {
          'video': {
            'context': 'instream'
          }
        }
      }
    ];
    const response = [
      {'bid': [{'price': 1.15, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>', 'auid': 50, content_type: 'video', w: 300, h: 600}], 'seat': '2'},
      {'bid': [{'price': 1.00, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21331274\"><\/Ad>\n<\/VAST>', 'auid': 51, content_type: 'video'}], 'seat': '2'}
    ];
    const request = spec.buildRequests(bidRequests);
    const expectedResponse = [
      {
        'requestId': '57dfefb80eca',
        'cpm': 1.15,
        'creativeId': 50,
        'dealId': undefined,
        'width': 300,
        'height': 600,
        'bidderCode': 'trustx',
        'currency': 'USD',
        'mediaType': 'video',
        'netRevenue': true,
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

  it('should have right renderer in the bid response', function () {
    const spySetRenderer = sinon.spy();
    const stubRenderer = {
      setRender: spySetRenderer
    };
    const spyRendererInstall = sinon.spy(function() { return stubRenderer; });
    const stubRendererConst = {
      install: spyRendererInstall
    };
    const bidRequests = [
      {
        'bidder': 'trustx',
        'params': {
          'uid': '50'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'e6e65553fc8',
        'bidderRequestId': '1380f393215dc7',
        'auctionId': '10b8d2f3c697e3',
        'mediaTypes': {
          'video': {
            'context': 'outstream'
          }
        }
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '51'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'c8fdcb3f269f',
        'bidderRequestId': '1380f393215dc7',
        'auctionId': '10b8d2f3c697e3'
      },
      {
        'bidder': 'trustx',
        'params': {
          'uid': '52'
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '1de036c37685',
        'bidderRequestId': '1380f393215dc7',
        'auctionId': '10b8d2f3c697e3',
        'renderer': {}
      }
    ];
    const response = [
      {'bid': [{'price': 1.15, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>', 'auid': 50, content_type: 'video', w: 300, h: 600}], 'seat': '2'},
      {'bid': [{'price': 1.00, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21331274\"><\/Ad>\n<\/VAST>', 'auid': 51, content_type: 'video', w: 300, h: 250}], 'seat': '2'},
      {'bid': [{'price': 1.20, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21376532\"><\/Ad>\n<\/VAST>', 'auid': 52, content_type: 'video', w: 300, h: 250}], 'seat': '2'}
    ];
    const request = spec.buildRequests(bidRequests);
    const expectedResponse = [
      {
        'requestId': 'e6e65553fc8',
        'cpm': 1.15,
        'creativeId': 50,
        'dealId': undefined,
        'width': 300,
        'height': 600,
        'bidderCode': 'trustx',
        'currency': 'USD',
        'mediaType': 'video',
        'netRevenue': true,
        'ttl': 360,
        'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>',
        'adResponse': {
          'content': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>'
        },
        'renderer': stubRenderer
      },
      {
        'requestId': 'c8fdcb3f269f',
        'cpm': 1.00,
        'creativeId': 51,
        'dealId': undefined,
        'width': 300,
        'height': 250,
        'bidderCode': 'trustx',
        'currency': 'USD',
        'mediaType': 'video',
        'netRevenue': true,
        'ttl': 360,
        'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21331274\"><\/Ad>\n<\/VAST>',
        'adResponse': {
          'content': '<VAST version=\"3.0\">\n<Ad id=\"21331274\"><\/Ad>\n<\/VAST>'
        },
        'renderer': stubRenderer
      },
      {
        'requestId': '1de036c37685',
        'cpm': 1.20,
        'creativeId': 52,
        'dealId': undefined,
        'width': 300,
        'height': 250,
        'bidderCode': 'trustx',
        'currency': 'USD',
        'mediaType': 'video',
        'netRevenue': true,
        'ttl': 360,
        'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21376532\"><\/Ad>\n<\/VAST>',
        'adResponse': {
          'content': '<VAST version=\"3.0\">\n<Ad id=\"21376532\"><\/Ad>\n<\/VAST>'
        }
      }
    ];

    const result = spec.interpretResponse({'body': {'seatbid': response}}, request, stubRendererConst);

    expect(spySetRenderer.calledTwice).to.equal(true);
    expect(spySetRenderer.getCall(0).args[0]).to.be.a('function');
    expect(spySetRenderer.getCall(1).args[0]).to.be.a('function');

    expect(spyRendererInstall.calledTwice).to.equal(true);
    expect(spyRendererInstall.getCall(0).args[0]).to.deep.equal({
      id: 'e6e65553fc8',
      url: '//acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
      loaded: false
    });
    expect(spyRendererInstall.getCall(1).args[0]).to.deep.equal({
      id: 'c8fdcb3f269f',
      url: '//acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
      loaded: false
    });

    expect(result).to.deep.equal(expectedResponse);
  });
});
