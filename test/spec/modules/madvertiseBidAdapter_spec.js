import {expect} from 'chai';
import {spec} from 'modules/madvertiseBidAdapter';

describe('madvertise adapater', () => {
  describe('Test validate req', () => {
    it('should accept minimum valid bid', () => {
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
    it('should reject no sizes', () => {
      let bid = {
        bidder: 'madvertise',
        params: {
          s: 'test'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
    it('should reject empty sizes', () => {
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
    it('should reject wrong format sizes', () => {
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
    it('should reject no params', () => {
      let bid = {
        bidder: 'madvertise',
        sizes: [[728, 90]]
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
    it('should reject missing s', () => {
      let bid = {
        bidder: 'madvertise',
        params: {}
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
  });

  describe('Test build request', () => {
    it('minimum request', () => {
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
      const req = spec.buildRequests(bid);

      expect(req).to.exist.and.to.be.a('array');
      expect(req[0]).to.have.property('method');
      expect(req[0].method).to.equal('GET');
      expect(req[0]).to.have.property('url');
      expect(req[0].url).to.contain('//mobile.mng-ads.com/?rt=bid_request&v=1.0').and.to.contain(`&s=test`).and.to.contain(`&sizes[0]=728x90`)
    });
  });

  describe('Test interpret response', () => {
    it('General banner response', () => {
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
    it('No response', () => {
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
