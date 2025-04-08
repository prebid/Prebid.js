import { spec } from 'modules/robustaBidAdapter.js';
import { config } from 'src/config.js';
import { deepClone } from 'src/utils.js';

describe('robustaBidAdapter', function () {
  const validBidRequest = {
    bidId: 'bid123',
    params: {
      lineItemId: '12345'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    }
  };

  const validBidderRequest = {
    bidderCode: 'robusta',
    auctionId: 'auction123',
    bidderRequestId: 'req123',
    timeout: 3000,
    gdprConsent: {
      consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA',
      gdprApplies: true
    }
  };

  const validServerResponse = {
    body: {
      id: 'auction123',
      seatbid: [{
        bid: [{
          mtype: 1,
          id: 'bid123',
          impid: 'bid123',
          price: 0.5,
          adm: '<div>ad</div>',
          w: 300,
          h: 250,
          crid: 'creative123'
        }]
      }],
      cur: 'USD'
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true when lineItemId is present', function () {
      expect(spec.isBidRequestValid(validBidRequest)).to.be.true;
    });

    it('should return false when lineItemId is missing', function () {
      const bid = deepClone(validBidRequest);
      delete bid.params.lineItemId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should create request with correct structure', function () {
      const requests = spec.buildRequests([validBidRequest], validBidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal('//pbjs.baristartb.com/api/prebid');
      expect(requests[0].options.withCredentials).to.be.false;
    });

    it('should use custom rtbDomain if configured', function () {
      config.setBidderConfig({ bidders: ['robusta'], config: { rtbDomain: 'custom.domain.com' } });
      const requests = config.runWithBidder(spec.code, () => spec.buildRequests([validBidRequest], validBidderRequest));

      expect(requests[0].url).to.equal('//custom.domain.com/api/prebid');
      config.resetConfig();
    });

    it('should include bid params in imp.ext.params', function () {
      const requests = spec.buildRequests([validBidRequest], validBidderRequest);
      const imp = requests[0].data.imp[0];

      expect(imp.ext.params).to.deep.equal(validBidRequest.params);
    });
  });

  describe('interpretResponse', function () {
    it('should return valid bid response', function () {
      const request = spec.buildRequests([validBidRequest], validBidderRequest)[0];
      const result = spec.interpretResponse(validServerResponse, request);

      expect(result.bids).to.be.an('array');
      expect(result.bids).to.have.lengthOf(1);
      expect(result.bids[0]).to.include({
        requestId: 'bid123',
        cpm: 0.5,
        width: 300,
        height: 250,
        ad: '<div>ad</div>',
        creativeId: 'creative123',
        netRevenue: true,
        ttl: 30,
        currency: 'USD'
      });
    });

    it('should return empty bids array if no valid bids', function () {
      const emptyResponse = { body: { id: 'auction123', seatbid: [] } };
      const request = spec.buildRequests([validBidRequest], validBidderRequest)[0];
      const result = spec.interpretResponse(emptyResponse, request);

      expect(result.bids).to.be.an('array');
      expect(result.bids).to.have.lengthOf(0);
    });
  });

  describe('getUserSyncs', function () {
    const gdprConsent = {
      gdprApplies: true,
      consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA'
    };

    it('should return iframe sync when iframeEnabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], gdprConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include('//sync.baristartb.com/api/sync?');
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA');
    });

    it('should return pixel sync when pixelEnabled', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true }, [], gdprConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
    });

    it('should use custom syncDomain if configured', function () {
      config.setBidderConfig({ bidders: ['robusta'], config: { syncDomain: 'custom.sync.com' } });
      const syncs = config.runWithBidder(spec.code, () => spec.getUserSyncs({ iframeEnabled: true }, [], gdprConsent));
      expect(syncs[0].url).to.include('//custom.sync.com/api/sync?');
      config.resetConfig();
    });

    it('should handle missing gdprConsent', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs[0].url).to.not.include('gdpr');
      expect(syncs[0].url).to.not.include('gdpr_consent');
    });
  });
});
