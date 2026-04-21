import { expect } from 'chai';
import { spec } from 'modules/flippBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
const ENDPOINT = 'https://ads-flipp.com/flyer-locator-service/client_bidding';
describe('flippAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: 'flipp',
      params: {
        publisherNameIdentifier: 'random',
        siteId: 1234,
        zoneIds: [1, 2, 3, 4],
      }
    };
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      invalidBid.params = { siteId: 1234 }
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      bidder: 'flipp',
      params: {
        siteId: 1234,
      },
      adUnitCode: '/10000/unit_code',
      sizes: [[300, 600]],
      mediaTypes: { banner: { sizes: [[300, 600]] } },
      bidId: '237f4d1a293f99',
      bidderRequestId: '1a857fa34c1c96',
      auctionId: 'a297d1aa-7900-4ce4-a0aa-caa8d46c4af7',
      transactionId: '00b2896c-2731-4f01-83e4-7a3ad5da13b6',
    }];
    const bidderRequest = {
      refererInfo: {
        referer: 'http://example.com'
      }
    };

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.method).to.equal('POST');
    });

    it('sends bid request to ENDPOINT with query parameter', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
    });
  });

  describe('interpretResponse', function() {
    it('should get correct bid response', function() {
      const bidRequest = {
        method: 'POST',
        url: ENDPOINT,
        data: {
          placements: [{
            divName: 'slot',
            networkId: 12345,
            siteId: 12345,
            adTypes: [12345],
            count: 1,
            prebid: {
              requestId: '237f4d1a293f99',
              publisherNameIdentifier: 'bid.params.publisherNameIdentifier',
              height: 600,
              width: 300,
            },
            user: '10462725-da61-4d3a-beff-6d05239e9a6e"',
          }],
          url: 'http://example.com',
        },
      };

      const serverResponse = {
        body: {
          'decisions': {
            'inline': [{
              'bidCpm': 1,
              'adId': 262838368,
              'storefront': { 'flyer_id': 5435567 },
              'prebid': {
                'requestId': '237f4d1a293f99',
                'cpm': 1.11,
                'creative': 'Returned from server',
              },
              'contents': [{
                'data': {
                  'customData': {
                    'compactHeight': 600,
                    'standardHeight': 1800
                  }
                }
              }]
            }]
          },
          'location': { 'city': 'Oakville' },
        },
      };

      const expectedResponse = [
        {
          bidderCode: 'flipp',
          requestId: '237f4d1a293f99',
          currency: 'USD',
          cpm: 1.11,
          netRevenue: true,
          width: 600,
          height: 1800,
          creativeId: 262838368,
          ttl: 30,
          ad: 'Returned from server',
        }
      ];

      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result).to.have.lengthOf(1);
      expect(result).to.deep.have.same.members(expectedResponse);
    });

    it('should return desktop width (600) and standard height from customData when not compact', function() {
      const bidRequest = {
        method: 'POST',
        url: ENDPOINT,
        data: {
          placements: [{
            divName: 'slot',
            networkId: 12345,
            siteId: 12345,
            adTypes: [12345],
            count: 1,
            options: { startCompact: false },
            prebid: { requestId: '237f4d1a293f99' },
          }],
          url: 'http://example.com',
        },
      };
      const serverResponse = {
        body: {
          decisions: {
            inline: [{
              adId: 111,
              prebid: { requestId: '237f4d1a293f99', cpm: 1, creative: 'ad' },
              contents: [{ data: { customData: { compactHeight: 500, standardHeight: 2000 } } }],
            }]
          }
        }
      };
      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result[0].width).to.equal(600);
      expect(result[0].height).to.equal(2000);
    });

    it('should return mobile width (300) and compact height from customData when compact', function() {
      const bidRequest = {
        method: 'POST',
        url: ENDPOINT,
        data: {
          placements: [{
            divName: 'slot',
            networkId: 12345,
            siteId: 12345,
            adTypes: [12345],
            count: 1,
            options: { startCompact: true },
            prebid: { requestId: '237f4d1a293f99' },
          }],
          url: 'http://example.com',
        },
      };
      const serverResponse = {
        body: {
          decisions: {
            inline: [{
              adId: 111,
              prebid: { requestId: '237f4d1a293f99', cpm: 1, creative: 'ad' },
              contents: [{ data: { customData: { compactHeight: 500, standardHeight: 2000 } } }],
            }]
          }
        }
      };
      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(500);
    });

    it('should fall back to default dimensions when customData is absent', function() {
      const bidRequest = {
        method: 'POST',
        url: ENDPOINT,
        data: {
          placements: [
            {
              options: { startCompact: false },
              prebid: { requestId: 'req-desktop' },
            },
            {
              options: { startCompact: true },
              prebid: { requestId: 'req-mobile' },
            },
          ],
          url: 'http://example.com',
        },
      };
      const serverResponse = {
        body: {
          decisions: {
            inline: [
              {
                adId: 1,
                prebid: { requestId: 'req-desktop', cpm: 1, creative: 'ad' },
                contents: [],
              },
              {
                adId: 2,
                prebid: { requestId: 'req-mobile', cpm: 1, creative: 'ad' },
                contents: [],
              },
            ]
          }
        }
      };
      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result[0].width).to.equal(600);
      expect(result[0].height).to.equal(1800);
      expect(result[1].width).to.equal(300);
      expect(result[1].height).to.equal(600);
    });

    it('should get empty bid response when no ad is returned', function() {
      const bidRequest = {
        method: 'POST',
        url: ENDPOINT,
        data: {
          placements: [{
            divName: 'slot',
            networkId: 12345,
            siteId: 12345,
            adTypes: [12345],
            count: 1,
            prebid: {
              requestId: '237f4d1a293f99',
              publisherNameIdentifier: 'bid.params.publisherNameIdentifier',
              height: 600,
              width: 300,
            },
            user: '10462725-da61-4d3a-beff-6d05239e9a6e"',
          }],
          url: 'http://example.com',
        },
      };

      const serverResponse = {
        body: {
          'decisions': {
            'inline': []
          },
          'location': { 'city': 'Oakville' },
        },
      };

      const result = spec.interpretResponse(serverResponse, bidRequest);
      expect(result).to.have.lengthOf(0);
      expect(result).to.deep.have.same.members([]);
    })

    it('should get empty response when bid server returns 204', function() {
      expect(spec.interpretResponse({})).to.be.empty;
    });
  });
});
