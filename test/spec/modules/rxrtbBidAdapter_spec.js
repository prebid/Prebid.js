import {expect} from 'chai';
import {spec} from 'modules/rxrtbBidAdapter';

describe('rxrtb adapater', () => {
  describe('Test validate req', () => {
    it('should accept minimum valid bid', () => {
      let bid = {
        bidder: 'rxrtb',
        params: {
          id: 89,
          token: '658f11a5efbbce2f9be3f1f146fcbc22',
          source: 'prebidtest'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(true);
    });

    it('should reject missing id', () => {
      let bid = {
        bidder: 'rxrtb',
        params: {
          token: '658f11a5efbbce2f9be3f1f146fcbc22',
          source: 'prebidtest'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });

    it('should reject id not Integer', () => {
      let bid = {
        bidder: 'rxrtb',
        params: {
          id: '123',
          token: '658f11a5efbbce2f9be3f1f146fcbc22',
          source: 'prebidtest'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });

    it('should reject missing source', () => {
      let bid = {
        bidder: 'rxrtb',
        params: {
          id: 89,
          token: '658f11a5efbbce2f9be3f1f146fcbc22'
        }
      };
      const isValid = spec.isBidRequestValid(bid);

      expect(isValid).to.equal(false);
    });
  });

  describe('Test build request', () => {
    it('minimum request', () => {
      let bid = {
        bidder: 'rxrtb',
        sizes: [[728, 90]],
        bidId: '4d0a6829338a07',
        adUnitCode: 'div-gpt-ad-1460505748561-0',
        auctionId: '20882439e3238c',
        params: {
          id: 89,
          token: '658f11a5efbbce2f9be3f1f146fcbc22',
          source: 'prebidtest'
        },
      };
      const req = JSON.parse(spec.buildRequests([bid])[0].data);

      expect(req).to.have.property('id');
      expect(req).to.have.property('imp');
      expect(req).to.have.property('device');
      expect(req).to.have.property('site');
      expect(req).to.have.property('hb');
      expect(req.imp[0]).to.have.property('id');
      expect(req.imp[0]).to.have.property('banner');
      expect(req.device).to.have.property('ip');
      expect(req.device).to.have.property('ua');
      expect(req.site).to.have.property('id');
      expect(req.site).to.have.property('domain');
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
              w: 728,
              h: 98,
              adm: 'hello',
              crid: 'efgh',
              exp: 5
            }]
          }]
        }
      }, null)[0];

      expect(resp).to.have.property('requestId', 'banner-bid');
      expect(resp).to.have.property('cpm', 0.3);
      expect(resp).to.have.property('width', 728);
      expect(resp).to.have.property('height', 98);
      expect(resp).to.have.property('creativeId', 'efgh');
      expect(resp).to.have.property('ttl', 5);
      expect(resp).to.have.property('ad', 'hello');
    });
  });
});
