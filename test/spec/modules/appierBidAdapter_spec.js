import { expect } from 'chai';
import { spec, BIDDER_API_URL } from 'modules/appierBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('AppierAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'appier',
      'params': {
        'zoneId': 'abcd'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params zoneId found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required param zoneId is missing', function () {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required param zoneId has wrong type', function () {
      let bid = Object.assign({}, bid);
      bid.params = {
        'zoneId': null
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    it('should return an empty list when there are no bid requests', function() {
      let fakeBidRequests = [];
      let fakeBidderRequest = {};
      expect(spec.buildRequests(fakeBidRequests, fakeBidderRequest)).to.be.an('array').that.is.empty;
    });

    it('should generate a POST bid request with method, url, and data fields', function() {
      let bid = {
        'bidder': 'appier',
        'params': {
          'zoneId': 'abcd'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
      let fakeBidRequests = [bid];
      let fakeBidderRequest = {};

      let builtRequests = spec.buildRequests(fakeBidRequests, fakeBidderRequest);
      expect(builtRequests.length).to.equal(1);
      expect(builtRequests[0].method).to.equal('POST');
      expect(builtRequests[0].url).match(/v1\/prebid\/bid/);
      expect(builtRequests[0].data).deep.equal(fakeBidRequests);
    });
  });
});
