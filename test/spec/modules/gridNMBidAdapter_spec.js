import { expect } from 'chai';
import { spec, resetUserSync, getSyncUrl } from 'modules/gridNMBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('TheMediaGridNM Adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'gridNM',
      'params': {
        'source': 'jwp',
        'secid': '11',
        'pubid': '22',
        'video': {
          'mimes': ['video/mp4', 'video/x-ms-wmv'],
          'protocols': [1, 2, 3, 4, 5, 6]
        }
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
      const paramsList = [
        {
          'source': 'jwp',
          'secid': '11',
          'pubid': '22',
          'video': {
            'protocols': [1, 2, 3, 4, 5, 6]
          }
        },
        {
          'source': 'jwp',
          'secid': '11',
          'pubid': '22',
          'video': {
            'mimes': ['video/mp4', 'video/x-ms-wmv'],
          }
        },
        {
          'secid': '11',
          'pubid': '22',
          'video': {
            'mimes': ['video/mp4', 'video/x-ms-wmv'],
            'protocols': [1, 2, 3, 4, 5, 6]
          }
        },
        {
          'source': 'jwp',
          'pubid': '22',
          'video': {
            'mimes': ['video/mp4', 'video/x-ms-wmv'],
            'protocols': [1, 2, 3, 4, 5, 6]
          }
        },
        {
          'source': 'jwp',
          'secid': '11',
          'video': {
            'mimes': ['video/mp4', 'video/x-ms-wmv'],
            'protocols': [1, 2, 3, 4, 5, 6]
          }
        }
      ];
      paramsList.forEach((params) => {
        const invalidBid = Object.assign({}, bid);
        delete invalidBid.params;
        invalidBid.params = params;
        expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
      });
    });

    it('should return false when required params has invalid values', function () {
      const paramsList = [
        {
          'source': 'jwp',
          'secid': '11',
          'pubid': '22',
          'video': {
            'mimes': ['video/mp4', 'video/x-ms-wmv'],
            'protocols': '1,2,3,4,5'
          }
        },
        {
          'source': 'jwp',
          'secid': '11',
          'pubid': '22',
          'video': {
            'mimes': [1, 2],
            'protocols': [1, 2, 3, 4, 5]
          }
        },
        {
          'source': 'jwp',
          'secid': 11,
          'pubid': '22',
          'video': {
            'mimes': ['video/mp4', 'video/x-ms-wmv'],
            'protocols': [1, 2, 3, 4, 5]
          }
        },
        {
          'source': 111,
          'secid': '11',
          'pubid': '22',
          'video': {
            'mimes': ['video/mp4', 'video/x-ms-wmv'],
            'protocols': [1, 2, 3, 4, 5]
          }
        }
      ];

      paramsList.forEach((params) => {
        const invalidBid = Object.assign({}, bid);
        delete invalidBid.params;
        invalidBid.params = params;
        expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    function parseRequestUrl(url) {
      const res = {};
      url.replace(/^[^\?]+\?/, '').split('&').forEach((it) => {
        const couple = it.split('=');
        res[couple[0]] = decodeURIComponent(couple[1]);
      });
      return res;
    }
    const bidderRequest = {refererInfo: {referer: 'https://example.com'}};
    const referrer = bidderRequest.refererInfo.referer;
    let bidRequests = [
      {
        'bidder': 'gridNM',
        'params': {
          'source': 'jwp',
          'secid': '11',
          'pubid': '22',
          'video': {
            'mimes': ['video/mp4', 'video/x-ms-wmv'],
            'protocols': [1, 2, 3, 4, 5, 6]
          }
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      },
      {
        'bidder': 'gridNM',
        'params': {
          'source': 'jwp',
          'secid': '11',
          'pubid': '22',
          'video': {
            'mimes': ['video/mp4'],
            'protocols': [1, 2, 3],
            'skip': 1
          }
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90]],
        'bidId': '3150ccb55da321',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should attach valid params to the tag', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const requestsSizes = ['300x250,300x600', '728x90'];
      requests.forEach((req, i) => {
        expect(req.url).to.be.an('string');
        const payload = parseRequestUrl(req.url);
        expect(payload).to.have.property('u', referrer);
        expect(payload).to.have.property('r', '22edbae2733bf6');
        expect(payload).to.have.property('wrapperType', 'Prebid_js');
        expect(payload).to.have.property('wrapperVersion', '$prebid.version$');
        expect(payload).to.have.property('sizes', requestsSizes[i]);
        expect(req.data).to.deep.equal(bidRequests[i].params);
      });
    });

    it('if gdprConsent is present payload must have gdpr params', function () {
      const [request] = spec.buildRequests([bidRequests[0]], {gdprConsent: {consentString: 'AAA', gdprApplies: true}, refererInfo: bidderRequest.refererInfo});
      expect(request.url).to.be.an('string');
      const payload = parseRequestUrl(request.url);
      expect(payload).to.have.property('u', referrer);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '1');
    });

    it('if gdprApplies is false gdpr_applies must be 0', function () {
      const [request] = spec.buildRequests([bidRequests[0]], {gdprConsent: {consentString: 'AAA', gdprApplies: false}});
      expect(request.url).to.be.an('string');
      const payload = parseRequestUrl(request.url);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '0');
    });

    it('if gdprApplies is undefined gdpr_applies must be 1', function () {
      const [request] = spec.buildRequests([bidRequests[0]], {gdprConsent: {consentString: 'AAA'}});
      expect(request.url).to.be.an('string');
      const payload = parseRequestUrl(request.url);
      expect(payload).to.have.property('gdpr_consent', 'AAA');
      expect(payload).to.have.property('gdpr_applies', '1');
    });

    it('if usPrivacy is present payload must have us_privacy param', function () {
      const bidderRequestWithUSP = Object.assign({uspConsent: '1YNN'}, bidderRequest);
      const [request] = spec.buildRequests([bidRequests[0]], bidderRequestWithUSP);
      expect(request.url).to.be.an('string');
      const payload = parseRequestUrl(request.url);
      expect(payload).to.have.property('us_privacy', '1YNN');
    });
  });

  describe('interpretResponse', function () {
    const responses = [
      {'bid': [{'price': 1.15, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>', 'content_type': 'video', 'h': 250, 'w': 300, 'dealid': 11}], 'seat': '2'},
      {'bid': [{'price': 0.5, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341235\"><\/Ad>\n<\/VAST>', 'content_type': 'video', 'h': 600, 'w': 300}], 'seat': '2'},
      {'bid': [{'price': 0, 'h': 250, 'w': 300}], 'seat': '2'},
      {'bid': [{'price': 0, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341237\"><\/Ad>\n<\/VAST>', 'h': 250, 'w': 300}], 'seat': '2'},
      undefined,
      {'bid': [], 'seat': '2'},
      {'seat': '2'},
    ];

    it('should get correct video bid response', function () {
      const bidRequests = [
        {
          'bidder': 'gridNM',
          'params': {
            'source': 'jwp',
            'secid': '11',
            'pubid': '22',
            'video': {
              'mimes': ['video/mp4', 'video/x-ms-wmv'],
              'protocols': [1, 2, 3, 4, 5, 6]
            }
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
          'bidder': 'gridNM',
          'params': {
            'source': 'jwp',
            'secid': '11',
            'pubid': '22',
            'video': {
              'mimes': ['video/mp4'],
              'protocols': [1, 2, 3, 4, 5],
              'skip': 1
            }
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '2bc598e42b6a',
          'bidderRequestId': '1e8b5a465f404',
          'auctionId': '1cbd2feafe5e8b',
          'mediaTypes': {
            'video': {
              'context': 'instream'
            }
          }
        }
      ];
      const requests = spec.buildRequests(bidRequests);
      const expectedResponse = [
        {
          'requestId': '659423fff799cb',
          'cpm': 1.15,
          'creativeId': '5f2009617a7c0a',
          'dealId': 11,
          'width': 300,
          'height': 250,
          'bidderCode': 'gridNM',
          'currency': 'USD',
          'mediaType': 'video',
          'netRevenue': false,
          'ttl': 360,
          'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>',
          'adResponse': {
            'content': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>'
          }
        },
        {
          'requestId': '2bc598e42b6a',
          'cpm': 0.5,
          'creativeId': '1e8b5a465f404',
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'bidderCode': 'gridNM',
          'currency': 'USD',
          'mediaType': 'video',
          'netRevenue': false,
          'ttl': 360,
          'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21341235\"><\/Ad>\n<\/VAST>',
          'adResponse': {
            'content': '<VAST version=\"3.0\">\n<Ad id=\"21341235\"><\/Ad>\n<\/VAST>'
          }
        }
      ];

      requests.forEach((req, i) => {
        const result = spec.interpretResponse({'body': {'seatbid': [responses[i]]}}, req);
        expect(result[0]).to.deep.equal(expectedResponse[i]);
      });
    });

    it('handles wrong and nobid responses', function () {
      responses.slice(2).forEach((resp) => {
        const request = spec.buildRequests([{
          'bidder': 'gridNM',
          'params': {
            'source': 'jwp',
            'secid': '11',
            'pubid': '22',
            'video': {
              'mimes': ['video/mp4'],
              'protocols': [1, 2, 3, 4, 5],
              'skip': 1
            }
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '2bc598e42b6a',
          'bidderRequestId': '39d74f5b71464',
          'auctionId': '1cbd2feafe5e8b',
          'mediaTypes': {
            'video': {
              'context': 'instream'
            }
          }
        }]);
        const result = spec.interpretResponse({'body': {'seatbid': [resp]}}, request[0]);
        expect(result.length).to.equal(0);
      });
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
