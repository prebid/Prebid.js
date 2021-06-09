import {expect} from 'chai';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import {spec} from 'modules/madvertiseBidAdapter.js';

describe('madvertise adapater', function () {
  describe('Test validate req', function () {
    it('should accept minimum valid bid', function () {
      let bid = {
        bidder: 'madvertise',
        sizes: [[728, 90]],
        params: {
          s: 'test'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(true);
    });
    it('should reject no sizes', function () {
      let bid = {
        bidder: 'madvertise',
        params: {
          s: 'test'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
    it('should reject empty sizes', function () {
      let bid = {
        bidder: 'madvertise',
        sizes: [],
        params: {
          s: 'test'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
    it('should reject wrong format sizes', function () {
      let bid = {
        bidder: 'madvertise',
        sizes: [['728x90']],
        params: {
          s: 'test'
        }
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });
    it('should reject no params', function () {
      let bid = {
        bidder: 'madvertise',
        sizes: [[728, 90]]
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
    it('should reject missing s', function () {
      let bid = {
        bidder: 'madvertise',
        params: {}
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
  });

  describe('Test build request', function () {
    beforeEach(function () {
      let mockConfig = {
        consentManagement: {
          cmpApi: 'IAB',
          timeout: 1111,
          allowAuctionWithoutConsent: 'cancel'
        }
      };

      sinon.stub(config, 'getConfig').callsFake((key) => {
        return utils.deepAccess(mockConfig, key);
      });
    });
    afterEach(function () {
      config.getConfig.restore();
    });
    let bid = [{
      bidder: 'madvertise',
      sizes: [[728, 90], [300, 100]],
      bidId: '51ef8751f9aead',
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
      auctionId: '18fd8b8b0bd757',
      bidderRequestId: '418b37f85e772c',
      params: {
        s: 'test',
      }
    }];
    it('minimum request with gdpr consent', function () {
      let bidderRequest = {
        gdprConsent: {
          consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
          vendorData: {},
          gdprApplies: true
        }
      };
      const req = spec.buildRequests(bid, bidderRequest);

      expect(req).to.exist.and.to.be.a('array');
      expect(req[0]).to.have.property('method');
      expect(req[0].method).to.equal('GET');
      expect(req[0]).to.have.property('url');
      expect(req[0].url).to.contain('https://mobile.mng-ads.com/?rt=bid_request&v=1.0');
      expect(req[0].url).to.contain(`&s=test`);
      expect(req[0].url).to.contain(`&sizes[0]=728x90`);
      expect(req[0].url).to.contain(`&gdpr=1`);
      expect(req[0].url).to.contain(`&consent[0][format]=IAB`);
      expect(req[0].url).to.contain(`&consent[0][value]=BOJ/P2HOJ/P2HABABMAAAAAZ+A==`)
    });

    it('minimum request without gdpr consent', function () {
      let bidderRequest = {};
      const req = spec.buildRequests(bid, bidderRequest);

      expect(req).to.exist.and.to.be.a('array');
      expect(req[0]).to.have.property('method');
      expect(req[0].method).to.equal('GET');
      expect(req[0]).to.have.property('url');
      expect(req[0].url).to.contain('https://mobile.mng-ads.com/?rt=bid_request&v=1.0');
      expect(req[0].url).to.contain(`&s=test`);
      expect(req[0].url).to.contain(`&sizes[0]=728x90`);
      expect(req[0].url).not.to.contain(`&gdpr=1`);
      expect(req[0].url).not.to.contain(`&consent[0][format]=`);
      expect(req[0].url).not.to.contain(`&consent[0][value]=`)
    });
  });

  describe('Test interpret response', function () {
    it('General banner response', function () {
      let bid = {
        bidder: 'madvertise',
        sizes: [[728, 90]],
        bidId: '51ef8751f9aead',
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        auctionId: '18fd8b8b0bd757',
        bidderRequestId: '418b37f85e772c',
        params: {
          s: 'test',
          connection_type: 'WIFI',
          age: 25,
        }
      };
      let resp = spec.interpretResponse({body: {
        requestId: 'REQUEST_ID',
        cpm: 1,
        ad: '<html><h3>I am an ad</h3></html>',
        Width: 320,
        height: 50,
        creativeId: 'CREATIVE_ID',
        dealId: 'DEAL_ID',
        ttl: 180,
        currency: 'EUR',
        netRevenue: true
      }}, {bidId: bid.bidId});

      expect(resp).to.exist.and.to.be.a('array');
      expect(resp[0]).to.have.property('requestId', bid.bidId);
      expect(resp[0]).to.have.property('cpm', 1);
      expect(resp[0]).to.have.property('width', 320);
      expect(resp[0]).to.have.property('height', 50);
      expect(resp[0]).to.have.property('ad', '<html><h3>I am an ad</h3></html>');
      expect(resp[0]).to.have.property('ttl', 180);
      expect(resp[0]).to.have.property('creativeId', 'CREATIVE_ID');
      expect(resp[0]).to.have.property('netRevenue', true);
      expect(resp[0]).to.have.property('currency', 'EUR');
      expect(resp[0]).to.have.property('dealId', 'DEAL_ID');
    });
    it('No response', function () {
      let bid = {
        bidder: 'madvertise',
        sizes: [[728, 90]],
        bidId: '51ef8751f9aead',
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        transactionId: 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        auctionId: '18fd8b8b0bd757',
        bidderRequestId: '418b37f85e772c',
        params: {
          s: 'test',
          connection_type: 'WIFI',
          age: 25,
        }
      };
      let resp = spec.interpretResponse({body: null}, {bidId: bid.bidId});

      expect(resp).to.exist.and.to.be.a('array').that.is.empty;
    });
  });
});
