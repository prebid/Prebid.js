import { expect } from 'chai';
import { spec } from 'modules/radsBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const RADS_ENDPOINT_URL = 'https://rads.recognified.net/md.request.php';

describe('radsAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'rads',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop',
        'ip': '1.1.1.1'
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'someIncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [{
      'bidder': 'rads',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000,
          'geo': {
            'country': 'DE'
          }
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop',
        'ip': '1.1.1.1'
      },
      'sizes': [
        [300, 250]
      ],
      'mediaTypes': {
        'video': {
          'playerSize': [640, 480],
          'context': 'instream'
        },
        'banner': {
          'sizes': [
            [100, 100], [400, 400], [500, 500]
          ]
        }
      },
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'userId': {
        'netId': '123',
        'uid2': '456'
      }
    }, {
      'bidder': 'rads',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000,
          'geo': {
            'country': 'DE',
            'region': 'DE-BE'
          },
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
      },
      'mediaTypes': {
        'video': {
          'playerSize': [[640, 480], [500, 500], [600, 600]],
          'context': 'instream'
        }
      },
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];

    // Without gdprConsent
    let bidderRequest = {
      refererInfo: {
        referer: 'some_referrer.net'
      }
    }
    // With gdprConsent
    var bidderRequestGdprConsent = {
      refererInfo: {
        referer: 'some_referrer.net'
      },
      gdprConsent: {
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        vendorData: {someData: 'value'},
        gdprApplies: true
      }
    };

    // without gdprConsent
    const request = spec.buildRequests(bidRequests, bidderRequest);
    it('sends bid request to our endpoint via GET', function () {
      expect(request[0].method).to.equal('GET');
      let data = request[0].data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid');
      expect(data).to.equal('_f=prebid_js&_ps=6682&idt=100&p=some_referrer.net&bid_id=30b31c1838de1e&rt=bid-response&srw=100&srh=100&alt_ad_sizes%5B0%5D=400x400&alt_ad_sizes%5B1%5D=500x500&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bgeo%5D%5Bcountry%5D=DE&bcat=IAB2%2CIAB4&dvt=desktop&i=1.1.1.1&did_netid=123&did_uid2=456');
    });

    it('sends bid video request to our rads endpoint via GET', function () {
      expect(request[1].method).to.equal('GET');
      let data = request[1].data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid');
      expect(data).to.equal('_f=prebid_js&_ps=6682&idt=100&p=some_referrer.net&bid_id=30b31c1838de1e&rt=vast2&srw=640&srh=480&alt_ad_sizes%5B0%5D=500x500&alt_ad_sizes%5B1%5D=600x600&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bgeo%5D%5Bcountry%5D=DE&pfilter%5Bgeo%5D%5Bregion%5D=DE-BE&bcat=IAB2%2CIAB4&dvt=desktop');
    });

    // with gdprConsent
    const request2 = spec.buildRequests(bidRequests, bidderRequestGdprConsent);
    it('sends bid request to our endpoint via GET', function () {
      expect(request2[0].method).to.equal('GET');
      let data = request2[0].data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid');
      expect(data).to.equal('_f=prebid_js&_ps=6682&idt=100&p=some_referrer.net&bid_id=30b31c1838de1e&rt=bid-response&srw=100&srh=100&alt_ad_sizes%5B0%5D=400x400&alt_ad_sizes%5B1%5D=500x500&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bgeo%5D%5Bcountry%5D=DE&pfilter%5Bgdpr_consent%5D=BOJ%2FP2HOJ%2FP2HABABMAAAAAZ%2BA%3D%3D&pfilter%5Bgdpr%5D=true&bcat=IAB2%2CIAB4&dvt=desktop&i=1.1.1.1&did_netid=123&did_uid2=456');
    });

    it('sends bid video request to our rads endpoint via GET', function () {
      expect(request2[1].method).to.equal('GET');
      let data = request2[1].data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid');
      expect(data).to.equal('_f=prebid_js&_ps=6682&idt=100&p=some_referrer.net&bid_id=30b31c1838de1e&rt=vast2&srw=640&srh=480&alt_ad_sizes%5B0%5D=500x500&alt_ad_sizes%5B1%5D=600x600&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bgeo%5D%5Bcountry%5D=DE&pfilter%5Bgeo%5D%5Bregion%5D=DE-BE&pfilter%5Bgdpr_consent%5D=BOJ%2FP2HOJ%2FP2HABABMAAAAAZ%2BA%3D%3D&pfilter%5Bgdpr%5D=true&bcat=IAB2%2CIAB4&dvt=desktop');
    });
  });

  describe('interpretResponse', function () {
    let serverBannerResponse = {
      'body': {
        'cpm': 5000000,
        'crid': 100500,
        'width': '300',
        'height': '250',
        'adTag': '<!-- test creative -->',
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
      ad: '<!-- test creative -->',
      meta: {advertiserDomains: ['bdomain']}
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
      vastXml: '{"reason":7001,"status":"accepted"}',
      mediaType: 'video',
      meta: {advertiserDomains: []}
    }];

    it('should get the correct bid response by display ad', function () {
      let bidRequest = [{
        'method': 'GET',
        'url': RADS_ENDPOINT_URL,
        'refererInfo': {
          'referer': ''
        },
        'data': {
          'bid_id': '30b31c1838de1e'
        }
      }];
      let result = spec.interpretResponse(serverBannerResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(result[0].meta.advertiserDomains.length).to.equal(1);
      expect(result[0].meta.advertiserDomains[0]).to.equal(expectedResponse[0].meta.advertiserDomains[0]);
    });

    it('should get the correct rads video bid response by display ad', function () {
      let bidRequest = [{
        'method': 'GET',
        'url': RADS_ENDPOINT_URL,
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

    it('handles empty bid response', function () {
      let response = {
        body: {}
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe(`getUserSyncs test usage`, function () {
    let serverResponses;

    beforeEach(function () {
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

    it(`return value should be an array`, function () {
      expect(spec.getUserSyncs({ iframeEnabled: true })).to.be.an('array');
    });
    it(`array should have only one object and it should have a property type = 'iframe'`, function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, serverResponses).length).to.be.equal(1);
      let [userSync] = spec.getUserSyncs({ iframeEnabled: true }, serverResponses);
      expect(userSync).to.have.property('type');
      expect(userSync.type).to.be.equal('iframe');
    });
    it(`we have valid sync url for iframe`, function () {
      let [userSync] = spec.getUserSyncs({ iframeEnabled: true }, serverResponses, {consentString: 'anyString'});
      expect(userSync.url).to.be.equal('anyIframeUrl?a=1&gdpr_consent=anyString')
      expect(userSync.type).to.be.equal('iframe');
    });
    it(`we have valid sync url for image`, function () {
      let [userSync] = spec.getUserSyncs({ pixelEnabled: true }, serverResponses, {gdprApplies: true, consentString: 'anyString'});
      expect(userSync.url).to.be.equal('anyImageUrl?gdpr=1&gdpr_consent=anyString')
      expect(userSync.type).to.be.equal('image');
    });
    it(`we have valid sync url for image and iframe`, function () {
      let userSync = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses, {gdprApplies: true, consentString: 'anyString'});
      expect(userSync.length).to.be.equal(3);
      expect(userSync[0].url).to.be.equal('anyIframeUrl?a=1&gdpr=1&gdpr_consent=anyString')
      expect(userSync[0].type).to.be.equal('iframe');
      expect(userSync[1].url).to.be.equal('anyImageUrl?gdpr=1&gdpr_consent=anyString')
      expect(userSync[1].type).to.be.equal('image');
      expect(userSync[2].url).to.be.equal('anyImageUrl2?gdpr=1&gdpr_consent=anyString')
      expect(userSync[2].type).to.be.equal('image');
    });
  });

  describe(`getUserSyncs test usage passback response`, function () {
    let serverResponses;

    beforeEach(function () {
      serverResponses = [{
        body: {
          reason: 8002,
          status: 'rejected',
          msg: 'passback',
          bid_id: '115de76437d5ae6',
          'zone': '4773',
        }
      }];
    });

    it(`check for zero array when iframeEnabled`, function () {
      expect(spec.getUserSyncs({ iframeEnabled: true })).to.be.an('array');
      expect(spec.getUserSyncs({ iframeEnabled: true }, serverResponses).length).to.be.equal(0);
    });
    it(`check for zero array when iframeEnabled`, function () {
      expect(spec.getUserSyncs({ pixelEnabled: true })).to.be.an('array');
      expect(spec.getUserSyncs({ pixelEnabled: true }, serverResponses).length).to.be.equal(0);
    });
  });
});
