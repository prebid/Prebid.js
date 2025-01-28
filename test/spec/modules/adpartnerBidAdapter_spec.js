import {expect} from 'chai';
import {spec, ENDPOINT_PROTOCOL, ENDPOINT_DOMAIN, ENDPOINT_PATH} from 'modules/adpartnerBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

const BIDDER_CODE = 'adpartner';

describe('AdpartnerAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.be.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      let validRequest = {
        'params': {
          'unitId': 123
        }
      };
      expect(spec.isBidRequestValid(validRequest)).to.equal(true);
    });

    it('should return true when required params is srting', function () {
      let validRequest = {
        'params': {
          'unitId': '456'
        }
      };
      expect(spec.isBidRequestValid(validRequest)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let validRequest = {
        'params': {
          'unknownId': 123
        }
      };
      expect(spec.isBidRequestValid(validRequest)).to.equal(false);
    });

    it('should return false when required params is 0', function () {
      let validRequest = {
        'params': {
          'unitId': 0
        }
      };
      expect(spec.isBidRequestValid(validRequest)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let validEndpoint = ENDPOINT_PROTOCOL + '://' + ENDPOINT_DOMAIN + ENDPOINT_PATH + '?tag=123,456&partner=777&sizes=300x250|300x600,728x90,300x250&referer=https%3A%2F%2Ftest.domain';

    let validRequest = [
      {
        'bidder': BIDDER_CODE,
        'params': {
          'unitId': 123
        },
        'adUnitCode': 'adunit-code-1',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e'
      },
      {
        'bidder': BIDDER_CODE,
        'params': {
          'unitId': '456'
        },
        'adUnitCode': 'adunit-code-2',
        'sizes': [[728, 90]],
        'bidId': '22aidtbx5eabd9'
      },
      {
        'bidder': BIDDER_CODE,
        'params': {
          'partnerId': 777
        },
        'adUnitCode': 'partner-code-3',
        'sizes': [[300, 250]],
        'bidId': '5d4531d5a6c013'
      }
    ];

    let bidderRequest = {
      refererInfo: {
        page: 'https://test.domain'
      }
    };

    it('bidRequest HTTP method', function () {
      const request = spec.buildRequests(validRequest, bidderRequest);
      expect(request.method).to.equal('POST');
    });

    it('bidRequest url', function () {
      const request = spec.buildRequests(validRequest, bidderRequest);
      expect(request.url).to.equal(validEndpoint);
    });

    it('bidRequest data', function () {
      const request = spec.buildRequests(validRequest, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload[0].unitId).to.equal(123);
      expect(payload[0].sizes).to.deep.equal([[300, 250], [300, 600]]);
      expect(payload[0].bidId).to.equal('30b31c1838de1e');
      expect(payload[1].unitId).to.equal(456);
      expect(payload[1].sizes).to.deep.equal([[728, 90]]);
      expect(payload[1].bidId).to.equal('22aidtbx5eabd9');
      expect(payload[2].partnerId).to.equal(777);
      expect(payload[2].sizes).to.deep.equal([[300, 250]]);
      expect(payload[2].bidId).to.equal('5d4531d5a6c013');
    });
  });

  describe('joinSizesToString', function () {
    it('success convert sizes list to string', function () {
      const sizesStr = spec.joinSizesToString([[300, 250], [300, 600]]);
      expect(sizesStr).to.equal('300x250|300x600');
    });
  });

  describe('interpretResponse', function () {
    const bidRequest = {
      'method': 'POST',
      'url': ENDPOINT_PROTOCOL + '://' + ENDPOINT_DOMAIN + ENDPOINT_PATH + '?tag=123,456&partner=777code=adunit-code-1,adunit-code-2,partner-code-3&bid=30b31c1838de1e,22aidtbx5eabd9,5d4531d5a6c013&sizes=300x250|300x600,728x90,300x250&referer=https%3A%2F%2Ftest.domain',
      'data': '[{"unitId": 13144370,"adUnitCode": "div-gpt-ad-1460505748561-0","sizes": [[300, 250], [300, 600]],"bidId": "2bdcb0b203c17d","referer": "https://test.domain/index.html"},' +
        '{"unitId": 13144370,"adUnitCode":"div-gpt-ad-1460505748561-1","sizes": [[768, 90]],"bidId": "3dc6b8084f91a8","referer": "https://test.domain/index.html"},' +
        '{"unitId": 0,"partnerId": 777,"adUnitCode":"div-gpt-ad-1460505748561-2","sizes": [[300, 250]],"bidId": "5d4531d5a6c013","referer": "https://test.domain/index.html"}]'
    };

    const bidResponse = {
      body: {
        'div-gpt-ad-1460505748561-0':
          {
            'ad': '<div>ad</div>',
            'width': 300,
            'height': 250,
            'creativeId': '8:123456',
            'adomain': [
              'test.domain'
            ],
            'syncs': [
              {'type': 'image', 'url': 'https://test.domain/tracker_1.gif'},
              {'type': 'image', 'url': 'https://test.domain/tracker_2.gif'},
              {'type': 'image', 'url': 'https://test.domain/tracker_3.gif'}
            ],
            'winNotification': [
              {
                'method': 'POST',
                'path': '/hb/bid_won?test=1',
                'data': {
                  'ad': [
                    {'dsp': 8, 'id': 800008, 'cost': 1.0e-5, 'nurl': 'https://test.domain/'}
                  ],
                  'unit_id': 1234,
                  'site_id': 123
                }
              }
            ],
            'cpm': 0.01,
            'currency': 'USD',
            'netRevenue': true
          }
      },
      headers: {}
    };

    it('result is correct', function () {
      const result = spec.interpretResponse(bidResponse, bidRequest);
      expect(result[0].requestId).to.equal('2bdcb0b203c17d');
      expect(result[0].cpm).to.equal(0.01);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].creativeId).to.equal('8:123456');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].ttl).to.equal(60);
      expect(result[0].meta.advertiserDomains).to.deep.equal(['test.domain']);
      expect(result[0].winNotification[0]).to.deep.equal({'method': 'POST', 'path': '/hb/bid_won?test=1', 'data': {'ad': [{'dsp': 8, 'id': 800008, 'cost': 1.0e-5, 'nurl': 'https://test.domain/'}], 'unit_id': 1234, 'site_id': 123}});
    });
  });

  describe('adResponse', function () {
    const bid = {
      'unitId': 13144370,
      'adUnitCode': 'div-gpt-ad-1460505748561-0',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '2bdcb0b203c17d',
      'referer': 'https://test.domain/index.html'
    };
    const ad = {
      'ad': '<div>ad</div>',
      'width': 300,
      'height': 250,
      'creativeId': '8:123456',
      'syncs': [],
      'winNotification': [],
      'cpm': 0.01,
      'currency': 'USD',
      'netRevenue': true,
      'adomain': [
        'test.domain'
      ],
    };

    it('fill ad for response', function () {
      const result = spec.adResponse(bid, ad);
      expect(result.requestId).to.equal('2bdcb0b203c17d');
      expect(result.cpm).to.equal(0.01);
      expect(result.width).to.equal(300);
      expect(result.height).to.equal(250);
      expect(result.creativeId).to.equal('8:123456');
      expect(result.currency).to.equal('USD');
      expect(result.ttl).to.equal(60);
      expect(result.meta.advertiserDomains).to.deep.equal(['test.domain']);
    });
  });

  describe('onBidWon', function () {
    const bid = {
      winNotification: [
        {
          'method': 'POST',
          'path': '/hb/bid_won?test=1',
          'data': {
            'ad': [
              {'dsp': 8, 'id': 800008, 'cost': 0.01, 'nurl': 'http://test.domain/'}
            ],
            'unit_id': 1234,
            'site_id': 123
          }
        }
      ]
    };

    let ajaxStub;

    beforeEach(() => {
      ajaxStub = sinon.stub(spec, 'postRequest')
    })

    afterEach(() => {
      ajaxStub.restore()
    })

    it('calls adpartner\'s callback endpoint', () => {
      const result = spec.onBidWon(bid);
      expect(result).to.equal(true);
      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(ENDPOINT_PROTOCOL + '://' + ENDPOINT_DOMAIN + '/hb/bid_won?test=1');
      expect(ajaxStub.firstCall.args[1]).to.deep.equal(JSON.stringify(bid.winNotification[0].data));
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse = [{
      body: {
        'div-gpt-ad-1460505748561-0':
          {
            'ad': '<div>ad</div>',
            'width': 300,
            'height': 250,
            'creativeId': '8:123456',
            'adomain': [
              'test.domain'
            ],
            'syncs': [
              {'type': 'image', 'link': 'https://test.domain/tracker_1.gif'},
              {'type': 'image', 'link': 'https://test.domain/tracker_2.gif'},
              {'type': 'image', 'link': 'https://test.domain/tracker_3.gif'}
            ],
            'winNotification': [
              {
                'method': 'POST',
                'path': '/hb/bid_won?test=1',
                'data': {
                  'ad': [
                    {'dsp': 8, 'id': 800008, 'cost': 1.0e-5, 'nurl': 'https://test.domain/'}
                  ],
                  'unit_id': 1234,
                  'site_id': 123
                }
              }
            ],
            'cpm': 0.01,
            'currency': 'USD',
            'netRevenue': true
          }
      },
      headers: {}
    }];

    it('should return nothing when sync is disabled', function () {
      const syncOptions = {
        'iframeEnabled': false,
        'pixelEnabled': false
      };

      let syncs = spec.getUserSyncs(syncOptions);
      expect(syncs).to.deep.equal([]);
    });

    it('should register image sync when only image is enabled where gdprConsent is undefined', function () {
      const syncOptions = {
        'iframeEnabled': false,
        'pixelEnabled': true
      };

      const gdprConsent = undefined;
      let syncs = spec.getUserSyncs(syncOptions, bidResponse, gdprConsent);
      expect(syncs.length).to.equal(3);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://test.domain/tracker_1.gif');
    });

    it('should register image sync when only image is enabled where gdprConsent is defined', function () {
      const syncOptions = {
        'iframeEnabled': false,
        'pixelEnabled': true
      };
      const gdprConsent = {
        consentString: 'someString',
        vendorData: {},
        gdprApplies: true,
        apiVersion: 2
      };

      let syncs = spec.getUserSyncs(syncOptions, bidResponse, gdprConsent);
      expect(syncs.length).to.equal(3);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('https://test.domain/tracker_1.gif?gdpr=1&gdpr_consent=someString');
    });
  });
});
