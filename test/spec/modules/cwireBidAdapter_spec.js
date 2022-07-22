import {expect} from 'chai';
import {newBidder} from '../../../src/adapters/bidderFactory';
import {ENDPOINT_URL, spec} from '../../../modules/cwireBidAdapter';

describe('C-WIRE bid adapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(spec.isBidRequestValid).to.exist.and.to.be.a('function');
      expect(spec.buildRequests).to.exist.and.to.be.a('function');
      expect(spec.interpretResponse).to.exist.and.to.be.a('function');
    });
  });
  describe('buildRequests', function () {
    let utilsStub;
    let bidRequests = [
      {
        'bidder': 'cwire',
        'params': {
          'placementId': '4057'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'transactionId': '04f2659e-c005-4eb1-a57c-fa93145e3843'
      }
    ];

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.method).to.equal('POST');
    });
  })
});
