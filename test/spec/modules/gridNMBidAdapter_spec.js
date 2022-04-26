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

    it('should return true when required params is absent, but available in mediaTypes', function () {
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
        }
      ];

      const mediaTypes = {
        video: {
          mimes: ['video/mp4', 'video/x-ms-wmv'],
          playerSize: [200, 300],
          protocols: [1, 2, 3, 4, 5, 6]
        }
      };

      paramsList.forEach((params) => {
        const validBid = Object.assign({}, bid);
        delete validBid.params;
        validBid.params = params;
        validBid.mediaTypes = mediaTypes;
        expect(spec.isBidRequestValid(validBid)).to.equal(true);
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
    const bidderRequest = {
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
      timeout: 3000,
      refererInfo: { referer: 'https://example.com' }
    };
    const referrer = encodeURIComponent(bidderRequest.refererInfo.referer);
    let bidRequests = [
      {
        'bidder': 'gridNM',
        'params': {
          'source': 'jwp',
          'floorcpm': 2,
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
        expect(payload).to.have.property('no_mapping', '1');
        expect(payload).to.have.property('sp', 'jwp');

        const sizes = { w: bidRequests[i].sizes[0][0], h: bidRequests[i].sizes[0][1] };
        const impObj = {
          'id': bidRequests[i].bidId,
          'tagid': bidRequests[i].params.secid,
          'ext': {'divid': bidRequests[i].adUnitCode},
          'video': Object.assign(sizes, bidRequests[i].params.video)
        };

        if (bidRequests[i].params.floorcpm) {
          impObj.bidfloor = bidRequests[i].params.floorcpm;
        }

        expect(req.data).to.deep.equal({
          'id': bidderRequest.bidderRequestId,
          'site': {
            'page': referrer,
            'publisher': {
              'id': bidRequests[i].params.pubid
            }
          },
          'tmax': bidderRequest.timeout,
          'source': {
            'tid': bidderRequest.auctionId,
            'ext': {'wrapper': 'Prebid_js', 'wrapper_version': '$prebid.version$'}
          },
          'imp': [impObj]
        });
      });
    });

    it('should attach valid params from mediaTypes', function () {
      const mediaTypes = {
        video: {
          skipafter: 10,
          minduration: 10,
          maxduration: 100,
          protocols: [1, 3, 4],
          playerSize: [[300, 250]]
        }
      };
      const bidRequest = Object.assign({ mediaTypes }, bidRequests[0]);
      const req = spec.buildRequests([bidRequest], bidderRequest)[0];
      const expectedVideo = {
        'skipafter': 10,
        'minduration': 10,
        'maxduration': 100,
        'mimes': ['video/mp4', 'video/x-ms-wmv'],
        'protocols': [1, 2, 3, 4, 5, 6],
        'w': 300,
        'h': 250
      };

      expect(req.url).to.be.an('string');
      const payload = parseRequestUrl(req.url);
      expect(payload).to.have.property('no_mapping', '1');
      expect(payload).to.have.property('sp', 'jwp');
      expect(req.data).to.deep.equal({
        'id': bidderRequest.bidderRequestId,
        'site': {
          'page': referrer,
          'publisher': {
            'id': bidRequest.params.pubid
          }
        },
        'tmax': bidderRequest.timeout,
        'source': {
          'tid': bidderRequest.auctionId,
          'ext': {'wrapper': 'Prebid_js', 'wrapper_version': '$prebid.version$'}
        },
        'imp': [{
          'id': bidRequest.bidId,
          'bidfloor': bidRequest.params.floorcpm,
          'tagid': bidRequest.params.secid,
          'ext': {'divid': bidRequest.adUnitCode},
          'video': expectedVideo
        }]
      });
    });

    it('if gdprConsent is present payload must have gdpr params', function () {
      const gdprBidderRequest = Object.assign({gdprConsent: {consentString: 'AAA', gdprApplies: true}}, bidderRequest);
      const request = spec.buildRequests([bidRequests[0]], gdprBidderRequest)[0];
      const payload = request.data;
      expect(request).to.have.property('data');
      expect(payload).to.have.property('user');
      expect(payload.user).to.have.property('ext');
      expect(payload.user.ext).to.have.property('consent', 'AAA');
      expect(payload).to.have.property('regs');
      expect(payload.regs).to.have.property('ext');
      expect(payload.regs.ext).to.have.property('gdpr', 1);
    });

    it('if usPrivacy is present payload must have us_privacy param', function () {
      const bidderRequestWithUSP = Object.assign({uspConsent: '1YNN'}, bidderRequest);
      const request = spec.buildRequests([bidRequests[0]], bidderRequestWithUSP)[0];
      const payload = request.data;
      expect(payload).to.have.property('regs');
      expect(payload.regs).to.have.property('ext');
      expect(payload.regs.ext).to.have.property('us_privacy', '1YNN');
    });
  });

  describe('interpretResponse', function () {
    const responses = [
      {'bid': [{'price': 1.15, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>', 'content_type': 'video', 'h': 250, 'w': 300, 'dealid': 11}], 'seat': '2'},
      {'bid': [{'price': 0.5, 'adm': '<VAST version=\"3.0\">\n<Ad id=\"21341235\"><\/Ad>\n<\/VAST>', 'content_type': 'video', 'h': 600, 'w': 300, adomain: ['my_domain.ru']}], 'seat': '2'},
      {'bid': [{'price': 2.00, 'nurl': 'https://some_test_vast_url.com', 'content_type': 'video', 'adomain': ['example.com'], 'w': 300, 'h': 600}], 'seat': '2'},
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
            }
          },
          'adUnitCode': 'adunit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '127f4b12a432c',
          'bidderRequestId': 'a75bc868f32',
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
          'currency': 'USD',
          'mediaType': 'video',
          'netRevenue': true,
          'ttl': 360,
          'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21341234\"><\/Ad>\n<\/VAST>',
          'meta': {
            'advertiserDomains': []
          },
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
          'currency': 'USD',
          'mediaType': 'video',
          'netRevenue': true,
          'ttl': 360,
          'vastXml': '<VAST version=\"3.0\">\n<Ad id=\"21341235\"><\/Ad>\n<\/VAST>',
          'meta': {
            'advertiserDomains': ['my_domain.ru']
          },
          'adResponse': {
            'content': '<VAST version=\"3.0\">\n<Ad id=\"21341235\"><\/Ad>\n<\/VAST>'
          }
        },
        {
          'requestId': '127f4b12a432c',
          'cpm': 2.00,
          'creativeId': 'a75bc868f32',
          'dealId': undefined,
          'width': 300,
          'height': 600,
          'currency': 'USD',
          'mediaType': 'video',
          'netRevenue': true,
          'ttl': 360,
          'meta': {
            advertiserDomains: ['example.com']
          },
          'vastUrl': 'https://some_test_vast_url.com',
        }
      ];

      requests.forEach((req, i) => {
        const result = spec.interpretResponse({'body': {'seatbid': [responses[i]]}}, req);
        expect(result[0]).to.deep.equal(expectedResponse[i]);
      });
    });

    it('handles wrong and nobid responses', function () {
      responses.slice(3).forEach((resp) => {
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
          'meta': {
            'advertiserDomains': []
          },
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
