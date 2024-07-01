import { expect } from 'chai';
import { spec, OPTIMIZATIONS_STORAGE_KEY, getOptimizationsFromLocalStorage } from 'modules/mediaConsortiumBidAdapter.js';

describe('Media Consortium Bid Adapter', function () {
  describe('buildRequests', function () {
    const bids = [{
      adUnitCode: 'dfp_ban_atf',
      bidId: '2f0d9715f60be8',
      mediaTypes: {
        banner: {sizes: [[300, 250]]}
      }
    }];

    const bidderRequest = {
      auctionId: '98bb5f61-4140-4ced-8b0e-65a33d792ab8',
      bids,
      ortb2: {
        device: {
          w: 1200,
          h: 400,
          dnt: 0
        },
        site: {
          page: 'http://localhost.com',
          domain: 'localhost.com'
        }
      }
    };

    it('should build a banner request', function () {
      // The local storage variable is not cleaned in some other test so we need to do it ourselves here
      localStorage.removeItem('ope_fpid')

      const builtSyncRequest = {
        gdpr: false,
        ad_unit_codes: 'dfp_ban_atf'
      }

      const builtBidRequest = {
        id: '98bb5f61-4140-4ced-8b0e-65a33d792ab8',
        impressions: [{
          id: '2f0d9715f60be8',
          adUnitCode: 'dfp_ban_atf',
          mediaTypes: {
            banner: {sizes: [[300, 250]]}
          }
        }],
        device: {
          w: 1200,
          h: 400,
          dnt: 0
        },
        site: {
          page: 'http://localhost.com',
          domain: 'localhost.com'
        },
        user: {
          ids: {}
        },
        regulations: {
          gdpr: {
            applies: false,
            consentString: undefined
          }
        },
        timeout: 3600
      }

      const [syncRequest, auctionRequest] = spec.buildRequests(bids, bidderRequest);

      expect(syncRequest.data).to.deep.equal(builtSyncRequest)
      expect(auctionRequest.data).to.deep.equal(builtBidRequest)
    })

    it('should not build banner request if optimizations are there for the adunit code', function () {
      const optimizations = {
        [bids[0].adUnitCode]: {isEnabled: false, expiresAt: Date.now() + 600000}
      }

      localStorage.setItem(OPTIMIZATIONS_STORAGE_KEY, JSON.stringify(optimizations))

      const requests = spec.buildRequests(bids, bidderRequest);

      localStorage.removeItem(OPTIMIZATIONS_STORAGE_KEY)

      expect(requests).to.be.undefined
    })
  })

  describe('interpretResponse', function () {
    it('should return an empty array if the response is invalid', function () {
      expect(spec.interpretResponse({body: 'INVALID_BODY'}, {})).to.deep.equal([]);
    })

    it('should return a formatted bid', function () {
      const serverResponse = {
        body: {
          id: 'requestId',
          bids: [{
            impressionId: '2f0d9715f60be8',
            price: {
              cpm: 1,
              currency: 'JPY'
            },
            dealId: 'TEST_DEAL_ID',
            ad: {
              creative: {
                id: 'CREATIVE_ID',
                mediaType: 'banner',
                size: {width: 320, height: 250},
                markup: '<html><body><div>${AUCTION_PRICE}</div></body></html>'
              }
            },
            ttl: 3600
          }],
          optimizations: [
            {
              adUnitCode: 'test_ad_unit_code',
              isEnabled: false,
              ttl: 12000
            },
            {
              adUnitCode: 'test_ad_unit_code_2',
              isEnabled: true,
              ttl: 12000
            }
          ]
        }
      }

      const formattedBid = {
        requestId: '2f0d9715f60be8',
        cpm: 1,
        currency: 'JPY',
        dealId: 'TEST_DEAL_ID',
        ttl: 3600,
        netRevenue: true,
        creativeId: 'CREATIVE_ID',
        mediaType: 'banner',
        width: 320,
        height: 250,
        ad: '<html><body><div>1</div></body></html>',
        adUrl: null
      }

      const formattedResponse = spec.interpretResponse(serverResponse, {})
      const storedOptimizations = getOptimizationsFromLocalStorage()

      localStorage.removeItem(OPTIMIZATIONS_STORAGE_KEY)

      expect(formattedResponse).to.deep.equal([formattedBid]);

      expect(storedOptimizations['test_ad_unit_code']).to.exist
      expect(storedOptimizations['test_ad_unit_code'].isEnabled).to.equal(false)
      expect(storedOptimizations['test_ad_unit_code'].expiresAt).to.be.a('number')

      expect(storedOptimizations['test_ad_unit_code_2']).to.exist
      expect(storedOptimizations['test_ad_unit_code_2'].isEnabled).to.equal(true)
      expect(storedOptimizations['test_ad_unit_code_2'].expiresAt).to.be.a('number')
    })
  });

  describe('getUserSyncs', function () {
    it('should return an empty response if the response is invalid or missing data', function () {
      expect(spec.getUserSyncs(null, [{body: 'INVALID_BODY'}])).to.be.undefined;
      expect(spec.getUserSyncs(null, [{body: 'INVALID_BODY'}, {body: 'INVALID_BODY'}])).to.be.undefined;
    })

    it('should return an array of user syncs', function () {
      const serverResponses = [
        {
          body: {
            bidders: [
              {type: 'image', url: 'https://test-url.com'},
              {type: 'redirect', url: 'https://test-url.com'},
              {type: 'iframe', url: 'https://test-url.com'}
            ]
          }
        },
        {
          body: 'BID-RESPONSE-DATA'
        }
      ]

      const formattedUserSyncs = [
        {type: 'image', url: 'https://test-url.com'},
        {type: 'image', url: 'https://test-url.com'},
        {type: 'iframe', url: 'https://test-url.com'}
      ]

      expect(spec.getUserSyncs(null, serverResponses)).to.deep.equal(formattedUserSyncs);
    })
  });
});
