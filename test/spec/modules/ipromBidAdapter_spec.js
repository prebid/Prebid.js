import {expect} from 'chai';
import sinon from 'sinon';
import * as utils from 'src/utils.js';
import {spec} from 'modules/ipromBidAdapter.js';

describe('iPROM Adapter', function () {
  let bidRequests;
  let bidderRequest;

  beforeEach(function () {
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

  describe('validating bids', function () {
    it('should accept valid bid', function () {
      const validBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          dimension: '300x250',
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

    it('should accept bid with valid endpoint url', function () {
      const validBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          endpoint: 'https://custom.iprom.net/programmatic'
        }
      };

      const isValid = spec.isBidRequestValid(validBid);

      expect(isValid).to.equal(true);
    });

    it('should reject bid if endpoint is not a string', function () {
      const invalidBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          endpoint: 1234
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });

    it('should reject bid if endpoint is not a valid url', function () {
      const invalidBid = {
        bidder: 'iprom',
        params: {
          id: '1234',
          endpoint: 'invalid-url'
        }
      };

      const isValid = spec.isBidRequestValid(invalidBid);

      expect(isValid).to.equal(false);
    });
  });

  describe('building requests', function () {
    it('should go to correct endpoint', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.method).to.exist;
      expect(request.method).to.equal('POST');
      expect(request.url).to.exist;
      expect(request.url).to.equal('https://core.iprom.net/programmatic');
    });

    it('should use custom endpoint from params when valid', function () {
      const bidRequestsWithEndpoint = [{
        ...bidRequests[0],
        params: {
          ...bidRequests[0].params,
          endpoint: 'https://custom.iprom.net/programmatic'
        }
      }];
      const request = spec.buildRequests(bidRequestsWithEndpoint, bidderRequest);

      expect(request.url).to.equal('https://custom.iprom.net/programmatic');
      expect(request.ortb).to.equal(true);
      expect(request.data).to.be.an('object');
      expect(request.data.imp).to.be.an('array').with.lengthOf(1);
      expect(request.data.bids).to.be.undefined;
    });

    it('should fallback to default endpoint for invalid custom endpoint', function () {
      const bidRequestsWithInvalidEndpoint = [{
        ...bidRequests[0],
        params: {
          ...bidRequests[0].params,
          endpoint: 'invalid-url'
        }
      }];
      const request = spec.buildRequests(bidRequestsWithInvalidEndpoint, bidderRequest);

      expect(request.url).to.equal('https://core.iprom.net/programmatic');
    });

    it('should fallback to default endpoint for non-string endpoint', function () {
      const bidRequestsWithNonStringEndpoint = [{
        ...bidRequests[0],
        params: {
          ...bidRequests[0].params,
          endpoint: 1234
        }
      }];
      const request = spec.buildRequests(bidRequestsWithNonStringEndpoint, bidderRequest);

      expect(request.url).to.equal('https://core.iprom.net/programmatic');
    });

    it('should add only selected referer info', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const requestparse = JSON.parse(request.data);

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

    it('should warn if referer fields are missing', function () {
      const warnSpy = sinon.spy(utils, 'logWarn');

      const bidderRequestWithMissingRefererFields = {
        ...bidderRequest,
        refererInfo: {
          reachedTop: true
        }
      };

      spec.buildRequests(bidRequests, bidderRequestWithMissingRefererFields);

      expect(warnSpy.calledOnce).to.equal(true);
      expect(warnSpy.firstCall.args[0]).to.equal('iprom: Missing referer fields: referer, numIframes, stack');

      warnSpy.restore();
    });

    it('should add adapter version', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const requestparse = JSON.parse(request.data);

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
      const request = spec.buildRequests(bidRequests, bidderRequestWithTcf);
      const requestparse = JSON.parse(request.data);

      expect(requestparse.tcf).to.deep.equal({
        consentString: 'consent-string',
        gdprApplies: true,
        addtlConsent: 'addtl-consent'
      });
    });

    it('should warn if TCF fields are missing', function () {
      const warnSpy = sinon.spy(utils, 'logWarn');
      const bidderRequestWithIncompleteTcf = {
        ...bidderRequest,
        gdprConsent: {
          consentString: 'consent-string'
        }
      };

      spec.buildRequests(bidRequests, bidderRequestWithIncompleteTcf);

      expect(warnSpy.calledOnce).to.equal(true);
      expect(warnSpy.firstCall.args[0]).to.equal('iprom: Missing tcf fields: gdprApplies, addtlConsent');

      warnSpy.restore();
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
      const bidRequestsWithSchain = [{
        ...bidRequests[0],
        ortb2: {
          source: {
            ext: {
              schain
            }
          }
        }
      }];
      const request = spec.buildRequests(bidRequestsWithSchain, bidderRequest);
      const requestparse = JSON.parse(request.data);

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
      const bidRequestsWithSchain = [{
        ...bidRequests[0],
        ortb2: {
          source: {
            ext: {
              schain
            }
          }
        }
      }];
      const bidderRequestWithFpd = {
        ...bidderRequest,
        ortb2: {
          site: {
            domain: 'adserver.si'
          }
        }
      };
      const request = spec.buildRequests(bidRequestsWithSchain, bidderRequestWithFpd);
      const requestparse = JSON.parse(request.data);

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
            segment: [{id: 'segment-id'}]
          }]
        }
      };
      const bidderRequestWithFpd = {
        ...bidderRequest,
        ortb2: firstPartyData
      };
      const request = spec.buildRequests(bidRequests, bidderRequestWithFpd);
      const requestparse = JSON.parse(request.data);

      expect(requestparse.firstPartyData).to.deep.equal({
        user: {
          data: [{
            name: 'taxonomy',
            segment: [{id: 'segment-id'}]
          }]
        }
      });
    });

    it('should contain id and dimension', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const requestparse = JSON.parse(request.data);

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
        ]};

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.be.lengthOf(1);
      expect(bids[0].requestId).to.equal('29a72b151f7bd3');
      expect(bids[0].cpm).to.equal(0.5);
      expect(bids[0].width).to.equal('300');
      expect(bids[0].height).to.equal('250');
      expect(bids[0].ad).to.have.length.above(1);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['https://example.com']);
    });

    it('should parse OpenRTB response when custom endpoint is used', function () {
      const bidRequestsWithEndpoint = [{
        ...bidRequests[0],
        params: {
          ...bidRequests[0].params,
          endpoint: 'https://custom.iprom.net/programmatic'
        }
      }];
      const request = spec.buildRequests(bidRequestsWithEndpoint, bidderRequest);
      const impId = request.data.imp[0].id;
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

      const bids = spec.interpretResponse(serverResponse, request);

      expect(bids).to.be.lengthOf(1);
      expect(bids[0].requestId).to.equal('29a72b151f7bd3');
      expect(bids[0].cpm).to.equal(0.8);
      expect(bids[0].currency).to.equal('EUR');
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('should return empty bid response', function () {
      const emptyServerResponse = {
        body: []
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const bids = spec.interpretResponse(emptyServerResponse, request);

      expect(bids).to.be.lengthOf(0);
    });
  });
});
