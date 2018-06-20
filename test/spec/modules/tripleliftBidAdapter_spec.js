import { expect } from 'chai';
import { tripleliftAdapterSpec } from 'modules/tripleliftBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { deepClone } from 'src/utils';
// import {parse as parseURL} from '../../../src/url';
const ENDPOINT = document.location.protocol + '//tlx.3lift.com/header/auction?';

describe('triplelift adapter', () => {
  const adapter = newBidder(tripleliftAdapterSpec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      bidder: 'triplelift',
      params: {
        'inventoryCode': '12345',
        'floor': 1.0,
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'inventoryCode': 'another_inv_code',
        'floor': 0.05
      };
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'floor': 1.0
      };
      expect(tripleliftAdapterSpec.isBidRequestValid(bid)).to.equal(false);
    });
  });
});
//
//   const request = spec.buildRequests([bidRequest]);
//   const payload = request.data;
//
//   expect(payload[0].id).to.exist;
//   expect(payload[0].tagid).to.equal('12345');
//   expect(payload[0].floor).to.equal(1.0);
//   expect(payload[0].banner.format).to.deep.equal([[300, 250], [300, 600]]);
// });
//
