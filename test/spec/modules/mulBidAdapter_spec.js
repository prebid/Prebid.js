import { expect } from 'chai';
import { spec } from 'modules/mulBidAdapter.js';

describe('mulBidAdapter', function () {
  const bid = {
    bidder: 'mul',
    params: {
      placementId: 'test-placement-123'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bidId: '22c4871113f461'
  };

  const bidderRequest = {
    auctionId: 'b06c5141-fe8f-4cdf-9d7d-54415490a917',
    refererInfo: {
      page: 'https://publisher.com/article',
      domain: 'publisher.com',
      ref: 'https://google.com'
    },
    gdprConsent: {
      gdprApplies: true,
      consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA'
    },
    uspConsent: '1---'
  };

  describe('isBidRequestValid', function () {
    it('should return true when placementId is specified', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return true when zoneId is specified', function () {
      expect(spec.isBidRequestValid({ params: { zoneId: 'zone-99' } })).to.be.true;
    });

    it('should return false when params is empty or missing required fields', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
      expect(spec.isBidRequestValid({ params: {} })).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should build a valid POST request with JSON payload', function () {
      const serverRequest = spec.buildRequests([bid], bidderRequest);
      expect(serverRequest.method).to.equal('POST');
      expect(serverRequest.url).to.contain('/api/bid');
      expect(serverRequest.options.contentType).to.equal('text/plain');

      const data = JSON.parse(serverRequest.data);
      expect(data.id).to.equal(bidderRequest.auctionId);
      expect(data.page).to.equal('https://publisher.com/article');
      expect(data.consent.gdprApplies).to.be.true;
      expect(data.consent.consentString).to.equal('BOtmiBKOtmiBKABABAENAFAAAAACeAAA');
      expect(data.consent.uspConsent).to.equal('1---');

      expect(data.bids).to.have.lengthOf(1);
      expect(data.bids[0].bidId).to.equal('22c4871113f461');
      expect(data.bids[0].placementId).to.equal('test-placement-123');
      expect(data.bids[0].sizes).to.deep.equal([[300, 250]]);
    });
  });

  describe('interpretResponse', function () {
    it('should map server response to valid Prebid bid responses', function () {
      const mockServerResponse = {
        body: [
          {
            bidId: '22c4871113f461',
            cpm: 2.45,
            currency: 'USD',
            width: 300,
            height: 250,
            creativeId: 'crid_12345',
            adHtml: '<div>Ad Banner</div>',
            adomain: ['monetiseup.com'],
            demandSource: 'Adagio'
          }
        ]
      };

      const result = spec.interpretResponse(mockServerResponse, {});
      expect(result).to.have.lengthOf(1);
      const bidResponse = result[0];

      expect(bidResponse.requestId).to.equal('22c4871113f461');
      expect(bidResponse.cpm).to.equal(2.45);
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.ad).to.equal('<div>Ad Banner</div>');
      expect(bidResponse.netRevenue).to.be.true;
      expect(bidResponse.ttl).to.equal(300);
      expect(bidResponse.mediaType).to.equal('banner');
      expect(bidResponse.meta.advertiserDomains).to.deep.equal(['monetiseup.com']);
      expect(bidResponse.meta.demandSource).to.equal('Adagio');
      expect(bidResponse.meta.mediaType).to.equal('banner');
    });

    it('should return empty array on empty or invalid response', function () {
      expect(spec.interpretResponse({ body: [] }, {})).to.deep.equal([]);
      expect(spec.interpretResponse({ body: null }, {})).to.deep.equal([]);
      expect(spec.interpretResponse({}, {})).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('should return iframe sync when iframeEnabled is true', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], { gdprApplies: true, consentString: 'consent_123' }, '1---', null, false);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.contain('gdpr=1');
      expect(syncs[0].url).to.contain('consent_123');
      expect(syncs[0].url).to.contain('us_privacy=1---');
    });

    it('should return image sync when pixelEnabled is true', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [], null, '', null, false);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.contain('/api/usersync');
    });

    it('should return empty array when syncing is disabled', function () {
      const syncs = spec.getUserSyncs({}, [], null, '', null, false);
      expect(syncs).to.deep.equal([]);
    });

    it('should suppress user sync when coppa is true', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [], null, '', null, true);
      expect(syncs).to.deep.equal([]);
    });
  });
});
