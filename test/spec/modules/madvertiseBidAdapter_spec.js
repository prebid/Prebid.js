import {expect} from 'chai';
import {config} from 'src/config';
import * as utils from 'src/utils';
import {spec} from 'modules/madvertiseBidAdapter';

describe('madvertise adapater', () => {
  describe('Test validate req', () => {
    it('should accept minimum valid bid', () => {
      let bid = {
        bidder: 'madvertise',
        sizes: [[728, 90]],
        params: {
          zoneId: 'test'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
    it('should reject no sizes', () => {
      let bid = {
        bidder: 'madvertise',
        params: {
          zoneId: 'test'
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
          zoneId: 'test'
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
          zoneId: 'test'
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
        zoneId: 'test',
      }
    }];
    it('minimum request with gdpr consent', () => {
      let bidderRequest = {
        gdprConsent: {
          consentString: 'CO_5mtSPHOmEIAsAkBFRBOCsAP_AAH_AAAqIHQgB7SrERyNAYWB5gusAKYlfQAQCA2AABAYdASgJQQBAMJYEkGAIuAnAACAKAAAEIHQAAAAlCCmABAEAAIABBSGMAQgABZAAIiAEEAATAABACAABGYCSCAIQjIAAAAEAgEKEAAoAQGBAAAEgBABAAAogACADAgXmACIKkQBAkBAYAkAYQAogAhAAAAAIAAAAAAAKAABAAAghAAQQAAAAAAAAAgAAAAABAAAAAAAAQAAAAAAAAABAAgAAAAAAAAAIAAAAAAAAAAAAAAAABAAAAAAAAAAAQCAKCgBgEQALgAqkJADAIgAXABVIaACAAERABAACKgAgABA',
          vendorData: {},
          gdprApplies: true
        }
      };
      const req = spec.buildRequests(bid, bidderRequest);

      expect(req).to.exist.and.to.be.a('array');
      expect(req[0]).to.have.property('method');
      expect(req[0].method).to.equal('GET');
      expect(req[0]).to.have.property('url');
      expect(req[0].url).to.contain('//mobile.mng-ads.com/?rt=bid_request&v=1.0');
      expect(req[0].url).to.contain(`&zoneId=test`);
      expect(req[0].url).to.contain(`&sizes[0]=728x90`);
      expect(req[0].url).to.contain(`&gdpr=1`);
      expect(req[0].url).to.contain(`&consent[0][format]=IAB`);
      expect(req[0].url).to.contain(`&consent[0][value]=CO_5mtSPHOmEIAsAkBFRBOCsAP_AAH_AAAqIHQgB7SrERyNAYWB5gusAKYlfQAQCA2AABAYdASgJQQBAMJYEkGAIuAnAACAKAAAEIHQAAAAlCCmABAEAAIABBSGMAQgABZAAIiAEEAATAABACAABGYCSCAIQjIAAAAEAgEKEAAoAQGBAAAEgBABAAAogACADAgXmACIKkQBAkBAYAkAYQAogAhAAAAAIAAAAAAAKAABAAAghAAQQAAAAAAAAAgAAAAABAAAAAAAAQAAAAAAAAABAAgAAAAAAAAAIAAAAAAAAAAAAAAAABAAAAAAAAAAAQCAKCgBgEQALgAqkJADAIgAXABVIaACAAERABAACKgAgABA`)
    });

    it('minimum request without gdpr consent', () => {
      let bidderRequest = {};
      const req = spec.buildRequests(bid, bidderRequest);

      expect(req).to.exist.and.to.be.a('array');
      expect(req[0]).to.have.property('method');
      expect(req[0].method).to.equal('GET');
      expect(req[0]).to.have.property('url');
      expect(req[0].url).to.contain('//mobile.mng-ads.com/?rt=bid_request&v=1.0');
      expect(req[0].url).to.contain(`&zoneId=test`);
      expect(req[0].url).to.contain(`&sizes[0]=728x90`);
      expect(req[0].url).not.to.contain(`&gdpr=1`);
      expect(req[0].url).not.to.contain(`&consent[0][format]=`);
      expect(req[0].url).not.to.contain(`&consent[0][value]=`)
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
          zoneId: 'test',
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
        netRevenue: true,
        adomain: ['madvertise.com']
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
      // expect(resp[0].adomain).to.deep.equal(['madvertise.com']);
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
          zoneId: 'test',
          connection_type: 'WIFI',
          age: 25,
        }
      };
      let resp = spec.interpretResponse({body: null}, {bidId: bid.bidId});

      expect(resp).to.exist.and.to.be.a('array').that.is.empty;
    });
  });
});
