import { expect } from 'chai';
import { spec } from 'modules/clickforceBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('ClickforceAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'clickforce',
      'params': {
        'zone': '6682'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'someIncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [{
      'bidder': 'clickforce',
      'params': {
        'zone': '6682'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via POST', () => {
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponse', () => {
    let response = [{
      'cpm': 0.5,
      'width': '300',
      'height': '250',
      'callback_uid': '220ed41385952a',
      'type': 'Default Ad',
      'tag': '<!-- test creative -->',
      'creativeId': '1f99ac5c3ef10a4097499a5686b30aff-6682',
      'requestId': '220ed41385952a',
      'currency': 'USD',
      'ttl': 60,
      'netRevenue': true,
      'zone': '6682'
    }];

    it('should get the correct bid response', () => {
      let expectedResponse = [{
        'requestId': '220ed41385952a',
        'cpm': 0.5,
        'width': '300',
        'height': '250',
        'creativeId': '1f99ac5c3ef10a4097499a5686b30aff-6682',
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 60,
        'ad': '<!-- test creative -->'
      }];

      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles empty bid response', () => {
      let response = {
        body: {}
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs function', () => {
    it('should register type is iframe', () => {
      const syncOptions = {
        'iframeEnabled': 'true'
      }
      let userSync = spec.getUserSyncs(syncOptions);
      expect(userSync[0].type).to.equal('iframe');
      expect(userSync[0].url).to.equal('https://cdn.doublemax.net/js/capmapping.htm');
    });

    it('should register type is image', () => {
      const syncOptions = {
        'pixelEnabled': 'true'
      }
      let userSync = spec.getUserSyncs(syncOptions);
      expect(userSync[0].type).to.equal('image');
      expect(userSync[0].url).to.equal('https://c.doublemax.net/cm');
    });
  });
});
