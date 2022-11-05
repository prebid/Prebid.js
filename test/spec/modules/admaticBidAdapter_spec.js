import {expect} from 'chai';
import {spec, storage} from 'modules/admaticBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {getStorageManager} from 'src/storageManager';

const ENDPOINT = 'https://layer.serve.admatic.com.tr/v1';

describe('admaticBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    let bid = {
      'bidder': 'admatic',
      'params': {
        'networkId': 10433394
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'creativeId': 'er2ee'
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;

      bid.params = {
        'networkId': 0
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });
});
