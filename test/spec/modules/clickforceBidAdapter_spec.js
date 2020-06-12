import { expect } from 'chai';
import { spec } from 'modules/clickforceBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

describe('ClickforceAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
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

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'someIncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
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

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });
  });

  describe('interpretResponse', function () {
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

    let response1 = [{
      'cpm': 0.0625,
      'width': '3',
      'height': '3',
      'callback_uid': '2e27ec595bf1a',
      'type': 'public Bid',
      'tag': {
        'content': {
          'title': 'title',
          'content': 'content',
          'advertiser': 'advertiser',
          'button_text': 'button_text',
          'image': 'image',
          'icon': 'icon'
        },
        'cu': ['cu'],
        'iu': ['iu'],
        'p': '6878:11062:32586:8380573788dad9b9fc17edde444c4dcf:2795'
      },
      'creativeId': '8380573788dad9b9fc17edde444c4dcf-6878',
      'requestId': '2e27ec595bf1a',
      'currency': 'USD',
      'ttl': 60,
      'netRevenue': true,
      'zone': '6878'
    }];

    let expectedResponse = [{
      'requestId': '220ed41385952a',
      'cpm': 0.5,
      'width': '300',
      'height': '250',
      'creativeId': '1f99ac5c3ef10a4097499a5686b30aff-6682',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 60,
      'ad': '<!-- test creative -->',
      'mediaType': 'banner',
    }];

    let expectedResponse1 = [{
      'requestId': '2e27ec595bf1a',
      'cpm': 0.0625,
      'width': '3',
      'height': '3',
      'creativeId': '8380573788dad9b9fc17edde444c4dcf-6878',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 60,
      'mediaType': 'native',
      'native': {
        'image': {
          'url': 'image',
          'width': 1600,
          'height': 900
        },
        'title': 'title',
        'sponsoredBy': 'advertiser',
        'body': 'content',
        'icon': {
          'url': 'icon',
          'width': 900,
          'height': 900
        },
        'clickUrl': 'cu',
        'impressionTrackers': ['iu']
      }
    }];

    it('should get the correct bid response by display ad', function () {
      let bidderRequest;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should get the correct bid response by native ad', function () {
      let bidderRequest;
      let result = spec.interpretResponse({ body: response1 }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse1[0]));
    });

    it('handles empty bid response', function () {
      let response = {
        body: {}
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs function', function () {
    it('should register type is iframe', function () {
      const syncOptions = {
        'iframeEnabled': 'true'
      }
      let userSync = spec.getUserSyncs(syncOptions);
      expect(userSync[0].type).to.equal('iframe');
      expect(userSync[0].url).to.equal('https://cdn.holmesmind.com/js/capmapping.htm');
    });

    it('should register type is image', function () {
      const syncOptions = {
        'pixelEnabled': 'true'
      }
      let userSync = spec.getUserSyncs(syncOptions);
      expect(userSync[0].type).to.equal('image');
      expect(userSync[0].url).to.equal('https://c.holmesmind.com/cm');
    });
  });
});
