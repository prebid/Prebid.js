import {expect} from 'chai';
import {spec} from 'modules/vibrantBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';

describe('VibrantBidAdapter', function () {
  const adapter = newBidder(spec);

  const validBidParams = Object.freeze({
    member: '1234',
    invCode: 'ABCD',
    placementId: '10433394',
  });

  const validBidRequestSizes = [[300, 250]];

  const validConsentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';

  const validPrebidServerResponse = Object.freeze({
    body: {
      bids: [{
        'bd-adbar': {
          '12345': [
            {
              'ads': [
                {
                  'width': validBidRequestSizes[0][0],
                  'height': validBidRequestSizes[0][1],
                  'clickUrl': 'test.example.com/abc',
                  'displayUrl': 'test.example.com/abc',
                  'creative': {
                    'implementationType': 'internal',
                    'creativeTypeId': 1,
                    'value': 'd28e8e0c-2f17-421d-84db-5c9814bf4a79',
                    'diyValues': null,
                    'instreamValues': null,
                    'setValues': {}
                  },
                  'bidPrice': 0.30
                }
              ],
              'vibrantParameters': {
                'setId': 371480,
                'product': 11,
                'category': 1419,
                'keywordId': 'abc',
                'keyword': 'test',
                'adProviderId': 1,
                'hookId': '28de95fa-4919-46a0-8b3a-c49b4de95e24'
              },
              'differentSettings': {},
              'priority': 0,
              'setType': 0,
              'term': {
                'keywordId': 'abc',
                'keyword': 'test'
              }
            }
          ]
        }
      }]
    }
  });

  const expectedServerTranslation = [{
    cpm: undefined,
    creativeId: undefined,
    currency: 'GBP',
    dealId: undefined,
    meta: {
      advertiserDomains: []
    },
    netRevenue: true,
    requestId: undefined,
    ttl: 300,
  }];

  const getValidBidderRequest = (bidRequests) => {
    return Object.freeze({
      bidderCode: 'vibrantmedia',
      auctionId: '1d1a030790a475',
      bidderRequestId: '22edbae2733bf6',
      timeout: 3000,
      gdprConsent: {
        consentString: validConsentString,
        vendorData: {},
        gdprApplies: true,
      },
      bids: bidRequests,
    });
  };

  describe('constants', function () {
    expect(spec.code).to.equal('vibrantmedia');
    expect(spec.supportedMediaTypes).to.deep.equal([BANNER, NATIVE, VIDEO]);
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('transformBidParams', function () {
    it('transforms bid params correctly', function () {
      const bidParams = {
        a: 1,
        b: '2',
      };

      expect(spec.transformBidParams(bidParams)).to.deep.equal(bidParams);
    });
  })

  let bid;

  beforeEach(function () {
    bid = {
      bidder: 'vibrantmedia',
      params: {
        // Filled in by individual tests
      },
      mediaTypes: {
        // Filled in by individual tests
      },
      adUnitCode: 'banner-div',
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    };
  });

  describe('isBidRequestValid', function () {
    describe('with banner bid requests', function () {
      beforeEach(function () {
        bid.mediaTypes.banner = {
          // Filled in by individual tests
        };
      });

      it('should return true for a valid banner bid request', function () {
        bid.params = validBidParams;
        bid.mediaTypes.banner.sizes = validBidRequestSizes;

        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return true for a valid banner bid request with some valid sizes', function () {
        bid.params = validBidParams;
        bid.mediaTypes.banner.sizes = [[300, 250], [300, 600]];

        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return false for a banner bid request with no compatible sizes', function () {
        bid.params = validBidParams;
        bid.mediaTypes.banner.sizes = [[600, 500], [300, 600]];

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true for a valid banner bid request with a member id and inventory code', function () {
        bid.params = {
          member: '1234',
          invCode: 'ABCD',
        };
        bid.mediaTypes.banner.sizes = validBidRequestSizes;

        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return true for a valid banner bid request with a placement id', function () {
        bid.params = {
          placementId: '10433394',
        };
        bid.mediaTypes.banner.sizes = validBidRequestSizes;

        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return false for a valid banner bid request but with a member id and no inventory code', function () {
        bid.params = {
          member: '1234',
        };
        bid.mediaTypes.banner.sizes = validBidRequestSizes;

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false for a valid banner bid request but with no member id and an inventory code', function () {
        bid.params = {
          invCode: 'ABCD',
        };
        bid.mediaTypes.banner.sizes = validBidRequestSizes;

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false for a valid banner bid request but with no params', function () {
        bid.params = {};
        bid.mediaTypes.banner.sizes = validBidRequestSizes;

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });

    describe('with video bid requests', function () {
      const validVideoMediaTypes = {
        context: 'outstream',
        sizes: validBidRequestSizes,
      };

      beforeEach(function () {
        bid.mediaTypes.video = {
          // Filled in by individual tests
        };
      });

      it('should return true for a valid video bid request', function () {
        bid.params = validBidParams;
        bid.mediaTypes.video = validVideoMediaTypes;

        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return true for a valid video bid request with some valid sizes', function () {
        bid.params = validBidParams;
        bid.mediaTypes.video = {
          context: 'outstream',
          sizes: [[300, 250], [300, 600]],
        };

        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return false for a video request with no compatible sizes', function () {
        bid.params = validBidParams;
        bid.mediaTypes.video = {
          context: 'outstream',
          sizes: [[600, 500], [300, 600]],
        };

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false for an instream video bid request', function () {
        bid.params = validBidParams;
        bid.mediaTypes.video = {
          context: 'instream',
          sizes: validBidRequestSizes,
        };

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false for a video bid request with an unknown context', function () {
        bid.params = validBidParams;
        bid.mediaTypes.video = {
          context: 'fake',
          sizes: validBidRequestSizes,
        };

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false for a video bid request with no context', function () {
        bid.params = validBidParams;
        bid.mediaTypes.video = {
          sizes: validBidRequestSizes,
        };

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return true for a valid video bid request with a member id and inventory code', function () {
        bid.params = {
          member: '1234',
          invCode: 'ABCD',
        };
        bid.mediaTypes.video = validVideoMediaTypes;

        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return true for a valid video bid request with a placement id', function () {
        bid.params = {
          placementId: '10433394',
        };
        bid.mediaTypes.video = validVideoMediaTypes;

        expect(spec.isBidRequestValid(bid)).to.equal(true);
      });

      it('should return false for a valid video bid request but with a member id and no inventory code', function () {
        bid.params = {
          member: '1234',
        };
        bid.mediaTypes.video = validVideoMediaTypes;

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false for a valid video bid request but with no member id and an inventory code', function () {
        bid.params = {
          invCode: 'ABCD',
        };
        bid.mediaTypes.video = validVideoMediaTypes;

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false for a valid video bid request but with no params', function () {
        bid.params = {};
        bid.mediaTypes.video = validVideoMediaTypes;

        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });
  });

  describe('buildRequests', function () {
    let bidRequests;

    beforeEach(function () {
      bidRequests = [bid];

      bidRequests[0].params = validBidParams;
      bidRequests[0].mediaTypes.banner = {
        sizes: validBidRequestSizes,
      };
    });

    it('should use HTTP POST', function () {
      const request = spec.buildRequests(bidRequests, {});
      expect(request.method).to.equal('POST');
    });

    it('should use the correct prebid server URL', function () {
      const request = spec.buildRequests(bidRequests, {});
      expect(request.url).to.equal('https://k.intellitxt.com/prebid');
    });

    it('should add the page URL to the server request', function () {
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);

      expect(payload.url).to.exist;
      expect(payload.url).to.be.a('string');
    })

    it('should add GDPR consent to the server request', function () {
      const bidderRequest = {
        bidderCode: 'vibrantmedia',
        auctionId: '1d1a030790a475',
        bidderRequestId: '22edbae2733bf6',
        timeout: 3000,
        gdprConsent: {
          consentString: validConsentString,
          gdprApplies: true,
        },
        bids: bidRequests,
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      // TODO: Check that we should not be implementing withCredentials
      // expect(request.options).to.deep.equal({withCredentials: true});

      const payload = JSON.parse(request.data);
      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consentString).to.exist.and.to.equal(validConsentString);
      expect(payload.gdpr.gdprApplies).to.exist.and.to.be.true;
    });

    it('should add window dimensions to the server request', function () {
      const request = spec.buildRequests(bidRequests, {});
      const payload = JSON.parse(request.data);

      expect(payload.window).to.exist;
      expect(payload.window.width).to.equal(window.innerWidth);
      expect(payload.window.height).to.equal(window.innerHeight);
    })

    it('should add the correct bid data to the server request for one bid request', function () {
      bid.params = validBidParams;
      bid.mediaTypes = {
        banner: {
          sizes: validBidRequestSizes,
        },
      };

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(1);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bid.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bid.bidId);
      expect(payload.biddata[0].bidder).to.equal(bid.bidder);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: validBidRequestSizes,
      });
    });

    it('should add the correct bid data to the server request for two bid requests', function () {
      bid.params = validBidParams;
      bid.mediaTypes = {
        banner: {
          sizes: validBidRequestSizes,
        },
      };

      const bid2 = {
        bidder: 'vibrantmedia',
        params: validBidParams,
        mediaTypes: {
          video: {
            sizes: validBidRequestSizes,
          }
        },
        adUnitCode: 'video-div',
        bidId: '30b31c1838de1f',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      };

      bidRequests.push(bid2);

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(2);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bid.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bid.bidId);
      expect(payload.biddata[0].bidder).to.equal(bid.bidder);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: validBidRequestSizes,
      });
      expect(payload.biddata[1]).to.exist;
      expect(payload.biddata[1].code).to.equal(bid2.adUnitCode);
      expect(payload.biddata[1].id).to.equal(bid2.bidId);
      expect(payload.biddata[1].bidder).to.equal(bid2.bidder);
      expect(payload.biddata[1].mediaTypes).to.exist;
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.exist;
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.deep.equal({
        sizes: validBidRequestSizes,
      });
    });

    it('should add the correct bid data to the bid request where a bid has two media types', function () {
      bid.params = validBidParams;
      bid.mediaTypes = {
        banner: {
          sizes: validBidRequestSizes,
        },
        video: {
          sizes: validBidRequestSizes,
        },
      };
      bid.adUnitCode = 'mixed-div';

      const bid2 = {
        bidder: 'vibrantmedia',
        params: validBidParams,
        mediaTypes: {
          video: {
            sizes: validBidRequestSizes,
          }
        },
        adUnitCode: 'video-div',
        bidId: '30b31c1838de1f',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      };

      bidRequests.push(bid2);

      const request = spec.buildRequests(bidRequests, {}, true);
      const payload = JSON.parse(request.data);

      expect(payload.biddata).to.exist;
      expect(payload.biddata.length).to.equal(2);
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bid.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bid.bidId);
      expect(payload.biddata[0].bidder).to.equal(bid.bidder);
      expect(payload.biddata[0].mediaTypes).to.exist;
      expect(Object.keys(payload.biddata[0].mediaTypes).length).to.equal(2);
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: validBidRequestSizes,
      });
      expect(payload.biddata[0].mediaTypes[VIDEO]).to.exist;
      expect(payload.biddata[0].mediaTypes[VIDEO]).to.deep.equal({
        sizes: validBidRequestSizes,
      });
      expect(payload.biddata[1]).to.exist;
      expect(payload.biddata[1].code).to.equal(bid2.adUnitCode);
      expect(payload.biddata[1].id).to.equal(bid2.bidId);
      expect(payload.biddata[1].bidder).to.equal(bid2.bidder);
      expect(payload.biddata[1].mediaTypes).to.exist;
      expect(Object.keys(payload.biddata[1].mediaTypes).length).to.equal(1);
      expect(payload.biddata[1].mediaTypes[VIDEO]).to.exist;
      expect(payload.biddata[0].mediaTypes[VIDEO]).to.deep.equal({
        sizes: validBidRequestSizes,
      });
    });
  });

  describe('interpretResponse', function () {
    it('returns a valid Prebid API response object for a banner Prebid Server response', function () {
      expect(spec.interpretResponse(validPrebidServerResponse, {})).to.deep.equal(expectedServerTranslation);
    });
  });

  describe('Flow tests', function () {
    it('should behave correctly for successive API calls to the public functions', function () {
      const bidParams = spec.transformBidParams(validBidParams);
      const bid = {
        bidder: 'vibrantmedia',
        params: bidParams,
        mediaTypes: {
          banner: {
            sizes: validBidRequestSizes,
          },
        },
        adUnitCode: 'banner-div',
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      };

      expect(spec.isBidRequestValid(bid)).to.be.true;

      const bidRequests = [bid];
      const validBidderRequest = getValidBidderRequest(bidRequests);
      const serverRequest = spec.buildRequests(bidRequests, validBidderRequest);
      expect(serverRequest.method).to.equal('POST');
      expect(serverRequest.url).to.equal('https://k.intellitxt.com/prebid');

      const payload = JSON.parse(serverRequest.data);
      expect(payload.biddata).to.exist;
      expect(payload.biddata[0]).to.exist;
      expect(payload.biddata[0].code).to.equal(bid.adUnitCode);
      expect(payload.biddata[0].id).to.equal(bid.bidId);
      expect(payload.biddata[0].bidder).to.equal(bid.bidder);
      expect(payload.biddata[0].mediaTypes[BANNER]).to.exist;
      expect(payload.biddata[0].mediaTypes[BANNER]).to.deep.equal({
        sizes: validBidRequestSizes,
      });

      // From here, the API would call the Prebid Server and call interpretResponse, which is covered by tests elsewhere
    });
  });
});
