import { expect } from 'chai';
import { config } from 'src/config.js';
import { spec } from 'modules/ipromBidAdapter.js';

describe('iPROM Adapter', function () {
  let bidRequests;
  let bidderRequest;

  beforeEach(function () {
    config.resetConfig();
    bidRequests = [
      {
        bidder: 'iprom',
        params: {
          id: '1234',
          dimension: '300x250',
        },
        adUnitCode: '/19966331/header-bid-tag-1',
        mediaTypes: {
          banner: {
            sizes: [[300, 250], [300, 600]],
          }
        },
        bidId: '29a72b151f7bd3',
        auctionId: 'e36abb27-g3b1-1ad6-8a4c-701c8919d3hh',
        bidderRequestId: '2z76da40m1b3cb8',
        transactionId: 'j51lhf58-1ad6-g3b1-3j6s-912c9493g0gu'
      }
    ];

    bidderRequest = {
      timeout: 3000,
      refererInfo: {
        reachedTop: true,
        numIframes: 1,
        stack: [
          'https://adserver.si/index.html',
          'https://adserver.si/iframe1.html',
        ],
        topmostLocation: 'https://adserver.si/index.html',
      }
    }
  });

  afterEach(function () {
    config.resetConfig();
  });

  describe('validating bids', function () {
    it('should accept valid bid with only id', function () {
      const validBid = {
        bidder: 'iprom',
        params: {
          id: '1234'
        },
      };

      const isValid = spec.isBidRequestValid(validBid);

      expect(isValid).to.equal(true);
    });

    it('should reject bid if missing dimension and id', function () {
      const invalidBid = {
        bidder: 'iprom',
        params: {}
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should reject bid if dimension is not a string', function () {
      const invalidBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          dimension: 404,
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should reject bid if missing id', function () {
      const invalidBid = {
        bidder: 'iprom',
        params: {
          dimension: '300x250',
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should reject bid if id is not a string', function () {
      const invalidBid = {
        bidder: 'iprom',
        params: {
          id: 1234,
          dimension: '300x250',
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should reject bid if endpoint param is not a valid URL', function () {
      const invalidBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          endpoint: 'not-a-valid-url',
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should accept bid if endpoint param is a valid URL', function () {
      const validBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          endpoint: 'https://custom.iprom.net/programmatic',
        }
      };

      const isValid = spec.isBidRequestValid(validBid);

      expect(isValid).to.equal(true);
    });

    it('should reject bid if ortb param is not a boolean', function () {
      const invalidBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          ortb: 'true',
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should accept bid if ortb param is true', function () {
      const validBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          ortb: true,
        }
      };

      const isValid = spec.isBidRequestValid(validBid);

      expect(isValid).to.equal(true);
    });
  });

  describe('building requests', function () {
    it('should go to correct endpoint', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);

      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].method).to.exist;
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.exist;
      expect(requests[0].url).to.equal('https://core.iprom.net/programmatic');
    });

    it('should use custom endpoint from ad unit params with legacy format', function () {
      const bidRequestsWithCustomEndpoint = bidRequests.map(bid => ({
        ...bid,
        params: { ...bid.params, endpoint: 'https://global.iprom.net/programmatic' }
      }));
      const requests = spec.buildRequests(bidRequestsWithCustomEndpoint, bidderRequest);

      expect(requests[0].url).to.equal('https://global.iprom.net/programmatic');
      expect(requests[0].ortb).to.be.undefined;
      expect(requests[0].data).to.be.a('string');
    });

    it('should use ORTB format when ortb param is true', function () {
      const bidRequestsWithOrtb = bidRequests.map(bid => ({
        ...bid,
        params: { ...bid.params, ortb: true }
      }));
      const requests = spec.buildRequests(bidRequestsWithOrtb, bidderRequest);

      expect(requests[0].url).to.equal('https://core.iprom.net/programmatic');
      expect(requests[0].ortb).to.equal(true);
      expect(requests[0].data).to.be.an('object');
      expect(requests[0].data.imp).to.be.an('array').with.lengthOf(1);
      expect(requests[0].data.bids).to.be.undefined;
    });

    it('should include id and dimension in imp.ext.bidder for ORTB requests', function () {
      const bidRequestsWithOrtb = bidRequests.map(bid => ({
        ...bid,
        params: { ...bid.params, ortb: true }
      }));
      const requests = spec.buildRequests(bidRequestsWithOrtb, bidderRequest);

      expect(requests[0].data.imp[0].ext.bidder).to.deep.equal({
        id: '1234',
        dimension: '300x250'
      });
    });

    it('should include only id in imp.ext.bidder when dimension is not set', function () {
      const bidRequestsWithOrtb = [{
        ...bidRequests[0],
        params: {
          id: '1234',
          ortb: true
        }
      }];
      const requests = spec.buildRequests(bidRequestsWithOrtb, bidderRequest);

      expect(requests[0].data.imp[0].ext.bidder).to.deep.equal({
        id: '1234'
      });
    });

    it('should use custom endpoint with ORTB format when both endpoint and ortb params are set', function () {
      const bidRequestsWithBoth = bidRequests.map(bid => ({
        ...bid,
        params: { ...bid.params, endpoint: 'https://global.iprom.net/programmatic', ortb: true }
      }));
      const requests = spec.buildRequests(bidRequestsWithBoth, bidderRequest);

      expect(requests[0].url).to.equal('https://global.iprom.net/programmatic');
      expect(requests[0].ortb).to.equal(true);
      expect(requests[0].data).to.be.an('object');
      expect(requests[0].data.imp).to.be.an('array').with.lengthOf(1);
      expect(requests[0].data.bids).to.be.undefined;
    });

    it('should include schain in ORTB request when present in bidderRequest.ortb2', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'exchange1.com',
          sid: '00001',
          hp: 1
        }]
      };
      const bidRequestsWithOrtb = bidRequests.map(bid => ({
        ...bid,
        params: { ...bid.params, endpoint: 'https://global.iprom.net/programmatic', ortb: true }
      }));
      const bidderRequestWithGlobalSchain = {
        ...bidderRequest,
        ortb2: {
          source: {
            ext: {
              schain
            }
          }
        }
      };

      const requests = spec.buildRequests(bidRequestsWithOrtb, bidderRequestWithGlobalSchain);

      expect(requests[0].data.source.ext.schain).to.deep.equal(schain);
    });

    it('should include referer info in ORTB request site.ext when present', function () {
      const bidRequestsWithOrtb = bidRequests.map(bid => ({
        ...bid,
        params: { ...bid.params, ortb: true }
      }));
      const requests = spec.buildRequests(bidRequestsWithOrtb, bidderRequest);

      expect(requests[0].data.site.ext.reachedTop).to.equal(true);
      expect(requests[0].data.site.ext.numIframes).to.equal(1);
      expect(requests[0].data.site.ext.stack).to.deep.equal([
        'https://adserver.si/index.html',
        'https://adserver.si/iframe1.html',
      ]);
    });

    it('should not add referer ext fields to ORTB request when refererInfo is missing', function () {
      const bidRequestsWithOrtb = bidRequests.map(bid => ({
        ...bid,
        params: { ...bid.params, ortb: true }
      }));
      const bidderRequestWithoutReferer = { ...bidderRequest, refererInfo: undefined };
      const requests = spec.buildRequests(bidRequestsWithOrtb, bidderRequestWithoutReferer);

      expect(requests[0].data.site?.ext?.reachedTop).to.be.undefined;
      expect(requests[0].data.site?.ext?.numIframes).to.be.undefined;
      expect(requests[0].data.site?.ext?.stack).to.be.undefined;
    });

    it('should group bids with different endpoints into separate requests', function () {
      const bidRequest1 = {
        ...bidRequests[0],
        bidId: 'bid1',
        params: { ...bidRequests[0].params, endpoint: 'https://endpoint1.iprom.net/programmatic' }
      };
      const bidRequest2 = {
        ...bidRequests[0],
        bidId: 'bid2',
        params: { ...bidRequests[0].params, endpoint: 'https://endpoint2.iprom.net/programmatic' }
      };
      const requests = spec.buildRequests([bidRequest1, bidRequest2], bidderRequest);

      expect(requests).to.be.an('array').with.lengthOf(2);
      const urls = requests.map(r => r.url);
      expect(urls).to.include('https://endpoint1.iprom.net/programmatic');
      expect(urls).to.include('https://endpoint2.iprom.net/programmatic');
    });

    it('should group bids with same endpoint but different ortb into separate requests', function () {
      const bidRequest1 = {
        ...bidRequests[0],
        bidId: 'bid1',
        params: { ...bidRequests[0].params, ortb: true }
      };
      const bidRequest2 = {
        ...bidRequests[0],
        bidId: 'bid2',
        params: { ...bidRequests[0].params, ortb: false }
      };
      const requests = spec.buildRequests([bidRequest1, bidRequest2], bidderRequest);

      expect(requests).to.be.an('array').with.lengthOf(2);

      const ortbRequest = requests.find(r => r.ortb === true);
      const legacyRequest = requests.find(r => r.ortb === undefined);

      expect(ortbRequest).to.exist;
      expect(ortbRequest.data).to.be.an('object');
      expect(ortbRequest.data.imp).to.be.an('array').with.lengthOf(1);

      expect(legacyRequest).to.exist;
      expect(legacyRequest.data).to.be.a('string');
    });

    it('should group bids with same endpoint and ortb into a single request', function () {
      const bidRequest1 = {
        ...bidRequests[0],
        bidId: 'bid1',
        params: { ...bidRequests[0].params, ortb: true }
      };
      const bidRequest2 = {
        ...bidRequests[0],
        bidId: 'bid2',
        params: { ...bidRequests[0].params, ortb: true }
      };
      const requests = spec.buildRequests([bidRequest1, bidRequest2], bidderRequest);

      expect(requests).to.be.an('array').with.lengthOf(1);
      expect(requests[0].data.imp).to.be.an('array').with.lengthOf(2);
    });

    it('should add only selected referer info', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const requestparse = JSON.parse(requests[0].data);

      expect(requestparse.referer).to.deep.equal({
        reachedTop: true,
        referer: 'https://adserver.si/index.html',
        numIframes: 1,
        stack: [
          'https://adserver.si/index.html',
          'https://adserver.si/iframe1.html',
        ]
      });
      expect(requestparse.referer.canonicalUrl).to.be.undefined;
      expect(requestparse.referer.legacy).to.be.undefined;
    });

    it('should add adapter version', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const requestparse = JSON.parse(requests[0].data);

      expect(requestparse.version).to.exist;
    });

    it('should add TCF data', function () {
      const bidderRequestWithTcf = {
        ...bidderRequest,
        gdprConsent: {
          consentString: 'consent-string',
          gdprApplies: true,
          addtlConsent: 'addtl-consent'
        }
      };
      const requests = spec.buildRequests(bidRequests, bidderRequestWithTcf);
      const requestparse = JSON.parse(requests[0].data);

      expect(requestparse.tcf).to.deep.equal({
        consentString: 'consent-string',
        gdprApplies: true,
        addtlConsent: 'addtl-consent'
      });
    });

    it('should add schain data', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'exchange1.com',
          sid: '00001',
          hp: 1
        }]
      };
      const bidderRequestWithSchain = {
        ...bidderRequest,
        ortb2: {
          source: {
            ext: {
              schain
            }
          }
        }
      };
      const requests = spec.buildRequests(bidRequests, bidderRequestWithSchain);
      const requestparse = JSON.parse(requests[0].data);

      expect(requestparse.schain).to.deep.equal(schain);
    });

    it('should keep schain only at top level', function () {
      const schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'exchange1.com',
          sid: '00001',
          hp: 1
        }]
      };
      const bidderRequestWithFpdAndSchain = {
        ...bidderRequest,
        ortb2: {
          source: {
            ext: {
              schain
            }
          },
          site: {
            domain: 'adserver.si'
          }
        }
      };
      const requests = spec.buildRequests(bidRequests, bidderRequestWithFpdAndSchain);
      const requestparse = JSON.parse(requests[0].data);

      expect(requestparse.schain).to.deep.equal(schain);
      expect(requestparse.firstPartyData).to.be.undefined;
    });

    it('should add first party data', function () {
      const firstPartyData = {
        site: {
          domain: 'adserver.si',
          page: 'https://adserver.si/index.html'
        },
        user: {
          data: [{
            name: 'taxonomy',
            segment: [{ id: 'segment-id' }]
          }]
        }
      };
      const bidderRequestWithFpd = {
        ...bidderRequest,
        ortb2: firstPartyData
      };
      const requests = spec.buildRequests(bidRequests, bidderRequestWithFpd);
      const requestparse = JSON.parse(requests[0].data);

      expect(requestparse.firstPartyData).to.deep.equal({
        user: {
          data: [{
            name: 'taxonomy',
            segment: [{ id: 'segment-id' }]
          }]
        }
      });
    });

    it('should contain id and dimension', function () {
      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const requestparse = JSON.parse(requests[0].data);

      expect(requestparse.bids[0].params.id).to.equal('1234');
      expect(requestparse.bids[0].params.dimension).to.equal('300x250');
    });
  });

  describe('handling responses', function () {
    it('should return complete bid response', function () {
      const serverResponse = {
        body: [{
          requestId: '29a72b151f7bd3',
          cpm: 0.5,
          width: '300',
          height: '250',
          creativeId: 1234,
          ad: '<html><head><title>Iprom Header bidding example</title></head><body><img src="https://iprom.si/files/2015/08/iprom-logo.svg"></body></html>',
          aDomains: ['https://example.com'],
        }
        ]
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, requests[0]);

      expect(bids).to.be.lengthOf(1);
      expect(bids[0].requestId).to.equal('29a72b151f7bd3');
      expect(bids[0].cpm).to.equal(0.5);
      expect(bids[0].width).to.equal('300');
      expect(bids[0].height).to.equal('250');
      expect(bids[0].ad).to.have.length.above(1);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['https://example.com']);
    });

    it('should preserve false netRevenue and zero ttl from response', function () {
      const serverResponse = {
        body: [{
          requestId: '29a72b151f7bd3',
          cpm: 0.5,
          width: 300,
          height: 250,
          creativeId: 1234,
          ad: '<div>ad</div>',
          netRevenue: false,
          ttl: 0,
          currency: 'USD'
        }]
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, requests[0]);

      expect(bids).to.be.lengthOf(1);
      expect(bids[0].netRevenue).to.equal(false);
      expect(bids[0].ttl).to.equal(0);
      expect(bids[0].currency).to.equal('USD');
    });

    it('should parse OpenRTB response when ortb param is true', function () {
      const bidRequestsWithOrtb = bidRequests.map(bid => ({
        ...bid,
        params: { ...bid.params, endpoint: 'https://global.iprom.net/programmatic', ortb: true }
      }));
      const requests = spec.buildRequests(bidRequestsWithOrtb, bidderRequest);
      const impId = requests[0].data.imp[0].id;
      const serverResponse = {
        body: {
          cur: 'EUR',
          seatbid: [{
            bid: [{
              impid: impId,
              price: 0.8,
              w: 300,
              h: 250,
              crid: 'creative-1',
              adomain: ['example.com'],
              adm: '<div>ad</div>',
              mtype: 1
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, requests[0]);

      expect(bids).to.be.lengthOf(1);
      expect(bids[0].requestId).to.equal('29a72b151f7bd3');
      expect(bids[0].cpm).to.equal(0.8);
      expect(bids[0].currency).to.equal('EUR');
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('should return empty bid response when body is not an array', function () {
      const malformedServerResponse = {
        body: {}
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(malformedServerResponse, requests[0]);

      expect(bids).to.be.lengthOf(0);
    });

    it('should return empty bid response', function () {
      const emptyServerResponse = {
        body: []
      };

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(emptyServerResponse, requests[0]);

      expect(bids).to.be.lengthOf(0);
    });
  });
});
