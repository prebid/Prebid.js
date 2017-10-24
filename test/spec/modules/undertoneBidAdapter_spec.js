import { expect } from 'chai';
import { spec } from 'modules/undertoneBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('Undertone Adapter', () => {
  describe('request', () => {
    let validBidReq = {
      bidder: 'undertone',
      params: {
        placementId: '123456789',
        publisherId: '123'
      },
      sizes: [[300, 250], [300, 600]],
      bidId: '263be71e91dd9d',
      requestId: '9ad1fa8d-2297-4660-a018-b39945054746'
    };

    let unvalidBidReq = {
      bidder: 'undertone',
      params: {
        placementId: '123456789'
      },
      sizes: [[300, 250], [300, 600]],
      bidId: '263be71e91dd9d',
      requestId: '9ad1fa8d-2297-4660-a018-b39945054746'
    };

    it('should validate bid request', () => {
      expect(spec.isBidRequestValid(validBidReq)).to.equal(true);
    });
    it('should not validate incorrect bid request', () => {
      expect(spec.isBidRequestValid(unvalidBidReq)).to.equal(false);
    });
  });
});
