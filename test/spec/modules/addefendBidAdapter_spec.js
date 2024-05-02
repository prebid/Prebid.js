import {expect} from 'chai';
import {spec} from 'modules/addefendBidAdapter.js';

describe('addefendBidAdapter', () => {
  const defaultBidRequest = {
    bidId: 'd66fa86787e0b0ca900a96eacfd5f0bb',
    auctionId: 'ccc4c7cdfe11cfbd74065e6dd28413d8',
    transactionId: 'd58851660c0c4461e4aa06344fc9c0c6',
    sizes: [[300, 250], [300, 600]],
    params: {
      pageId: 'stringid1',
      placementId: 'stringid2'
    }
  };

  const deepClone = function (val) {
    return JSON.parse(JSON.stringify(val));
  };

  const buildRequest = (buildRequest, bidderRequest) => {
    if (!Array.isArray(buildRequest)) {
      buildRequest = [buildRequest];
    }

    return spec.buildRequests(buildRequest, {
      ...bidderRequest || {},
      refererInfo: {
        page: 'https://referer.example.com'
      }
    })[0];
  };

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      const bidRequest = deepClone(defaultBidRequest);
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('pageId performs type checking', () => {
      const bidRequest = deepClone(defaultBidRequest);
      bidRequest.params.pageId = 1; // supposed to be a string
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('placementId performs type checking', () => {
      const bidRequest = deepClone(defaultBidRequest);
      bidRequest.params.placementId = 1; // supposed to be a string
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });

    it('should return false when required params are not passed', () => {
      const bidRequest = deepClone(defaultBidRequest);
      delete bidRequest.params;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const bidRequest = deepClone(defaultBidRequest);
    const request = buildRequest(bidRequest);

    it('sends bid request to endpoint via https using post', () => {
      expect(request.method).to.equal('POST');
      expect(request.url.indexOf('https://')).to.equal(0);
      expect(request.url).to.equal(`${spec.hostname}/bid`);
    });

    it('contains prebid version parameter', () => {
      expect(request.data.v).to.equal($$PREBID_GLOBAL$$.version);
    });

    it('contains correct referer', () => {
      expect(request.data.referer).to.equal('https://referer.example.com');
    });

    it('contains auctionId', () => {
      expect(request.data.auctionId).to.equal('ccc4c7cdfe11cfbd74065e6dd28413d8');
    });

    it('contains pageId', () => {
      expect(request.data.pageId).to.equal('stringid1');
    });

    it('sends correct bid parameters', () => {
      const bidRequest = deepClone(defaultBidRequest);
      expect(request.data.bids).to.deep.equal([ {
        bidId: bidRequest.bidId,
        placementId: bidRequest.params.placementId,
        sizes: [ '300x250', '300x600' ],
        transactionId: 'd58851660c0c4461e4aa06344fc9c0c6'
      } ]);
    });

    it('handles empty gdpr object', () => {
      const bidRequest = deepClone(defaultBidRequest);
      const request = buildRequest(bidRequest, {
        gdprConsent: {}
      });
      expect(request.data.gdpr_consent).to.be.equal('');
    });

    it('handles non-existent gdpr object', () => {
      const bidRequest = deepClone(defaultBidRequest);
      const request = buildRequest(bidRequest, {
        gdprConsent: null
      });
      expect(request.data.gdpr_consent).to.be.equal('');
    });

    it('handles properly filled gdpr string', () => {
      const bidRequest = deepClone(defaultBidRequest);
      const consentString = 'GDPR_CONSENT_STRING';
      const request = buildRequest(bidRequest, {
        gdprConsent: {
          gdprApplies: true,
          consentString: consentString
        }
      });

      expect(request.data.gdpr_consent).to.be.equal(consentString);
    });
  });

  describe('interpretResponse', () => {
    it('should get correct bid response', () => {
      const serverResponse = [
        {
          'width': 300,
          'height': 250,
          'creativeId': '29681110',
          'ad': '<!-- Creative -->',
          'cpm': 0.5,
          'requestId': 'ccc4c7cdfe11cfbd74065e6dd28413d8',
          'ttl': 120,
          'netRevenue': true,
          'currency': 'EUR',
          'advertiserDomains': ['advertiser.example.com']
        }
      ];

      const expectedResponse = [
        {
          'requestId': 'ccc4c7cdfe11cfbd74065e6dd28413d8',
          'cpm': 0.5,
          'creativeId': '29681110',
          'width': 300,
          'height': 250,
          'ttl': 120,
          'currency': 'EUR',
          'ad': '<!-- Creative -->',
          'netRevenue': true,
          'advertiserDomains': ['advertiser.example.com']
        }
      ];

      const result = spec.interpretResponse({body: serverResponse});
      expect(result.length).to.equal(expectedResponse.length);
      Object.keys(expectedResponse[0]).forEach((key) => {
        expect(result[0][key]).to.deep.equal(expectedResponse[0][key]);
      });
    });

    it('handles incomplete server response', () => {
      const serverResponse = [
        {
          'ad': '<!-- Creative -->',
          'cpm': 0.5,
          'requestId': 'ccc4c7cdfe11cfbd74065e6dd28413d8',
          'ttl': 60
        }
      ];
      const result = spec.interpretResponse({body: serverResponse});

      expect(result.length).to.equal(0);
    });

    it('handles nobid responses', () => {
      const serverResponse = [];
      const result = spec.interpretResponse({body: serverResponse});

      expect(result.length).to.equal(0);
    });
  });
});
