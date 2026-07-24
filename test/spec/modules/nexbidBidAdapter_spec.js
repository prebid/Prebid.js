import { expect } from 'chai';
import { BIDDER_CODE, ENDPOINT, spec } from 'modules/nexbidBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { BANNER } from 'src/mediaTypes.js';

describe('nexbidBidAdapter', function () {
  const adapter = newBidder(spec);

  const bid = {
    bidder: BIDDER_CODE,
    bidId: 'bid-1',
    adUnitCode: 'moneycontrol_300x250',
    transactionId: 'transaction-1',
    params: {
      publisherId: '2606001',
      placementId: 'moneycontrol_300x250',
      configId: 'moneycontrol.com'
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    schain: {
      ver: '1.0',
      complete: 1,
      nodes: [{ asi: 'nexbid.uk', sid: '2606001', hp: 1 }]
    },
    ortb2Imp: {
      ext: { gpid: '/1039154/moneycontrol_300x250' }
    },
    getFloor: () => ({ currency: 'USD', floor: 0.25 })
  };

  const bidderRequest = {
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    timeout: 1200,
    refererInfo: {
      page: 'https://www.moneycontrol.com/news/example',
      domain: 'moneycontrol.com'
    },
    ortb2: {
      site: { domain: 'moneycontrol.com' }
    },
    gdprConsent: {
      gdprApplies: true,
      consentString: 'consent'
    },
    uspConsent: '1YNN',
    gppConsent: {
      gppString: 'DBABLA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
      applicableSections: [7]
    }
  };

  it('should expose the standard bidder entry point', function () {
    expect(adapter.callBids).to.be.a('function');
    expect(spec.supportedMediaTypes).to.deep.equal([BANNER]);
  });

  describe('isBidRequestValid', function () {
    it('should accept required parameters', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should accept the documented test flag', function () {
      expect(spec.isBidRequestValid({
        ...bid,
        params: {
          publisherId: 'nexbid-test',
          placementId: 'banner-300x250',
          configId: 'prebid-review',
          test: true
        }
      })).to.equal(true);
    });

    it('should reject test mode for a production placement', function () {
      expect(spec.isBidRequestValid({
        ...bid,
        params: { ...bid.params, test: true }
      })).to.equal(false);
    });

    ['publisherId', 'placementId'].forEach((field) => {
      it(`should reject a missing ${field}`, function () {
        const params = { ...bid.params };
        delete params[field];
        expect(spec.isBidRequestValid({ ...bid, params })).to.equal(false);
      });

      it(`should reject a blank ${field}`, function () {
        expect(spec.isBidRequestValid({
          ...bid,
          params: { ...bid.params, [field]: ' ' }
        })).to.equal(false);
      });
    });

    it('should reject invalid optional parameter types', function () {
      expect(spec.isBidRequestValid({
        ...bid,
        params: { ...bid.params, configId: 12 }
      })).to.equal(false);
      expect(spec.isBidRequestValid({
        ...bid,
        params: { ...bid.params, test: 'true' }
      })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should create one fixed-endpoint POST request', function () {
      const request = spec.buildRequests([bid], bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
      expect(request.options).to.deep.equal({ withCredentials: false });
      expect(request.data).to.be.a('string');
    });

    it('should send standard auction, privacy, schain, floor and FPD data', function () {
      const request = JSON.parse(spec.buildRequests([bid], bidderRequest).data);

      expect(request.auctionId).to.equal('auction-1');
      expect(request.bidderRequestId).to.equal('bidder-request-1');
      expect(request.timeout).to.equal(1200);
      expect(request.refererInfo.domain).to.equal('moneycontrol.com');
      expect(request.ortb2.site.domain).to.equal('moneycontrol.com');
      expect(request.privacy).to.deep.equal({
        gdpr: { applies: true, consentString: 'consent' },
        usp: '1YNN',
        gpp: {
          string: 'DBABLA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
          applicableSections: [7]
        }
      });
      expect(request.bids[0]).to.include({
        requestId: 'bid-1',
        publisherId: '2606001',
        placementId: 'moneycontrol_300x250',
        configId: 'moneycontrol.com',
        test: false
      });
      expect(request.bids[0].sizes).to.deep.equal([[300, 250]]);
      expect(request.bids[0].schain).to.deep.equal(bid.schain);
      expect(request.bids[0].ortb2Imp).to.deep.equal(bid.ortb2Imp);
      expect(request.bids[0].floor).to.deep.equal({ currency: 'USD', value: 0.25 });
    });

    it('should not accept a publisher-controlled endpoint or CPM', function () {
      const request = JSON.parse(spec.buildRequests([{
        ...bid,
        params: {
          ...bid.params,
          endpoint: 'https://attacker.example/bid',
          floorCpm: 99,
          testCpm: 99
        }
      }], bidderRequest).data);

      expect(request.bids[0]).not.to.have.property('endpoint');
      expect(request.bids[0]).not.to.have.property('floorCpm');
      expect(request.bids[0]).not.to.have.property('testCpm');
    });

    it('should read schain from normalized impression ORTB data', function () {
      const normalizedSchain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'nexbid.uk', sid: 'normalized-bid', hp: 1 }]
      };
      const request = JSON.parse(spec.buildRequests([{
        ...bid,
        schain: undefined,
        ortb2: { source: { ext: { schain: normalizedSchain } } }
      }], bidderRequest).data);

      expect(request.bids[0].schain).to.deep.equal(normalizedSchain);
    });

    it('should fall back to normalized bidder-request schain', function () {
      const normalizedSchain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'nexbid.uk', sid: 'normalized-request', hp: 1 }]
      };
      const request = JSON.parse(spec.buildRequests([{
        ...bid,
        schain: undefined,
        ortb2: undefined
      }], {
        ...bidderRequest,
        ortb2: {
          ...bidderRequest.ortb2,
          source: { ext: { schain: normalizedSchain } }
        }
      }).data);

      expect(request.bids[0].schain).to.deep.equal(normalizedSchain);
    });

    it('should tolerate a floor module error', function () {
      const request = JSON.parse(spec.buildRequests([{
        ...bid,
        getFloor: () => { throw new Error('floor failed'); }
      }], bidderRequest).data);

      expect(request.bids[0].floor).to.equal(null);
    });
  });

  describe('interpretResponse', function () {
    const validBid = {
      requestId: 'bid-1',
      cpm: 1.25,
      width: 300,
      height: 250,
      creativeId: 'creative-1',
      currency: 'USD',
      netRevenue: true,
      ttl: 120,
      advertiserDomains: ['advertiser.example'],
      ad: '<div>advertisement</div>'
    };

    it('should return an empty array for an invalid response envelope', function () {
      expect(spec.interpretResponse({})).to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} })).to.deep.equal([]);
    });

    it('should map a valid banner bid', function () {
      const result = spec.interpretResponse({ body: { bids: [validBid] } });

      expect(result).to.have.length(1);
      expect(result[0]).to.deep.include({
        requestId: 'bid-1',
        cpm: 1.25,
        width: 300,
        height: 250,
        creativeId: 'creative-1',
        currency: 'USD',
        netRevenue: true,
        ttl: 120,
        ad: '<div>advertisement</div>',
        mediaType: BANNER
      });
      expect(result[0].meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    });

    it('should preserve an optional deal ID', function () {
      const result = spec.interpretResponse({
        body: { bids: [{ ...validBid, dealId: 'deal-1' }] }
      });

      expect(result[0].dealId).to.equal('deal-1');
    });

    it('should reject bids without required commercial or creative data', function () {
      const invalidBids = [
        { ...validBid, requestId: '' },
        { ...validBid, cpm: 0 },
        { ...validBid, width: 0 },
        { ...validBid, height: 0 },
        { ...validBid, currency: 'usd' },
        { ...validBid, ad: '' },
        { ...validBid, advertiserDomains: [] }
      ];

      expect(spec.interpretResponse({ body: { bids: invalidBids } })).to.deep.equal([]);
    });
  });
});

