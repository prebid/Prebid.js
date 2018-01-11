import {expect} from 'chai';
import {spec} from 'modules/arteebeeBidAdapter';

describe('Arteebee adapater', () => {
  describe('Test validate req', () => {
    it('should accept minimum valid bid', () => {
      let bid = {
        bidder: 'arteebee',
        params: {
          pub: 'prebidtest',
          source: 'prebidtest'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(true);
    });

    it('should reject missing pub', () => {
      let bid = {
        bidder: 'arteebee',
        params: {
          source: 'prebidtest'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });

    it('should reject missing source', () => {
      let bid = {
        bidder: 'arteebee',
        params: {
          pub: 'prebidtest'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
  });

  describe('Test build request', () => {
    it('minimum request', () => {
      let bid = {
        bidder: 'arteebee',
        params: {
          pub: 'prebidtest',
          source: 'prebidtest'
        },
        sizes: [[300, 250]]
      };

      const req = JSON.parse(spec.buildRequests([bid])[0].data);

      expect(req).to.not.have.property('reg');
      expect(req).to.not.have.property('test');
      expect(req.imp[0]).to.not.have.property('secure');
    });

    it('make test request', () => {
      let bid = {
        bidder: 'arteebee',
        params: {
          pub: 'prebidtest',
          source: 'prebidtest',
          test: true
        },
        sizes: [[300, 250]]
      };

      const req = JSON.parse(spec.buildRequests([bid])[0].data);

      expect(req).to.not.have.property('reg');
      expect(req).to.have.property('test', 1);
      expect(req.imp[0]).to.not.have.property('secure');
    });

    it('test coppa', () => {
      let bid = {
        bidder: 'arteebee',
        params: {
          pub: 'prebidtest',
          source: 'prebidtest',
          coppa: true
        },
        sizes: [[300, 250]]
      };

      const req = JSON.parse(spec.buildRequests([bid])[0].data);

      expect(req.regs).to.have.property('coppa', 1);
      expect(req).to.not.have.property('test');
      expect(req.imp[0]).to.not.have.property('secure');
    });
  });

  describe('Test interpret response', () => {
    it('General banner response', () => {
      let resp = spec.interpretResponse({
        body: {
          id: 'abcd',
          seatbid: [{
            bid: [{
              id: 'abcd',
              impid: 'banner-bid',
              price: 0.3,
              adm: 'hello',
              crid: 'efgh',
              w: 300,
              h: 250,
              exp: 5
            }]
          }]
        }
      }, null)[0];

      expect(resp).to.have.property('requestId', 'banner-bid');
      expect(resp).to.have.property('cpm', 0.3);
      expect(resp).to.have.property('width', 300);
      expect(resp).to.have.property('height', 250);
      expect(resp).to.have.property('creativeId', 'efgh');
      expect(resp).to.have.property('ttl', 5);
      expect(resp).to.have.property('ad', 'hello');
    });
  });
});
