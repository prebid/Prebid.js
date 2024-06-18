import { expect } from 'chai';
import { spec, resetSync } from 'modules/optidigitalBidAdapter.js';
import * as utils from 'src/utils.js';

const ENDPOINT = 'https://pbs.optidigital.com/bidder';

describe('optidigitalAdapterTests', function () {
  describe('isBidRequestValid', function () {
    it('bidRequest with publisherId and placementId', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optidigital',
        params: {
          publisherId: 's123',
          placementId: 'Billboard_Top'
        }
      })).to.equal(true);
    });
    it('bidRequest without publisherId', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optidigital',
        params: {
          placementId: 'Billboard_Top'
        }
      })).to.equal(false);
    });
    it('bidRequest without placementId', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optidigital',
        params: {
          publisherId: 's123'
        }
      })).to.equal(false);
    });
    it('bidRequest without required parameters', function () {
      expect(spec.isBidRequestValid({
        bidder: 'optidigital',
        params: {}
      })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidderRequest = {
      bids: [
        {
          'bidder': 'optidigital',
          'params': {
            'publisherId': 's123',
            'placementId': 'Billboard_Top',
            'divId': 'Billboard_Top_3c5425',
            'badv': ['example.com'],
            'bcat': ['IAB1-1'],
            'bapp': ['com.blocked'],
            'battr': [1, 2]
          },
          'crumbs': {
            'pubcid': '7769fd03-574c-48fe-b512-8147f7c4023a'
          },
          'ortb2Imp': {
            'ext': {
              'tid': '0cb56262-9637-474d-a572-86fa860fd8b7',
              'data': {
                'adserver': {
                  'name': 'gam',
                  'adslot': '/19968336/header-bid-tag-0'
                },
                'pbadslot': '/19968336/header-bid-tag-0'
              },
              'gpid': '/19968336/header-bid-tag-0'
            }
          },
          'mediaTypes': {
            'banner': {
              'sizes': [ [ 300, 250 ], [ 300, 600 ] ]
            }
          },
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'transactionId': '0cb56262-9637-474d-a572-86fa860fd8b7',
          'sizes': [ [ 300, 250 ], [ 300, 600 ] ],
          'bidId': '245d89f17f289f',
          'bidderRequestId': '199d7ffafa1e91',
          'auctionId': 'b66f01cd-3441-4403-99fa-d8062e795933',
          'src': 'client',
          'metrics': {
            'requestBids.usp': 0.5,
            'requestBids.pubCommonId': 0.29999999701976776,
            'requestBids.fpd': 3.1000000089406967,
            'requestBids.validate': 0.5,
            'requestBids.makeRequests': 2.2000000029802322,
            'requestBids.total': 570,
            'requestBids.callBids': 320.5,
            'adapter.client.net': [
              317.30000001192093
            ],
            'adapters.client.optidigital.net': [
              317.30000001192093
            ],
            'adapter.client.interpretResponse': [
              0
            ],
            'adapters.client.optidigital.interpretResponse': [
              0
            ],
            'adapter.client.validate': 0,
            'adapters.client.optidigital.validate': 0,
            'adapter.client.buildRequests': 1,
            'adapters.client.optidigital.buildRequests': 1,
            'adapter.client.total': 318.59999999403954,
            'adapters.client.optidigital.total': 318.59999999403954
          },
          'bidRequestsCount': 1,
          'bidderRequestsCount': 1,
          'bidderWinsCount': 0,
          'ortb2': {
            'site': {
              'page': 'https://example.com',
              'ref': 'https://example.com',
              'domain': 'example.com',
              'publisher': {
                'domain': 'example.com'
              }
            },
            'device': {
              'w': 1605,
              'h': 1329,
              'dnt': 0,
              'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
              'language': 'pl',
              'sua': {
                'source': 2,
                'platform': {
                  'brand': 'Windows',
                  'version': [
                    '10',
                    '0',
                    '0'
                  ]
                },
                'browsers': [
                  {
                    'brand': 'Not_A Brand',
                    'version': [
                      '99',
                      '0',
                      '0',
                      '0'
                    ]
                  },
                  {
                    'brand': 'Google Chrome',
                    'version': [
                      '109',
                      '0',
                      '5414',
                      '75'
                    ]
                  },
                  {
                    'brand': 'Chromium',
                    'version': [
                      '109',
                      '0',
                      '5414',
                      '75'
                    ]
                  }
                ],
                'mobile': 0,
                'model': '',
                'bitness': '64',
                'architecture': 'x86'
              }
            }
          }
        }
      ],
      'refererInfo': {
        'canonicalUrl': 'https://www.prebid.org/the/link/to/the/page'
      }
    };

    let validBidRequests = [
      {
        'bidder': 'optidigital',
        'bidId': '51ef8751f9aead',
        'params': {
          'publisherId': 's123',
          'placementId': 'Billboard_Top',
          'badv': ['example.com'],
          'bcat': ['IAB1-1'],
          'bapp': ['com.blocked'],
          'battr': [1, 2]
        },
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        'sizes': [[320, 50], [300, 250], [300, 600]],
        'bidderRequestId': '418b37f85e772c',
        'auctionId': '18fd8b8b0bd757'
      }
    ]

    it('should return an empty array if there are no bid requests', () => {
      const emptyBidRequests = [];
      const request = spec.buildRequests(emptyBidRequests, emptyBidRequests);
      expect(request).to.be.an('array').that.is.empty;
    });

    it('should send bid request via POST', function() {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.method).to.equal('POST');
    });

    it('should send bid request to given endpoint', function() {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
    });

    it('should be bidRequest data', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).to.exist;
    });

    it('should add schain object to payload if exists', function () {
      const bidRequest = Object.assign({}, validBidRequests[0], {
        schain: {
          ver: '1.0',
          complete: 1,
          nodes: [{
            asi: 'examplewebsite.com',
            sid: '00001',
            hp: 1
          }]
        }
      });
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data)
      expect(payload.schain).to.exist;
      expect(payload.schain).to.deep.equal({
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'examplewebsite.com',
          sid: '00001',
          hp: 1
        }]
      });
    });

    it('should add adContainerWidth and adContainerHeight to payload if divId exsists in parameter', function () {
      let validBidRequestsWithDivId = [
        {
          'bidder': 'optidigital',
          'bidId': '51ef8751f9aead',
          'params': {
            'publisherId': 's123',
            'placementId': 'Billboard_Top',
            'divId': 'div-gpt-ad-1460505748561-0'
          },
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 50], [300, 250], [300, 600]]
            }
          },
          'sizes': [[320, 50], [300, 250], [300, 600]],
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757'
        }
      ]
      const request = spec.buildRequests(validBidRequestsWithDivId, bidderRequest);
      const payload = JSON.parse(request.data)
      payload.imp[0].adContainerWidth = 1920
      payload.imp[0].adContainerHeight = 1080
      expect(payload.imp[0].adContainerWidth).to.exist;
      expect(payload.imp[0].adContainerHeight).to.exist;
    });

    it('should add pageTemplate to payload if pageTemplate exsists in parameter', function () {
      let validBidRequestsWithDivId = [
        {
          'bidder': 'optidigital',
          'bidId': '51ef8751f9aead',
          'params': {
            'publisherId': 's123',
            'placementId': 'Billboard_Top',
            'pageTemplate': 'home'
          },
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 50], [300, 250], [300, 600]]
            }
          },
          'sizes': [[320, 50], [300, 250], [300, 600]],
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757'
        }
      ]
      const request = spec.buildRequests(validBidRequestsWithDivId, bidderRequest);
      const payload = JSON.parse(request.data)
      payload.imp[0].pageTemplate = 'home'
      expect(payload.imp[0].pageTemplate).to.exist;
    });

    it('should add referrer to payload if it exsists in bidderRequest', function () {
      bidderRequest.refererInfo.page = 'https://www.prebid.org';
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data)
      expect(payload.referrer).to.equal('https://www.prebid.org');
    });

    it('should use value for badv, bcat, bapp from params', function () {
      bidderRequest.ortb2 = {
        'site': {
          'page': 'https://example.com',
          'ref': 'https://example.com',
          'domain': 'example.com',
          'publisher': {
            'domain': 'example.com'
          }
        },
        'device': {
          'w': 1507,
          'h': 1329,
          'dnt': 0,
          'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
          'language': 'pl',
          'sua': {
            'source': 2,
            'platform': {
              'brand': 'Windows',
              'version': [
                '10',
                '0',
                '0'
              ]
            },
            'browsers': [
              {
                'brand': 'Not_A Brand',
                'version': [
                  '99',
                  '0',
                  '0',
                  '0'
                ]
              },
              {
                'brand': 'Google Chrome',
                'version': [
                  '109',
                  '0',
                  '5414',
                  '120'
                ]
              },
              {
                'brand': 'Chromium',
                'version': [
                  '109',
                  '0',
                  '5414',
                  '120'
                ]
              }
            ],
            'mobile': 0,
            'model': '',
            'bitness': '64',
            'architecture': 'x86'
          }
        }
      };
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.badv).to.deep.equal(validBidRequests[0].params.badv);
      expect(payload.bcat).to.deep.equal(validBidRequests[0].params.bcat);
      expect(payload.bapp).to.deep.equal(validBidRequests[0].params.bapp);
    });

    it('should send empty GDPR consent and required set to false', function() {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.gdpr.consent).to.equal('');
      expect(payload.gdpr.required).to.equal(false);
    });

    it('should send GDPR to given endpoint', function() {
      let consentString = 'DFR8KRePoQNsRREZCADBG+A==';
      bidderRequest.gdprConsent = {
        'consentString': consentString,
        'gdprApplies': true,
        'vendorData': {
          'hasGlobalConsent': false
        },
        'apiVersion': 1
      }
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consent).to.equal(consentString);
      expect(payload.gdpr.required).to.exist.and.to.be.true;
    });

    it('should send empty GDPR consent to endpoint', function() {
      let consentString = false;
      bidderRequest.gdprConsent = {
        'consentString': consentString,
        'gdprApplies': true,
        'vendorData': {
          'hasGlobalConsent': false
        },
        'apiVersion': 1
      }
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.gdpr.consent).to.equal('');
    });

    it('should send uspConsent to given endpoint', function() {
      bidderRequest.uspConsent = '1YYY';
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.us_privacy).to.exist;
    });

    it('should send gppConsent to given endpoint where there is gppConsent', function() {
      let consentString = 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==';
      bidderRequest.gppConsent = {
        'gppString': consentString,
        'applicableSections': [7]
      };
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.gpp).to.exist;
    });

    it('should send gppConsent to given endpoint when there is gpp in ortb2', function() {
      let consentString = 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==';
      bidderRequest.gppConsent = undefined;
      bidderRequest.ortb2 = {
        regs: {
          gpp: consentString,
          gpp_sid: [7]
        }
      }
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.gpp).to.exist;
    });

    it('should use appropriate mediaTypes banner sizes', function() {
      const mediaTypesBannerSize = {
        'mediaTypes': {
          'banner': {
            'sizes': [300, 600]
          }
        }
      };
      returnBannerSizes(mediaTypesBannerSize, '300x600');
    });

    it('should use appropriate mediaTypes banner sizes as array', function() {
      const mediaTypesBannerSize = {
        'mediaTypes': {
          'banner': {
            'sizes': [300, 600]
          }
        }
      };
      returnBannerSizes(mediaTypesBannerSize, ['300x600']);
    });

    it('should fetch floor from floor module if it is available', function() {
      let validBidRequestsWithCurrency = [
        {
          'bidder': 'optidigital',
          'bidId': '51ef8751f9aead',
          'params': {
            'publisherId': 's123',
            'placementId': 'Billboard_Top',
            'pageTemplate': 'home',
            'currency': 'USD'
          },
          'adUnitCode': 'div-gpt-ad-1460505748561-0',
          'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
          'mediaTypes': {
            'banner': {
              'sizes': [[300, 50], [300, 250], [300, 600]]
            }
          },
          'sizes': [[320, 50], [300, 250], [300, 600]],
          'bidderRequestId': '418b37f85e772c',
          'auctionId': '18fd8b8b0bd757'
        }
      ]
      let floorInfo;
      validBidRequestsWithCurrency[0].getFloor = () => floorInfo;
      floorInfo = { currency: 'USD', floor: 1.99 };
      let request = spec.buildRequests(validBidRequestsWithCurrency, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.imp[0].bidFloor).to.exist;
    });

    it('should add userEids to payload', function() {
      const userIdAsEids = [{
        source: 'pubcid.org',
        uids: [{
          id: '121213434342343',
          atype: 1
        }]
      }];
      validBidRequests[0].userIdAsEids = userIdAsEids;
      bidderRequest.userIdAsEids = userIdAsEids;
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user.eids).to.deep.equal(userIdAsEids);
    });

    it('should not add userIdAsEids to payload when userIdAsEids is not present', function() {
      validBidRequests[0].userIdAsEids = undefined;
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.user).to.deep.equal(undefined);
    });

    function returnBannerSizes(mediaTypes, expectedSizes) {
      const bidRequest = Object.assign(validBidRequests[0], mediaTypes);
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);
      return payload.imp.forEach(bid => {
        if (Array.isArray(expectedSizes)) {
          expect(JSON.stringify(bid.sizes)).to.equal(JSON.stringify(expectedSizes));
        } else {
          expect(bid.sizes[0]).to.equal(expectedSizes);
        }
      });
    }
  });
  describe('getUserSyncs', function() {
    const syncurlIframe = 'https://scripts.opti-digital.com/js/presync.html?endpoint=optidigital';
    let test;
    beforeEach(function () {
      test = sinon.sandbox.create();
      resetSync();
    });
    afterEach(function() {
      test.restore();
    });

    it('should be executed as in config', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, undefined, undefined)).to.deep.equal([{
        type: 'iframe', url: syncurlIframe
      }]);
    });

    it('should return appropriate URL with GDPR equals to 1 and GDPR consent', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, undefined)).to.deep.equal([{
        type: 'iframe', url: `${syncurlIframe}&gdpr=1&gdpr_consent=foo`
      }]);
    });
    it('should return appropriate URL with GDPR equals to 0 and GDPR consent', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: false, consentString: 'foo'}, undefined)).to.deep.equal([{
        type: 'iframe', url: `${syncurlIframe}&gdpr=0&gdpr_consent=foo`
      }]);
    });
    it('should return appropriate URL with GDPR equals to 1 and no consent', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: true, consentString: undefined}, undefined)).to.deep.equal([{
        type: 'iframe', url: `${syncurlIframe}&gdpr=1&gdpr_consent=`
      }]);
    });
    it('should return appropriate URL with GDPR equals to 1, GDPR consent and US Privacy consent', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, 'fooUsp')).to.deep.equal([{
        type: 'iframe', url: `${syncurlIframe}&gdpr=1&gdpr_consent=foo&us_privacy=fooUsp`
      }]);
    });
    it('should return appropriate URL with GDPR equals to 1, GDPR consent, US Privacy consent and GPP consent', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: true, consentString: 'foo'}, 'fooUsp', {gppString: 'fooGpp', applicableSections: [7]})).to.deep.equal([{
        type: 'iframe', url: `${syncurlIframe}&gdpr=1&gdpr_consent=foo&us_privacy=fooUsp&gpp=fooGpp&gpp_sid=7`
      }]);
    });
  });
  describe('interpretResponse', function () {
    it('should get bids', function() {
      let bids = {
        'body': {
          'bids': [{
            'transactionId': 'cf5faec3-fcee-4f26-80ae-fc8b6cf23b7d',
            'placementId': 'Billboard_Top',
            'bidId': '83fb53a5e67f49',
            'ttl': 150,
            'creativeId': 'mobile_pos_2',
            'cur': 'USD',
            'cpm': 0.445455,
            'w': '300',
            'h': '600',
            'adm': '<script type="text/javascript" id="optidigital-creative-init" config="{"adslot": "mobile_pos_2", "uuid": {"top": "https://pbs.optidigital.com/cache?uuid=9b27b430-d416-4d46-94df-0a9bc2f4e4d9", "bottom": "https://pbs.optidigital.com/cache?uuid=7c08c74a-cb8e-473a-a8b1-2e35f8479895"}}" src="https://scripts.opti-digital.com/js/odb-creative.js" async </script>',
            'adomain': ['abc']
          }, {
            'transactionId': 'df5faec3-fcee-4f26-80ae-fc8b6cf23b7d',
            'placementId': 'Billboard_Bottom',
            'bidId': '93fb53a5e67f49',
            'ttl': 150,
            'creativeId': 'mobile_pos_2',
            'cur': 'USD',
            'cpm': 0.445455,
            'w': '300',
            'h': '600',
            'adm': '<script type="text/javascript" id="optidigital-creative-init" config="{"adslot": "mobile_pos_2", "uuid": {"top": "https://pbs.optidigital.com/cache?uuid=9b27b430-d416-4d46-94df-0a9bc2f4e4d9", "bottom": "https://pbs.optidigital.com/cache?uuid=7c08c74a-cb8e-473a-a8b1-2e35f8479895"}}" src="https://scripts.opti-digital.com/js/odb-creative.js" async </script>',
            'adomain': []
          }]
        }
      };
      let expectedResponse = [
        {
          'placementId': 'Billboard_Top',
          'requestId': '83fb53a5e67f49',
          'ttl': 150,
          'creativeId': 'mobile_pos_2',
          'currency': 'USD',
          'cpm': 0.445455,
          'width': '300',
          'height': '600',
          'ad': '<script type="text/javascript" id="optidigital-creative-init" config="{"adslot": "mobile_pos_2", "uuid": {"top": "https://pbs.optidigital.com/cache?uuid=9b27b430-d416-4d46-94df-0a9bc2f4e4d9", "bottom": "https://pbs.optidigital.com/cache?uuid=7c08c74a-cb8e-473a-a8b1-2e35f8479895"}}" src="https://scripts.opti-digital.com/js/odb-creative.js" async </script>',
          'netRevenue': true,
          'meta': {
            'advertiserDomains': ['abc']
          }
        }, {
          'placementId': 'Billboard_Bottom',
          'requestId': '93fb53a5e67f49',
          'ttl': 150,
          'creativeId': 'mobile_pos_2',
          'currency': 'USD',
          'cpm': 0.445455,
          'width': '300',
          'height': '600',
          'ad': '<script type="text/javascript" id="optidigital-creative-init" config="{"adslot": "mobile_pos_2", "uuid": {"top": "https://pbs.optidigital.com/cache?uuid=9b27b430-d416-4d46-94df-0a9bc2f4e4d9", "bottom": "https://pbs.optidigital.com/cache?uuid=7c08c74a-cb8e-473a-a8b1-2e35f8479895"}}" src="https://scripts.opti-digital.com/js/odb-creative.js" async </script>',
          'netRevenue': true,
          'meta': {
            'advertiserDomains': []
          }
        }
      ];
      let result = spec.interpretResponse(bids);
      expect(result).to.eql(expectedResponse);
    });

    it('should handle empty array bid response', function() {
      let bids = {
        'body': {
          'bids': []
        }
      };
      let result = spec.interpretResponse(bids);
      expect(result.length).to.equal(0);
    });
  });
});
