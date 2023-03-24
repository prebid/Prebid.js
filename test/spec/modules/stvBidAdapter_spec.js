import { expect } from 'chai';
import { spec } from 'modules/stvBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const ENDPOINT_URL = 'https://ads.smartstream.tv/r/';
const ENDPOINT_URL_DEV = 'https://ads.smartstream.tv/r/';

describe('stvAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function() {
    let bid = {
      'bidder': 'stv',
      'params': {
        'placement': '6682',
        'floorprice': 1000000,
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'someIncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    let bidRequests = [
      // banner
      {
        'bidder': 'stv',
        'params': {
          'placement': '6682',
          'floorprice': 1000000,
          'geo': {
            'country': 'DE'
          },
          'bcat': 'IAB2,IAB4',
          'dvt': 'desktop'
        },
        'sizes': [
          [300, 250]
        ],
        'bidId': '30b31c1838de1e1',
        'bidderRequestId': '22edbae2733bf61',
        'auctionId': '1d1a030790a475',
        'adUnitCode': 'testDiv1',
      },
      {
        'bidder': 'stv',
        'params': {
          'placement': '101',
          'devMode': true
        },
        'sizes': [
          [300, 250]
        ],
        'bidId': '30b31c1838de1e2',
        'bidderRequestId': '22edbae2733bf62',
        'auctionId': '1d1a030790a476'
      }, {
        'bidder': 'stv',
        'params': {
          'placement': '6682',
          'floorprice': 1000000,
          'geo': {
            'country': 'DE'
          },
          'bcat': 'IAB2,IAB4',
          'dvt': 'desktop'
        },
        'sizes': [
          [300, 250]
        ],
        'bidId': '30b31c1838de1e3',
        'bidderRequestId': '22edbae2733bf69',
        'auctionId': '1d1a030790a477',
        'adUnitCode': 'testDiv2'
      },
      // video
      {
        'bidder': 'stv',
        'params': {
          'placement': '101',
          'devMode': true,
          'max_duration': 20,
        },
        'mediaTypes': {
          'video': {
            'playerSize': [640, 480],
            'context': 'instream'
          },
        },

        'bidId': '30b31c1838de1e4',
        'bidderRequestId': '22edbae2733bf67',
        'auctionId': '1d1a030790a478',
        'adUnitCode': 'testDiv3'
      },
      {
        'bidder': 'stv',
        'params': {
          'placement': '101',
          'devMode': true,
        },
        'mediaTypes': {
          'video': {
            'playerSize': [640, 480],
            'context': 'instream',
            'maxduration': 40,
          }
        },
        'bidId': '30b31c1838de1e41',
        'bidderRequestId': '22edbae2733bf67',
        'auctionId': '1d1a030790a478',
        'adUnitCode': 'testDiv4'
      },
      {
        'bidder': 'stv',
        'params': {
          'placement': '101',
          'devMode': true,
          'max_duration': 20,
        },
        'mediaTypes': {
          'video': {
            'playerSize': [640, 480],
            'context': 'instream',
            'maxduration': 40,
          }
        },
        'bidId': '30b31c1838de1e41',
        'bidderRequestId': '22edbae2733bf67',
        'auctionId': '1d1a030790a478',
        'adUnitCode': 'testDiv4'
      }

    ];

    // With gdprConsent
    var bidderRequest = {
      refererInfo: {
        referer: 'some_referrer.net'
      },
      gdprConsent: {
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        vendorData: { someData: 'value' },
        gdprApplies: true
      }
    };

    var request1 = spec.buildRequests([bidRequests[0]], bidderRequest)[0];
    it('sends bid request 1 to our endpoint via GET', function() {
      expect(request1.method).to.equal('GET');
      expect(request1.url).to.equal(ENDPOINT_URL);
      let data = request1.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=html&alternative=prebid_js&_ps=6682&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e1&pbver=test&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bgeo%5D%5Bcountry%5D=DE&gdpr_consent=BOJ%2FP2HOJ%2FP2HABABMAAAAAZ%2BA%3D%3D&gdpr=true&bcat=IAB2%2CIAB4&dvt=desktop&pbcode=testDiv1&media_types%5Bbanner%5D=300x250');
    });

    var request2 = spec.buildRequests([bidRequests[1]], bidderRequest)[0];
    it('sends bid request 2 endpoint via GET', function() {
      expect(request2.method).to.equal('GET');
      expect(request2.url).to.equal(ENDPOINT_URL);
      let data = request2.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=html&alternative=prebid_js&_ps=101&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e2&pbver=test&gdpr_consent=BOJ%2FP2HOJ%2FP2HABABMAAAAAZ%2BA%3D%3D&gdpr=true&prebidDevMode=1&media_types%5Bbanner%5D=300x250');
    });

    // Without gdprConsent
    var bidderRequestWithoutGdpr = {
      refererInfo: {
        referer: 'some_referrer.net'
      }
    };
    var request3 = spec.buildRequests([bidRequests[2]], bidderRequestWithoutGdpr)[0];
    it('sends bid request 3 without gdprConsent to our endpoint via GET', function() {
      expect(request3.method).to.equal('GET');
      expect(request3.url).to.equal(ENDPOINT_URL);
      let data = request3.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=html&alternative=prebid_js&_ps=6682&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e3&pbver=test&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bgeo%5D%5Bcountry%5D=DE&bcat=IAB2%2CIAB4&dvt=desktop&pbcode=testDiv2&media_types%5Bbanner%5D=300x250');
    });

    var request4 = spec.buildRequests([bidRequests[3]], bidderRequestWithoutGdpr)[0];
    it('sends bid request 4 (video) without gdprConsent endpoint via GET', function() {
      expect(request4.method).to.equal('GET');
      expect(request4.url).to.equal(ENDPOINT_URL);
      let data = request4.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=vast2&alternative=prebid_js&_ps=101&srw=640&srh=480&idt=100&bid_id=30b31c1838de1e4&pbver=test&pfilter%5Bmax_duration%5D=20&prebidDevMode=1&pbcode=testDiv3&media_types%5Bvideo%5D=640x480');
    });

    var request5 = spec.buildRequests([bidRequests[4]], bidderRequestWithoutGdpr)[0];
    it('sends bid request 5 (video) to our endpoint via GET', function() {
      expect(request5.method).to.equal('GET');
      expect(request5.url).to.equal(ENDPOINT_URL);
      let data = request5.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=vast2&alternative=prebid_js&_ps=101&srw=640&srh=480&idt=100&bid_id=30b31c1838de1e41&pbver=test&pfilter%5Bmax_duration%5D=40&prebidDevMode=1&pbcode=testDiv4&media_types%5Bvideo%5D=640x480');
    });

    var request6 = spec.buildRequests([bidRequests[5]], bidderRequestWithoutGdpr)[0];
    it('sends bid request 6 (video) to our endpoint via GET', function() {
      expect(request6.method).to.equal('GET');
      expect(request6.url).to.equal(ENDPOINT_URL);
      let data = request6.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=vast2&alternative=prebid_js&_ps=101&srw=640&srh=480&idt=100&bid_id=30b31c1838de1e41&pbver=test&pfilter%5Bmax_duration%5D=20&prebidDevMode=1&pbcode=testDiv4&media_types%5Bvideo%5D=640x480');
    });
  });

  describe('interpretResponse', function() {
    let serverResponse = {
      'body': {
        'cpm': 5000000,
        'crid': 100500,
        'width': '300',
        'height': '250',
        'type': 'sspHTML',
        'tag': '<!-- test creative -->',
        'requestId': '220ed41385952a',
        'currency': 'EUR',
        'ttl': 60,
        'netRevenue': true,
        'zone': '6682',
        'adomain': ['bdomain']
      }
    };
    let serverVideoResponse = {
      'body': {
        'cpm': 5000000,
        'crid': 100500,
        'width': '300',
        'height': '250',
        'vastXml': '{"reason":7001,"status":"accepted"}',
        'requestId': '220ed41385952a',
        'type': 'vast2',
        'currency': 'EUR',
        'ttl': 60,
        'netRevenue': true,
        'zone': '6682'
      }
    };

    let expectedResponse = [{
      requestId: '23beaa6af6cdde',
      cpm: 0.5,
      width: 0,
      height: 0,
      creativeId: 100500,
      dealId: '',
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      meta: { advertiserDomains: ['bdomain'] },
      ad: '<!-- test creative -->',
    }, {
      requestId: '23beaa6af6cdde',
      cpm: 0.5,
      width: 0,
      height: 0,
      creativeId: 100500,
      dealId: '',
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      meta: { advertiserDomains: [] },
      vastXml: '{"reason":7001,"status":"accepted"}',
      mediaType: 'video',
    }];

    it('should get the correct bid response by display ad', function() {
      let bidRequest = [{
        'method': 'GET',
        'url': ENDPOINT_URL,
        'data': {
          'bid_id': '30b31c1838de1e'
        }
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(result[0].meta.advertiserDomains.length).to.equal(1);
      expect(result[0].meta.advertiserDomains[0]).to.equal(expectedResponse[0].meta.advertiserDomains[0]);
    });

    it('should get the correct smartstream video bid response by display ad', function() {
      let bidRequest = [{
        'method': 'GET',
        'url': ENDPOINT_URL,
        'mediaTypes': {
          'video': {
            'playerSize': [640, 480],
            'context': 'instream'
          }
        },
        'data': {
          'bid_id': '30b31c1838de1e'
        }
      }];
      let result = spec.interpretResponse(serverVideoResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[1]));
      expect(result[0].meta.advertiserDomains.length).to.equal(0);
    });

    it('handles empty bid response', function() {
      let response = {
        body: {}
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe(`getUserSyncs test usage`, function() {
    let serverResponses;

    beforeEach(function() {
      serverResponses = [{
        body: {
          requestId: '23beaa6af6cdde',
          cpm: 0.5,
          width: 0,
          height: 0,
          creativeId: 100500,
          dealId: '',
          currency: 'EUR',
          netRevenue: true,
          ttl: 300,
          type: 'sspHTML',
          ad: '<!-- test creative -->',
          userSync: {
            iframeUrl: ['anyIframeUrl?a=1'],
            imageUrl: ['anyImageUrl', 'anyImageUrl2']
          }
        }
      }];
    });

    it(`return value should be an array`, function() {
      expect(spec.getUserSyncs({ iframeEnabled: true })).to.be.an('array');
    });
    it(`array should have only one object and it should have a property type = 'iframe'`, function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, serverResponses).length).to.be.equal(1);
      let [userSync] = spec.getUserSyncs({ iframeEnabled: true }, serverResponses);
      expect(userSync).to.have.property('type');
      expect(userSync.type).to.be.equal('iframe');
    });
    it(`we have valid sync url for iframe`, function() {
      let [userSync] = spec.getUserSyncs({ iframeEnabled: true }, serverResponses, { consentString: 'anyString' });
      expect(userSync.url).to.be.equal('anyIframeUrl?a=1&gdpr_consent=anyString')
      expect(userSync.type).to.be.equal('iframe');
    });
    it(`we have valid sync url for image`, function() {
      let [userSync] = spec.getUserSyncs({ pixelEnabled: true }, serverResponses, { gdprApplies: true, consentString: 'anyString' });
      expect(userSync.url).to.be.equal('anyImageUrl?gdpr=1&gdpr_consent=anyString')
      expect(userSync.type).to.be.equal('image');
    });
    it(`we have valid sync url for image and iframe`, function() {
      let userSync = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses, { gdprApplies: true, consentString: 'anyString' });
      expect(userSync.length).to.be.equal(3);
      expect(userSync[0].url).to.be.equal('anyIframeUrl?a=1&gdpr=1&gdpr_consent=anyString')
      expect(userSync[0].type).to.be.equal('iframe');
      expect(userSync[1].url).to.be.equal('anyImageUrl?gdpr=1&gdpr_consent=anyString')
      expect(userSync[1].type).to.be.equal('image');
      expect(userSync[2].url).to.be.equal('anyImageUrl2?gdpr=1&gdpr_consent=anyString')
      expect(userSync[2].type).to.be.equal('image');
    });
  });

  describe(`getUserSyncs test usage in passback response`, function() {
    let serverResponses;

    beforeEach(function() {
      serverResponses = [{
        body: {
          reason: 8002,
          status: 'error',
          msg: 'passback',
        }
      }];
    });

    it(`check for zero array when iframeEnabled`, function() {
      expect(spec.getUserSyncs({ iframeEnabled: true })).to.be.an('array');
      expect(spec.getUserSyncs({ iframeEnabled: true }, serverResponses).length).to.be.equal(0);
    });
    it(`check for zero array when iframeEnabled`, function() {
      expect(spec.getUserSyncs({ pixelEnabled: true })).to.be.an('array');
      expect(spec.getUserSyncs({ pixelEnabled: true }, serverResponses).length).to.be.equal(0);
    });
  });
});
