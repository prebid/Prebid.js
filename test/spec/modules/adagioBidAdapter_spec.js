import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory';
import { spec } from 'modules/adagioBidAdapter';

describe('adagioAdapter', () => {
  const adapter = newBidder(spec);
  const ENDPOINT = 'https://mp.4dex.io/prebid';

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'adagio',
      'params': {
        publisher: '666',
        site: '666',
        placement: 4,
        categories: ['IAB12', 'IAB12-2']
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': 'c180kg4267tyqz',
      'bidderRequestId': '8vfscuixrovn8i',
      'auctionId': 'lel4fhp239i9km',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when publisher params is not passed', () => {
      let bidTest = Object.assign({}, bid);
      delete bidTest.params.publisher;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });

    it('should return false when site params is not passed', () => {
      let bidTest = Object.assign({}, bid);
      delete bidTest.params.site;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });

    it('should return false when placement params is not passed', () => {
      let bidTest = Object.assign({}, bid);
      delete bidTest.params.placement;
      expect(spec.isBidRequestValid(bidTest)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [
      {
        'bidder': 'adagio',
        'params': {
          publisher: '666',
          site: '666',
          placement: 4,
          pagetype: 'article',
          categories: ['IAB12']
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': 'c180kg4267tyqz',
        'bidderRequestId': '8vfscuixrovn8i',
        'auctionId': 'lel4fhp239i9km',
      }
    ];

    let consentString = 'theConsentString';
    let bidderRequest = {
      'bidderCode': 'adagio',
      'auctionId': '12jejebn',
      'bidderRequestId': 'hehehehbeheh',
      'timeout': 3000,
      'gdprConsent': {
        consentString: consentString,
        gdprApplies: true,
        allowAuctionWithoutConsent: true
      }
    };

    it('sends bid request to ENDPOINT_PB via POST', () => {
      const request = spec.buildRequests(bidRequests);
      // expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('features params must be an empty object if featurejs is not loaded', () => {
      const request = spec.buildRequests(bidRequests);
      const expected = {};
      expect(request.data.ad_units[0].params.features).to.deep.equal(expected);
    });

    it('GDPR consent is applied', () => {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.gdpr_consent).to.exist;
      expect(request.data.gdpr_consent.consentString).to.exist.and.to.equal(consentString);
      expect(request.data.gdpr_consent.consentRequired).to.exist.and.to.equal(1);
    });

    it('GDPR consent is not applied', () => {
      bidderRequest.gdprConsent.gdprApplies = false;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.gdpr_consent).to.exist;
      expect(request.data.gdpr_consent.consentString).to.exist.and.to.equal(consentString);
      expect(request.data.gdpr_consent.consentRequired).to.exist.and.to.equal(0);
    });

    it('GDPR consent is undefined', () => {
      delete bidderRequest.gdprConsent.consentString;
      delete bidderRequest.gdprConsent.gdprApplies;
      delete bidderRequest.gdprConsent.allowAuctionWithoutConsent;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.gdpr_consent).to.exist;
      expect(request.data.gdpr_consent).to.not.have.property('consentString');
      expect(request.data.gdpr_consent).to.not.have.property('gdprApplies');
      expect(request.data.gdpr_consent).to.not.have.property('allowAuctionWithoutConsent');
    });

    it('GDPR consent bidderRequest does not have gdprConsent', () => {
      delete bidderRequest.gdprConsent;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.gdpr_consent).to.exist;
      expect(request.data.gdpr_consent).to.be.empty;
    });
  });

  describe('interpretResponse', () => {
    let serverResponse = {
      body: {
        bids: [
          {
            ad: '<div style="background-color:red; height:250px; width:300px"></div>',
            cpm: 1,
            creativeId: 'creativeId',
            currency: 'EUR',
            height: 250,
            netRevenue: true,
            requestId: 'c180kg4267tyqz',
            ttl: 360,
            width: 300
          }
        ]
      }
    };

    let bidRequest = {
      'data': {
        'ad_units': [
          {
            'bidder': 'adagio',
            'params': {
              publisher: '666',
              site: '666',
              placement: 4,
              pagetype: 'article',
              categories: ['IAB12']
            },
            'adUnitCode': 'adunit-code',
            'sizes': [[300, 250], [300, 600]],
            'bidId': 'c180kg4267tyqz',
            'bidderRequestId': '8vfscuixrovn8i',
            'auctionId': 'lel4fhp239i9km',
          }
        ]
      }
    };

    it('should get correct bid response', () => {
      let expectedResponse = [{
        ad: '<div style="background-color:red; height:250px; width:300px"></div>',
        cpm: 1,
        creativeId: 'creativeId',
        currency: 'EUR',
        height: 250,
        netRevenue: true,
        requestId: 'c180kg4267tyqz',
        ttl: 360,
        width: 300,
        category: '_',
        pagetype: 'article',
        subcategory: '_',
        placement: 4,
      }];
      expect(spec.interpretResponse(serverResponse, bidRequest)).to.be.an('array');
      expect(spec.interpretResponse(serverResponse, bidRequest)).to.deep.equal(expectedResponse);
    });
  });

  describe('getUserSyncs', () => {
    const syncOptions = {
      'iframeEnabled': 'true'
    }
    const serverResponses = [
      {
        body: {
          userSyncs: [
            {
              t: 'i',
              u: 'https://test.url.com/setuid'
            },
            {
              t: 'p',
              u: 'https://test.url.com/setuid'
            }
          ]
        }
      }
    ];

    const emptyServerResponses = [
      {
        body: ''
      }
    ];

    it('should handle correctly user syncs', () => {
      let result = spec.getUserSyncs(syncOptions, serverResponses);
      let emptyResult = spec.getUserSyncs(syncOptions, emptyServerResponses);
      expect(result[0].type).to.equal('iframe');
      expect(result[0].url).contain('setuid');
      expect(result[1].type).to.equal('image');
      expect(emptyResult).to.equal(false);
    });
  });
});
