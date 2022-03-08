import { expect } from 'chai';
import { spec, _getPlatform } from 'modules/missenaBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('Missena Adapter', function () {
  const adapter = newBidder(spec);

  const bidId = 'abc';

  const bid = {
    bidder: 'missena',
    bidId: bidId,
    sizes: [[1, 1]],
    params: {
      apiKey: 'PA-34745704',
    },
  };

  describe('codes', function () {
    it('should return a bidder code of missena', function () {
      expect(spec.code).to.equal('missena');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true if the apiKey param is present', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false if the apiKey is missing', function () {
      expect(
        spec.isBidRequestValid(Object.assign(bid, { params: {} }))
      ).to.equal(false);
    });

    it('should return false if the apiKey is an empty string', function () {
      expect(
        spec.isBidRequestValid(Object.assign(bid, { params: { apiKey: '' } }))
      ).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const consentString = 'AAAAAAAAA==';

    const bidderRequest = {
      gdprConsent: {
        consentString: consentString,
        gdprApplies: true,
      },
      refererInfo: {
        referer: 'https://referer',
        canonicalUrl: 'https://canonical',
      },
    };

    const requests = spec.buildRequests([bid, bid], bidderRequest);
    const request = requests[0];
    const payload = JSON.parse(request.data);

    it('should return as many server requests as bidder requests', function () {
      expect(requests.length).to.equal(2);
    });

    it('should have a post method', function () {
      expect(request.method).to.equal('POST');
    });

    it('should send the bidder id', function () {
      expect(payload.request_id).to.equal(bidId);
    });

    it('should send referer information to the request', function () {
      expect(payload.referer).to.equal('https://referer');
      expect(payload.referer_canonical).to.equal('https://canonical');
    });

    it('should send gdpr consent information to the request', function () {
      expect(payload.consent_string).to.equal(consentString);
      expect(payload.consent_required).to.equal(true);
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      requestId: bidId,
      cpm: 0.5,
      currency: 'USD',
      ad: '<!-- -->',
      meta: {
        advertiserDomains: ['missena.com']
      },
    };

    const serverTimeoutResponse = {
      requestId: bidId,
      timeout: true,
      ad: '<!-- -->',
    };

    const serverEmptyAdResponse = {
      requestId: bidId,
      cpm: 0.5,
      currency: 'USD',
      ad: '',
    };

    it('should return a proper bid response', function () {
      const result = spec.interpretResponse({ body: serverResponse }, bid);

      expect(result.length).to.equal(1);

      expect(Object.keys(result[0])).to.have.members(
        Object.keys(serverResponse)
      );
    });

    it('should return an empty response when the server answers with a timeout', function () {
      const result = spec.interpretResponse(
        { body: serverTimeoutResponse },
        bid
      );
      expect(result).to.deep.equal([]);
    });

    it('should return an empty response when the server answers with an empty ad', function () {
      const result = spec.interpretResponse(
        { body: serverEmptyAdResponse },
        bid
      );
      expect(result).to.deep.equal([]);
    });
  });
});
