import {expect} from 'chai';
import {spec} from 'modules/koblerBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory';

describe('KoblerAdapter', function () {
  describe('inherited functions', function () {
    it('exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    it('should not accept a request without bidId as valid', function() {
      const bid = {
        params: {
          someParam: 'abc'
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without params as valid', function() {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589'
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should not accept a request without placementId as valid', function() {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        params: {
          someParam: 'abc'
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.false;
    });

    it('should accept a request with bidId and placementId as valid', function() {
      const bid = {
        bidId: 'e11768e8-3b71-4453-8698-0a2feb866589',
        params: {
          someParam: 'abc',
          placementId: '8bde0923-1409-4253-9594-495b58d931ba'
        }
      };

      const result = spec.isBidRequestValid(bid);

      expect(result).to.be.true;
    });
  });
});
