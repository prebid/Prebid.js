import { expect } from 'chai';
import { spec } from 'modules/uniquestBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const ENDPOINT = 'https://adpb.ust-ad.com/hb/prebid';

describe('UniquestAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const request = {
        bidder: 'uniquest',
        params: {
          sid: 'sid_0001',
        },
      };
      expect(spec.isBidRequestValid(request)).to.equal(true)
    })

    it('should return false when required params are not passed', function () {
      expect(spec.isBidRequestValid({})).to.equal(false)
      expect(spec.isBidRequestValid({ sid: '' })).to.equal(false)
    })
  })

  describe('buildRequest', function () {
    const bids = [
      {
        bidder: 'uniquest',
        params: {
          sid: 'sid_0001',
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [300, 300],
          [300, 250],
          [320, 100],
        ],
        bidId: '259d7a594535852',
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
      expect(requests[0].data).to.equal('bid=259d7a594535852&sid=sid_0001&widths=300%2C300%2C320&heights=300%2C250%2C100&timeout=1500&')
    })
  })

  describe('interpretResponse', function() {
    it('should return a valid bid response', function () {
      const serverResponse = {
        request_id: '247f62f777e5e4',
        cpm: 12.3,
        currency: 'JPY',
        width: 300,
        height: 250,
        bid_id: 'bid_0001',
        deal_id: '',
        net_revenue: false,
        ttl: 300,
        ad: '<div class="uniquest-ad"></div>',
        media_type: 'banner',
        meta: {
          advertiser_domains: ['advertiser.com'],
        },
      };
      const expectResponse = [{
        requestId: '247f62f777e5e4',
        cpm: 12.3,
        currency: 'JPY',
        width: 300,
        height: 250,
        ad: '<div class="uniquest-ad"></div>',
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
