import { expect } from 'chai';
import { spec } from 'modules/buyerBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT_URL = 'https://buyer.dspx.tv/request/';

describe('buyerAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'buyer',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
      },
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
      'bidder': 'buyer',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000,
          'private_auction': 0,
          'geo': {
            'country': 'DE'
          }
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via GET', function () {
      expect(request[0].method).to.equal('GET');
      let data = request[0].data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid');
      expect(data).to.equal('_f=html&alternative=prebid_js&inventory_item_id=6682&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bprivate_auction%5D=0&pfilter%5Bgeo%5D%5Bcountry%5D=DE&bcat=IAB2%2CIAB4&dvt=desktop');
    });
  });

  describe('interpretResponse', function () {
    let serverResponse = {
      'body': {
        'cpm': 5000000,
        'crid': 100500,
        'width': '300',
        'height': '250',
        'tag': '<!-- test creative -->',
        'requestId': '220ed41385952a',
        'currency': 'EUR',
        'ttl': 60,
        'netRevenue': true,
        'zone': '6682'
      }
    };

    let expectedResponse = [{
      requestId: '23beaa6af6cdde',
      cpm: 0.5,
      width: 0,
      height: 0,
      creativeId: 100500,
      dealId: '',
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      referrer: '',
      ad: '<!-- test creative -->'
    }];

    it('should get the correct bid response by display ad', function () {
      let bidRequest = [{
        'method': 'GET',
        'url': ENDPOINT_URL,
        'data': {
          'bid_id': '30b31c1838de1e'
        }
      }];
      let result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
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
    it('should be empty', function () {
      const syncOptions = {
        'iframeEnabled': 'true'
      };
      let userSync = spec.getUserSyncs(syncOptions);
      expect(userSync.length).to.equal(0);
    });
  });
});
