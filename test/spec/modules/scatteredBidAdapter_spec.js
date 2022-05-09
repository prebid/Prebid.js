import { spec } from 'modules/scatteredBidAdapter.js';
import { assert } from 'chai';
import { config } from 'src/config.js';
import { deepClone } from '../../../src/utils';
describe('Scattered adapter', function () {
  describe('isBidRequestValid', function () {
    // A valid bid
    let validBid = {
      bidder: 'scattered',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [760, 400]]
        }
      },
      params: {
        bidderDomain: 'https://prebid.scattered.eu',
        test: 0
      }
    }

    // Because this valid bid is modified to create invalid bids in following tests we first check it.
    // We must be sure it is a valid one, not to get false negatives.
    it('should accept a valid bid', function () {
      assert.isTrue(spec.isBidRequestValid(validBid))
    })

    it('should skip if bidderDomain info is missing', function () {
      let bid = deepClone(validBid)

      delete bid.params.bidderDomain
      assert.isFalse(spec.isBidRequestValid(bid))
    })

    it('should expect at least one banner size', function () {
      let bid = deepClone(validBid)

      delete bid.mediaTypes.banner
      assert.isFalse(spec.isBidRequestValid(bid))

      // empty sizes array
      bid.mediaTypes = {
        banner: {
          sizes: []
        }
      }
      assert.isFalse(spec.isBidRequestValid(bid))
    })
  })

  describe('buildRequests', function () {
    beforeEach(function () {
      config.resetConfig();
      config.setConfig({ debug: true })
    });

    let arrayOfValidBidRequests = [{
      bidder: 'scattered',
      params: {
        bidderDomain: 'https://prebid.scattered.eu',
        test: 0
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [760, 400]]
        },
        adUnitCode: 'test-div',
        transactionId: '32d09c47-c6b8-40b0-9605-2e251a472ea4',
        bidId: '21adc5d8765aa1',
        bidderRequestId: '130728f7662afc',
        auctionId: 'b4a45a23-8371-4d87-9308-39146b29ca32',
      },

    }];

    let validBidderRequest = {
      bidderCode: 'scattered',
      auctionId: 'b4a45a23-8371-4d87-9308-39146b29ca32',
      gdprConsent: { consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA', gdprApplies: true },
      refererInfo: {
        referer: 'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
      },
      ortb2: {
        site: {
          publisher: {
            name: 'publisher1 INC.'
          }
        }
      }
    }

    it('should validate request format', function () {
      let request = spec.buildRequests(arrayOfValidBidRequests, validBidderRequest)
      assert.equal(request.method, 'POST');
      assert.deepEqual(request.options, { contentType: 'application/json' });
      assert.ok(request.data);
    })

    it('has the right fields filled', function () {
      let request = spec.buildRequests(arrayOfValidBidRequests, validBidderRequest)
      const bidderRequest = JSON.parse(request.data)
      assert.equal(bidderRequest.id, validBidderRequest.auctionId)
      assert.ok(bidderRequest.site)
      assert.ok(bidderRequest.device)
      assert.ok(bidderRequest.source)
      assert.lengthOf(bidderRequest.imp, 1)
    })

    it('should configure the site object', function () {
      let request = spec.buildRequests(arrayOfValidBidRequests, validBidderRequest)
      const site = JSON.parse(request.data).site
      assert.equal(site.domain, 'localhost')
      assert.equal(site.page, 'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true')
    })

    it('should configure site with ortb2', function () {
      config.setConfig({
        site: {
          id: '876',
          publisher: {
            domain: 'publisher1.eu'
          }
        }
      });
      let request = spec.buildRequests(arrayOfValidBidRequests, validBidderRequest)
      const site = JSON.parse(request.data).site
      assert.deepEqual(site, {
        domain: 'localhost',
        id: '876',
        page: 'http://localhost:9999/integrationExamples/gpt/hello_world.html?pbjs_debug=true',
        publisher: {
          domain: 'publisher1.eu',
          name: 'publisher1 INC.'
        }
      })
    })

    it('should send device info', function () {
      it('should send info about device', function () {
        config.setConfig({
          device: { w: 375, h: 273 }
        });

        let request = spec.buildRequests(arrayOfValidBidRequests, validBidderRequest)
        const site = JSON.parse(request.data).site

        assert.equal(request.device.ua, navigator.userAgent);
        assert.equal(request.device.w, 375);
        assert.equal(request.device.h, 273);
      });
    })
  })

  describe('interpretResponse', function () {
    let serverResponse = {
      body: {
        id: 'b4a45a23-8371-4d87-9308-39146b29ca32',
        bidid: '11111111-2222-2222-2222-333333333333',
        cur: 'PLN',
        seatbid: [{
          bid: [
            {
              id: '234234-234234-234234', // bidder generated
              impid: '1',
              price: '34.2',
              nurl: 'https://scattered.eu/nurl',
              adm: '<html><img src="https://some_banner.jpeg></img></html>',
              cid: '99877',
              crid: '2345-2345-23',
              w: 345,
              h: 456
            }
          ]
        }],
      }
    };

    let request = {
      url: 'https://scattered.eu',
      bidRequests: [
        {
          bidId: '123',
          netRevenue: 'net',
        }
      ]

    };

    it('should return if no body in response', function () {
      assert.ok(!spec.interpretResponse({}, {}));
    });

    it('should set proper values', function () {
      const results = spec.interpretResponse(serverResponse, request)
      const expected = [
        {
          ad: '<html><img src="https://some_banner.jpeg></img></html><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="https://scattered.eu/nurl"></div>',
          cpm: '34.2',
          creativeId: '2345-2345-23',
          currency: 'PLN',
          height: 456,
          width: 345,
          mediaType: 'banner',
          netRevenue: true,
          requestId: '123',
          ttl: 360,
        }
      ]
      assert.deepEqual(results, expected)
    })
  })
})
