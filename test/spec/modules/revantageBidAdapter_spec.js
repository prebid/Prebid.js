import { expect } from 'chai';
import sinon from 'sinon';
import { spec } from '../../../modules/revantageBidAdapter.js';
import { newBidder } from '../../../src/adapters/bidderFactory.js';
import { deepClone } from '../../../src/utils.js';
import { BANNER, VIDEO } from '../../../src/mediaTypes.js';
import * as utils from '../../../src/utils.js';

const ENDPOINT_URL = 'https://bid.revantage.io/bid';
const SYNC_URL = 'https://sync.revantage.io/sync';

describe('RevantageBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const validBid = {
      bidder: 'revantage',
      params: {
        feedId: 'test-feed-123'
      },
      adUnitCode: 'adunit-code',
      sizes: [[300, 250], [300, 600]],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false when bid is undefined', function () {
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });

    it('should return false when bid is null', function () {
      expect(spec.isBidRequestValid(null)).to.equal(false);
    });

    it('should return false when params is missing', function () {
      const invalidBid = deepClone(validBid);
      delete invalidBid.params;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when feedId is missing', function () {
      const invalidBid = deepClone(validBid);
      invalidBid.params = {};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when feedId is empty string', function () {
      const invalidBid = deepClone(validBid);
      invalidBid.params = { feedId: '' };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return true with optional params', function () {
      const bidWithOptional = deepClone(validBid);
      bidWithOptional.params.placementId = 'test-placement';
      bidWithOptional.params.publisherId = 'test-publisher';
      expect(spec.isBidRequestValid(bidWithOptional)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const validBidRequests = [{
      bidder: 'revantage',
      params: {
        feedId: 'test-feed-123',
        placementId: 'test-placement',
        publisherId: 'test-publisher'
      },
      adUnitCode: 'adunit-code',
      sizes: [[300, 250], [300, 600]],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      getFloor: function(params) {
        return {
          currency: 'USD',
          floor: 0.5
        };
      }
    }];

    const bidderRequest = {
      auctionId: '1d1a030790a475',
      bidderRequestId: '22edbae2733bf6',
      timeout: 3000,
      gdprConsent: {
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        gdprApplies: true
      },
      uspConsent: '1---',
      gppConsent: {
        gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
        applicableSections: [7, 8]
      },
      ortb2: {
        site: {
          domain: 'example.com',
          page: 'https://example.com/test'
        },
        device: {
          ua: 'Mozilla/5.0...',
          language: 'en'
        }
      }
    };

    it('should return valid request object', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);

      expect(request).to.be.an('object');
      expect(request.method).to.equal('POST');
      expect(request.url).to.include(ENDPOINT_URL);
      expect(request.url).to.include('feed=test-feed-123');
      expect(request.options.contentType).to.equal('text/plain');
      expect(request.options.withCredentials).to.equal(false);
      expect(request.bidRequests).to.equal(validBidRequests);
    });

    it('should include all required OpenRTB fields', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.id).to.equal('1d1a030790a475');
      expect(data.imp).to.be.an('array').with.lengthOf(1);
      expect(data.site).to.be.an('object');
      expect(data.device).to.be.an('object');
      expect(data.user).to.be.an('object');
      expect(data.regs).to.be.an('object');
      expect(data.cur).to.deep.equal(['USD']);
      expect(data.tmax).to.equal(3000);
    });

    it('should build correct impression object', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      const imp = data.imp[0];

      expect(imp.id).to.equal('30b31c1838de1e');
      expect(imp.tagid).to.equal('adunit-code');
      expect(imp.bidfloor).to.equal(0.5);
      expect(imp.banner).to.be.an('object');
      expect(imp.banner.w).to.equal(300);
      expect(imp.banner.h).to.equal(250);
      expect(imp.banner.format).to.deep.equal([
        { w: 300, h: 250 },
        { w: 300, h: 600 }
      ]);
    });

    it('should include bidder-specific ext parameters', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      const imp = data.imp[0];

      expect(imp.ext.feedId).to.equal('test-feed-123');
      expect(imp.ext.bidder.placementId).to.equal('test-placement');
      expect(imp.ext.bidder.publisherId).to.equal('test-publisher');
    });

    it('should include GDPR consent data', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('BOJ/P2HOJ/P2HABABMAAAAAZ+A==');
    });

    it('should include CCPA/USP consent', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.regs.ext.us_privacy).to.equal('1---');
    });

    it('should include GPP consent with sections as array', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.regs.ext.gpp).to.equal('DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA');
      expect(data.regs.ext.gpp_sid).to.deep.equal([7, 8]);
    });

    it('should handle GDPR not applies', function () {
      const bidderRequestNoGdpr = deepClone(bidderRequest);
      bidderRequestNoGdpr.gdprConsent.gdprApplies = false;

      const request = spec.buildRequests(validBidRequests, bidderRequestNoGdpr);
      const data = JSON.parse(request.data);

      expect(data.regs.ext.gdpr).to.equal(0);
    });

    it('should handle missing getFloor function', function () {
      const bidRequestsWithoutFloor = deepClone(validBidRequests);
      delete bidRequestsWithoutFloor[0].getFloor;

      const request = spec.buildRequests(bidRequestsWithoutFloor, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.imp[0].bidfloor).to.equal(0);
    });

    it('should handle getFloor returning non-USD currency', function () {
      const bidRequestsEurFloor = deepClone(validBidRequests);
      bidRequestsEurFloor[0].getFloor = function() {
        return { currency: 'EUR', floor: 0.5 };
      };

      const request = spec.buildRequests(bidRequestsEurFloor, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.imp[0].bidfloor).to.equal(0);
    });

    it('should handle missing ortb2 data', function () {
      const bidderRequestNoOrtb2 = deepClone(bidderRequest);
      delete bidderRequestNoOrtb2.ortb2;

      const request = spec.buildRequests(validBidRequests, bidderRequestNoOrtb2);
      const data = JSON.parse(request.data);

      expect(data.site).to.be.an('object');
      expect(data.site.domain).to.exist;
      expect(data.device).to.be.an('object');
    });

    it('should include supply chain when present in bidderRequest', function () {
      const bidderRequestWithSchain = deepClone(bidderRequest);
      bidderRequestWithSchain.schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{
          asi: 'example.com',
          sid: '12345',
          hp: 1
        }]
      };

      const request = spec.buildRequests(validBidRequests, bidderRequestWithSchain);
      const data = JSON.parse(request.data);

      expect(data.schain).to.exist;
      expect(data.schain.ver).to.equal('1.0');
      expect(data.schain.complete).to.equal(1);
      expect(data.schain.nodes).to.have.lengthOf(1);
    });

    it('should include supply chain from first bid request', function () {
      const bidRequestsWithSchain = deepClone(validBidRequests);
      bidRequestsWithSchain[0].schain = {
        ver: '1.0',
        complete: 1,
        nodes: [{ asi: 'bidder.com', sid: '999', hp: 1 }]
      };

      const bidderRequestNoSchain = deepClone(bidderRequest);
      delete bidderRequestNoSchain.schain;

      const request = spec.buildRequests(bidRequestsWithSchain, bidderRequestNoSchain);
      const data = JSON.parse(request.data);

      expect(data.schain).to.exist;
      expect(data.schain.nodes[0].asi).to.equal('bidder.com');
    });

    it('should include user EIDs when present', function () {
      const bidRequestsWithEids = deepClone(validBidRequests);
      bidRequestsWithEids[0].userIdAsEids = [
        {
          source: 'id5-sync.com',
          uids: [{ id: 'test-id5-id', atype: 1 }]
        }
      ];

      const request = spec.buildRequests(bidRequestsWithEids, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.user.eids).to.be.an('array');
      expect(data.user.eids[0].source).to.equal('id5-sync.com');
    });

    it('should return empty array when feedIds differ across bids', function () {
      const mixedFeedBidRequests = [
        {
          bidder: 'revantage',
          params: { feedId: 'feed-1' },
          adUnitCode: 'adunit-1',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          sizes: [[300, 250]],
          bidId: 'bid1',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475'
        },
        {
          bidder: 'revantage',
          params: { feedId: 'feed-2' },
          adUnitCode: 'adunit-2',
          mediaTypes: { banner: { sizes: [[728, 90]] } },
          sizes: [[728, 90]],
          bidId: 'bid2',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475'
        }
      ];

      const request = spec.buildRequests(mixedFeedBidRequests, bidderRequest);
      expect(request).to.deep.equal([]);
    });

    it('should return empty array on exception', function () {
      const request = spec.buildRequests(null, bidderRequest);
      expect(request).to.deep.equal([]);
    });

    it('should handle video media type', function () {
      const videoBidRequests = [{
        bidder: 'revantage',
        params: { feedId: 'test-feed-123' },
        adUnitCode: 'video-adunit',
        bidId: 'video-bid-1',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        mediaTypes: {
          video: {
            playerSize: [[640, 480]],
            mimes: ['video/mp4', 'video/webm'],
            protocols: [2, 3, 5, 6],
            api: [1, 2],
            placement: 1,
            minduration: 5,
            maxduration: 30,
            skip: 1,
            skipmin: 5,
            skipafter: 5
          }
        }
      }];

      const request = spec.buildRequests(videoBidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      const imp = data.imp[0];

      expect(imp.video).to.exist;
      expect(imp.video.w).to.equal(640);
      expect(imp.video.h).to.equal(480);
      expect(imp.video.mimes).to.deep.equal(['video/mp4', 'video/webm']);
      expect(imp.video.protocols).to.deep.equal([2, 3, 5, 6]);
      expect(imp.video.minduration).to.equal(5);
      expect(imp.video.maxduration).to.equal(30);
      expect(imp.video.skip).to.equal(1);
      expect(imp.banner).to.be.undefined;
    });

    it('should handle multi-format (banner + video) bid', function () {
      const multiFormatBidRequests = [{
        bidder: 'revantage',
        params: { feedId: 'test-feed-123' },
        adUnitCode: 'multi-format-adunit',
        bidId: 'multi-bid-1',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          },
          video: {
            playerSize: [[640, 480]],
            mimes: ['video/mp4']
          }
        }
      }];

      const request = spec.buildRequests(multiFormatBidRequests, bidderRequest);
      const data = JSON.parse(request.data);
      const imp = data.imp[0];

      expect(imp.banner).to.exist;
      expect(imp.video).to.exist;
    });

    it('should handle multiple impressions with same feedId', function () {
      const multipleBidRequests = [
        {
          bidder: 'revantage',
          params: { feedId: 'test-feed-123' },
          adUnitCode: 'adunit-1',
          mediaTypes: { banner: { sizes: [[300, 250]] } },
          sizes: [[300, 250]],
          bidId: 'bid1',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475'
        },
        {
          bidder: 'revantage',
          params: { feedId: 'test-feed-123' },
          adUnitCode: 'adunit-2',
          mediaTypes: { banner: { sizes: [[728, 90]] } },
          sizes: [[728, 90]],
          bidId: 'bid2',
          bidderRequestId: '22edbae2733bf6',
          auctionId: '1d1a030790a475'
        }
      ];

      const request = spec.buildRequests(multipleBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.imp).to.have.lengthOf(2);
      expect(data.imp[0].id).to.equal('bid1');
      expect(data.imp[1].id).to.equal('bid2');
    });

    it('should use default sizes when sizes array is empty', function () {
      const bidWithEmptySizes = [{
        bidder: 'revantage',
        params: { feedId: 'test-feed' },
        adUnitCode: 'adunit-code',
        mediaTypes: { banner: { sizes: [] } },
        sizes: [],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475'
      }];

      const request = spec.buildRequests(bidWithEmptySizes, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.imp[0].banner.w).to.equal(300);
      expect(data.imp[0].banner.h).to.equal(250);
    });

    it('should include prebid version in ext', function () {
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      const data = JSON.parse(request.data);

      expect(data.ext).to.exist;
      expect(data.ext.prebid).to.exist;
      expect(data.ext.prebid.version).to.exist;
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        id: '1d1a030790a475',
        seatbid: [{
          seat: 'test-dsp',
          bid: [{
            id: 'test-bid-id',
            impid: '30b31c1838de1e',
            price: 1.25,
            crid: 'test-creative-123',
            adm: '<div>Test Ad Markup</div>',
            w: 300,
            h: 250,
            adomain: ['advertiser.com'],
            dealid: 'deal-123'
          }]
        }],
        cur: 'USD'
      }
    };

    const bidRequest = {
      bidRequests: [{
        bidId: '30b31c1838de1e',
        adUnitCode: 'adunit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      }]
    };

    it('should return valid banner bid response', function () {
      const result = spec.interpretResponse(serverResponse, bidRequest);

      expect(result).to.be.an('array').with.lengthOf(1);

      const bid = result[0];
      expect(bid.requestId).to.equal('30b31c1838de1e');
      expect(bid.cpm).to.equal(1.25);
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('test-creative-123');
      expect(bid.currency).to.equal('USD');
      expect(bid.netRevenue).to.equal(true);
      expect(bid.ttl).to.equal(300);
      expect(bid.ad).to.equal('<div>Test Ad Markup</div>');
      expect(bid.mediaType).to.equal(BANNER);
      expect(bid.dealId).to.equal('deal-123');
    });

    it('should include meta data in bid response', function () {
      const result = spec.interpretResponse(serverResponse, bidRequest);
      const bid = result[0];

      expect(bid.meta).to.be.an('object');
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.com']);
      expect(bid.meta.dsp).to.equal('test-dsp');
      expect(bid.meta.networkName).to.equal('Revantage');
    });

    it('should include burl when provided', function () {
      const responseWithBurl = deepClone(serverResponse);
      responseWithBurl.body.seatbid[0].bid[0].burl = 'https://bid.revantage.io/win?auction=1d1a030790a475&dsp=test-dsp&price=0.625000&impid=30b31c1838de1e&bidid=test-bid-id&adid=test-creative-123&page=&domain=&country=&feedid=test-feed&ref=';

      const result = spec.interpretResponse(responseWithBurl, bidRequest);
      const bid = result[0];

      expect(bid.burl).to.include('https://bid.revantage.io/win');
      expect(bid.burl).to.include('dsp=test-dsp');
      expect(bid.burl).to.include('impid=30b31c1838de1e');
    });

    it('should handle video response with vastXml', function () {
      const videoResponse = deepClone(serverResponse);
      videoResponse.body.seatbid[0].bid[0].vastXml = '<VAST version="3.0"><Ad>...</Ad></VAST>';
      delete videoResponse.body.seatbid[0].bid[0].adm;

      const videoBidRequest = {
        bidRequests: [{
          bidId: '30b31c1838de1e',
          adUnitCode: 'video-adunit',
          mediaTypes: {
            video: {
              playerSize: [[640, 480]]
            }
          }
        }]
      };

      const result = spec.interpretResponse(videoResponse, videoBidRequest);
      const bid = result[0];

      expect(bid.mediaType).to.equal(VIDEO);
      expect(bid.vastXml).to.equal('<VAST version="3.0"><Ad>...</Ad></VAST>');
    });

    it('should handle video response with vastUrl', function () {
      const videoResponse = deepClone(serverResponse);
      videoResponse.body.seatbid[0].bid[0].vastUrl = 'https://vast.example.com/vast.xml';
      delete videoResponse.body.seatbid[0].bid[0].adm;

      const videoBidRequest = {
        bidRequests: [{
          bidId: '30b31c1838de1e',
          adUnitCode: 'video-adunit',
          mediaTypes: {
            video: {
              playerSize: [[640, 480]]
            }
          }
        }]
      };

      const result = spec.interpretResponse(videoResponse, videoBidRequest);
      const bid = result[0];

      expect(bid.mediaType).to.equal(VIDEO);
      expect(bid.vastUrl).to.equal('https://vast.example.com/vast.xml');
    });

    it('should detect video from ext.mediaType', function () {
      const videoResponse = deepClone(serverResponse);
      videoResponse.body.seatbid[0].bid[0].adm = '<VAST version="3.0"><Ad>...</Ad></VAST>';
      videoResponse.body.seatbid[0].bid[0].ext = { mediaType: 'video' };

      const result = spec.interpretResponse(videoResponse, bidRequest);
      const bid = result[0];

      expect(bid.mediaType).to.equal(VIDEO);
      expect(bid.vastXml).to.equal('<VAST version="3.0"><Ad>...</Ad></VAST>');
    });

    it('should use default dimensions from bid request when missing in response', function () {
      const responseNoDimensions = deepClone(serverResponse);
      delete responseNoDimensions.body.seatbid[0].bid[0].w;
      delete responseNoDimensions.body.seatbid[0].bid[0].h;

      const result = spec.interpretResponse(responseNoDimensions, bidRequest);
      const bid = result[0];

      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
    });

    it('should include dspPrice from ext when available', function () {
      const responseWithDspPrice = deepClone(serverResponse);
      responseWithDspPrice.body.seatbid[0].bid[0].ext = { dspPrice: 1.50 };

      const result = spec.interpretResponse(responseWithDspPrice, bidRequest);
      const bid = result[0];

      expect(bid.meta.dspPrice).to.equal(1.50);
    });

    it('should return empty array for null response body', function () {
      const result = spec.interpretResponse({ body: null }, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should return empty array for undefined response body', function () {
      const result = spec.interpretResponse({}, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should return empty array when seatbid is not an array', function () {
      const invalidResponse = {
        body: {
          id: '1d1a030790a475',
          seatbid: 'not-an-array',
          cur: 'USD'
        }
      };

      const result = spec.interpretResponse(invalidResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should return empty array for empty seatbid', function () {
      const emptyResponse = {
        body: {
          id: '1d1a030790a475',
          seatbid: [],
          cur: 'USD'
        }
      };

      const result = spec.interpretResponse(emptyResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should filter out bids with zero price', function () {
      const zeroPriceResponse = deepClone(serverResponse);
      zeroPriceResponse.body.seatbid[0].bid[0].price = 0;

      const result = spec.interpretResponse(zeroPriceResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should filter out bids with negative price', function () {
      const negativePriceResponse = deepClone(serverResponse);
      negativePriceResponse.body.seatbid[0].bid[0].price = -1;

      const result = spec.interpretResponse(negativePriceResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should filter out bids without ad markup', function () {
      const noAdmResponse = deepClone(serverResponse);
      delete noAdmResponse.body.seatbid[0].bid[0].adm;

      const result = spec.interpretResponse(noAdmResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should filter out bids with unknown impid', function () {
      const unknownImpidResponse = deepClone(serverResponse);
      unknownImpidResponse.body.seatbid[0].bid[0].impid = 'unknown-imp-id';

      const result = spec.interpretResponse(unknownImpidResponse, bidRequest);
      expect(result).to.deep.equal([]);
    });

    it('should handle missing bidRequests in request object', function () {
      const result = spec.interpretResponse(serverResponse, {});
      expect(result).to.deep.equal([]);
    });

    it('should handle multiple seatbids', function () {
      const multiSeatResponse = deepClone(serverResponse);
      multiSeatResponse.body.seatbid.push({
        seat: 'another-dsp',
        bid: [{
          id: 'another-bid-id',
          impid: 'another-imp-id',
          price: 2.00,
          crid: 'another-creative',
          adm: '<div>Another Ad</div>',
          w: 728,
          h: 90,
          adomain: ['another-advertiser.com']
        }]
      });

      const multiBidRequest = {
        bidRequests: [
          {
            bidId: '30b31c1838de1e',
            adUnitCode: 'adunit-code',
            mediaTypes: { banner: { sizes: [[300, 250]] } }
          },
          {
            bidId: 'another-imp-id',
            adUnitCode: 'adunit-code-2',
            mediaTypes: { banner: { sizes: [[728, 90]] } }
          }
        ]
      };

      const result = spec.interpretResponse(multiSeatResponse, multiBidRequest);

      expect(result).to.have.lengthOf(2);
      expect(result[0].meta.dsp).to.equal('test-dsp');
      expect(result[1].meta.dsp).to.equal('another-dsp');
    });

    it('should use default currency USD when not specified', function () {
      const noCurrencyResponse = deepClone(serverResponse);
      delete noCurrencyResponse.body.cur;

      const result = spec.interpretResponse(noCurrencyResponse, bidRequest);
      const bid = result[0];

      expect(bid.currency).to.equal('USD');
    });

    it('should generate creativeId when crid is missing', function () {
      const noCridResponse = deepClone(serverResponse);
      delete noCridResponse.body.seatbid[0].bid[0].crid;

      const result = spec.interpretResponse(noCridResponse, bidRequest);
      const bid = result[0];

      expect(bid.creativeId).to.exist;
      expect(bid.creativeId).to.satisfy(crid =>
        crid === 'test-bid-id' || crid.startsWith('revantage-')
      );
    });

    it('should handle empty adomain array', function () {
      const noAdomainResponse = deepClone(serverResponse);
      delete noAdomainResponse.body.seatbid[0].bid[0].adomain;

      const result = spec.interpretResponse(noAdomainResponse, bidRequest);
      const bid = result[0];

      expect(bid.meta.advertiserDomains).to.deep.equal([]);
    });

    it('should use "unknown" for missing seat', function () {
      const noSeatResponse = deepClone(serverResponse);
      delete noSeatResponse.body.seatbid[0].seat;

      const result = spec.interpretResponse(noSeatResponse, bidRequest);
      const bid = result[0];

      expect(bid.meta.dsp).to.equal('unknown');
    });
  });

  describe('getUserSyncs', function () {
    const syncOptions = {
      iframeEnabled: true,
      pixelEnabled: true
    };

    const gdprConsent = {
      gdprApplies: true,
      consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A=='
    };

    const uspConsent = '1---';

    const gppConsent = {
      gppString: 'DBACNYA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA',
      applicableSections: [7, 8]
    };

    it('should return iframe sync when iframe enabled', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true, pixelEnabled: false },
        [],
        gdprConsent,
        uspConsent,
        gppConsent
      );

      expect(syncs).to.be.an('array').with.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include(SYNC_URL);
    });

    it('should return pixel sync when pixel enabled', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: false, pixelEnabled: true },
        [],
        gdprConsent,
        uspConsent,
        gppConsent
      );

      expect(syncs).to.be.an('array').with.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.include(SYNC_URL);
      expect(syncs[0].url).to.include('tag=img');
    });

    it('should return both syncs when both enabled', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent, gppConsent);

      expect(syncs).to.have.lengthOf(2);
      expect(syncs.map(s => s.type)).to.include('iframe');
      expect(syncs.map(s => s.type)).to.include('image');
    });

    it('should include cache buster parameter', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent, gppConsent);

      expect(syncs[0].url).to.include('cb=');
    });

    it('should include GDPR parameters when consent applies', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent, gppConsent);

      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.include('gdpr_consent=BOJ%2FP2HOJ%2FP2HABABMAAAAAZ%2BA%3D%3D');
    });

    it('should set gdpr=0 when GDPR does not apply', function () {
      const gdprNotApplies = {
        gdprApplies: false,
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A=='
      };

      const syncs = spec.getUserSyncs(syncOptions, [], gdprNotApplies, uspConsent, gppConsent);

      expect(syncs[0].url).to.include('gdpr=0');
    });

    it('should include USP consent parameter', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent, gppConsent);

      expect(syncs[0].url).to.include('us_privacy=1---');
    });

    it('should include GPP parameters', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent, gppConsent);

      expect(syncs[0].url).to.include('gpp=');
      expect(syncs[0].url).to.include('gpp_sid=7%2C8');
    });

    it('should handle missing GDPR consent', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], null, uspConsent, gppConsent);

      expect(syncs[0].url).to.not.include('gdpr=');
      expect(syncs[0].url).to.not.include('gdpr_consent=');
    });

    it('should handle missing USP consent', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, null, gppConsent);

      expect(syncs[0].url).to.not.include('us_privacy=');
    });

    it('should handle missing GPP consent', function () {
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent, null);

      expect(syncs[0].url).to.not.include('gpp=');
      expect(syncs[0].url).to.not.include('gpp_sid=');
    });

    it('should handle undefined GPP string', function () {
      const partialGppConsent = {
        applicableSections: [7, 8]
      };

      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent, uspConsent, partialGppConsent);

      expect(syncs[0].url).to.not.include('gpp=');
      expect(syncs[0].url).to.include('gpp_sid=7%2C8');
    });

    it('should return empty array when no sync options enabled', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: false, pixelEnabled: false },
        [],
        gdprConsent,
        uspConsent,
        gppConsent
      );

      expect(syncs).to.be.an('array').that.is.empty;
    });

    it('should return empty array when syncOptions is empty object', function () {
      const syncs = spec.getUserSyncs({}, [], gdprConsent, uspConsent, gppConsent);

      expect(syncs).to.be.an('array').that.is.empty;
    });
  });

  describe('onBidWon', function () {
    let triggerPixelStub;

    beforeEach(function () {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      triggerPixelStub.restore();
    });

    it('should call triggerPixel with correct burl', function () {
      const bid = {
        bidId: '30b31c1838de1e',
        cpm: 1.25,
        adUnitCode: 'adunit-code',
        burl: 'https://bid.revantage.io/win?auction=1d1a030790a475&dsp=test-dsp&price=0.625000&impid=30b31c1838de1e&bidid=test-bid-id&adid=test-ad-123&page=https%3A%2F%2Fexample.com&domain=example.com&country=US&feedid=test-feed&ref='
      };

      spec.onBidWon(bid);

      expect(triggerPixelStub.calledOnce).to.be.true;
      expect(triggerPixelStub.firstCall.args[0]).to.include('https://bid.revantage.io/win');
      expect(triggerPixelStub.firstCall.args[0]).to.include('dsp=test-dsp');
      expect(triggerPixelStub.firstCall.args[0]).to.include('impid=30b31c1838de1e');
      expect(triggerPixelStub.firstCall.args[0]).to.include('feedid=test-feed');
    });

    it('should not throw error when burl is missing', function () {
      const bid = {
        bidId: '30b31c1838de1e',
        cpm: 1.25,
        adUnitCode: 'adunit-code'
      };

      expect(() => spec.onBidWon(bid)).to.not.throw();
      expect(triggerPixelStub.called).to.be.false;
    });

    it('should handle burl with all query parameters', function () {
      // This is the actual format generated by your RTB server
      const burl = 'https://bid.revantage.io/win?' +
        'auction=auction_123456789' +
        '&dsp=Improve_Digital' +
        '&price=0.750000' +
        '&impid=imp_001%7Cfeed123' +  // URL encoded pipe for feedId in impid
        '&bidid=bid_abc' +
        '&adid=creative_xyz' +
        '&page=https%3A%2F%2Fexample.com%2Fpage' +
        '&domain=example.com' +
        '&country=US' +
        '&feedid=feed123' +
        '&ref=https%3A%2F%2Fgoogle.com';

      const bid = {
        bidId: 'imp_001',
        cpm: 1.50,
        burl: burl
      };

      spec.onBidWon(bid);

      expect(triggerPixelStub.calledOnce).to.be.true;
      const calledUrl = triggerPixelStub.firstCall.args[0];
      expect(calledUrl).to.include('auction=auction_123456789');
      expect(calledUrl).to.include('dsp=Improve_Digital');
      expect(calledUrl).to.include('price=0.750000');
      expect(calledUrl).to.include('domain=example.com');
      expect(calledUrl).to.include('country=US');
      expect(calledUrl).to.include('feedid=feed123');
    });
  });

  describe('spec properties', function () {
    it('should have correct bidder code', function () {
      expect(spec.code).to.equal('revantage');
    });

    it('should support banner and video media types', function () {
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO]);
    });
  });
});
