import { expect } from 'chai';
import { spec } from 'modules/uniquest_widgetBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const ENDPOINT = 'https://adpb.ust-ad.com/hb/prebid/widgets';

describe('uniquest_widgetBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const request = {
        bidder: 'uniquest_widget',
        params: {
          wid: 'wid_0001',
        },
      };
      expect(spec.isBidRequestValid(request)).to.equal(true)
    })

    it('should return false when required params are not passed', function () {
      expect(spec.isBidRequestValid({})).to.equal(false)
      expect(spec.isBidRequestValid({ wid: '' })).to.equal(false)
    })
  })

  describe('buildRequest', function () {
    const bids = [
      {
        bidder: 'uniquest_widget',
        params: {
          wid: 'wid_0001',
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [1, 1],
        ],
        bidId: '359d7a594535852',
        bidderRequestId: '247f62f777e5e4',
      }
    ];
    const bidderRequest = {
      timeout: 1500,
    }
    it('sends bid request to ENDPOINT via GET', function () {
      const requests = spec.buildRequests(bids, bidderRequest);
      expect(requests[0].url).to.equal(ENDPOINT);
      expect(requests[0].method).to.equal('GET');
      expect(requests[0].data).to.equal('bid=359d7a594535852&wid=wid_0001&widths=1&heights=1&timeout=1500&')
    })
  })

  describe('interpretResponse', function() {
    it('should return a valid bid response', function () {
      const serverResponse = {
        request_id: '347f62f777e5e4',
        cpm: 12.3,
        currency: 'JPY',
        width: 1,
        height: 1,
        bid_id: 'bid_0001',
        deal_id: '',
        net_revenue: false,
        ttl: 300,
        ad: '<div class="uniquest-widget"></div>',
        media_type: 'banner',
        meta: {
          advertiser_domains: ['advertiser.com'],
        },
      };
      const expectResponse = [{
        requestId: '347f62f777e5e4',
        cpm: 12.3,
        currency: 'JPY',
        width: 1,
        height: 1,
        ad: '<div class="uniquest-widget"></div>',
        creativeId: 'bid_0001',
        netRevenue: false,
        mediaType: 'banner',
        ttl: 300,
        meta: {
          advertiserDomains: ['advertiser.com'],
        }
      }];
      const result = spec.interpretResponse({ body: serverResponse }, {});
      expect(result).to.have.lengthOf(1);
      expect(result).to.deep.have.same.members(expectResponse);
    })

    it('should return an empty array to indicate no valid bids', function () {
      const result = spec.interpretResponse({ body: {} }, {})
      expect(result).is.an('array').is.empty;
    })
  })
})
