import { expect } from 'chai';
import { spec } from 'modules/aerservBidAdapter';

describe('AerServ Adapter', () => {
  let bannerBidRequest = {
    bidder: 'aerserv',
    params: {
      plc: '480',
      testParam: 'a'
    },
    adUnitCode: 'adunit-code',
    sizes: [[300, 250], [300, 600]],
    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475',
  };

  let videoBidRequest = {
    bidder: 'aerserv',
    mediaType: 'video',
    params: {
      plc: '480',
      video: {
        vpw: '480',
        vph: '360'
      }
    },
    adUnitCode: 'adunit-code',
    sizes: [[300, 250], [300, 600]],
    bidId: '22edbae2733bf6',
    bidderRequestId: '30b31c1838de1e',
    auctionId: '1d1a030790a475',
  };

  describe('isBidRequestValid', () => {
    let validBid;

    beforeEach(() => {
      validBid = {
        bidder: 'aerserv',
        params: {
          plc: '480'
        },
        adUnitCode: 'adunit-code',
        sizes: [[300, 250], [300, 600]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      };
    });

    it('should return true with valid bid parameters', () => {
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return true with valid bid parameters', () => {
      let bid = Object.assign({}, validBid);
      delete bid.params;
      bid.params = {plc: '480', coppa: '1'};
      expect(spec.isBidRequestValid(validBid)).to.equal(true);
    });

    it('should return false with missing bid parameters', () => {
      let invalidBid = Object.assign({}, validBid);
      delete invalidBid.params;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when missing required bid parameters', () => {
      let invalidBid = Object.assign({}, validBid);
      delete invalidBid.params;
      invalidBid.params = {coppa: '0'};
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('sends a single request object for a single bid', () => {
      const requests = spec.buildRequests([bannerBidRequest]);
      expect(requests.length).to.equal(1);
    });

    it('sends multiple requests for multiple bids', () => {
      const requests = spec.buildRequests([bannerBidRequest, videoBidRequest]);
      expect(requests.length).to.equal(2);
    });

    it('properly passes parameters for normal requests', () => {
      const requests = spec.buildRequests([bannerBidRequest]);
      expect(requests[0].url).to.contain('plc=480');
      expect(requests[0].url).to.contain('testParam=a');
    });

    it('sends request as banner for banner requests', () => {
      const requests = spec.buildRequests([bannerBidRequest]);
      expect(requests[0].url).to.contain('/prebid/banner/');
    });

    it('properly passes video parameters for video requests', () => {
      const requests = spec.buildRequests([videoBidRequest]);
      expect(requests[0].url).to.contain('&vpw=480');
      expect(requests[0].url).to.contain('&vph=360');
    });

    it('sends request as video for video requests', () => {
      const requests = spec.buildRequests([videoBidRequest]);
      expect(requests[0].url).to.contain('/prebid/video/');
    });

    it('passes requests with original bids', () => {
      const requests = spec.buildRequests([bannerBidRequest, videoBidRequest]);
      expect(requests[0].bidRequest).to.deep.equal(bannerBidRequest);
      expect(requests[1].bidRequest).to.deep.equal(videoBidRequest);
    });

    it('passes video in path for requests', () => {
      const requests = spec.buildRequests([bannerBidRequest]);
      expect(requests[0].url).to.contain('/prebid/banner/1.0.0');
    });

    it('omits environment from request parameters', () => {
      const requests = spec.buildRequests([bannerBidRequest]);
      expect(requests[0].url).to.not.contain('env=');
    });
  });

  describe('interpretResponse', () => {
    let bannerResponse = {
      cpm: 5,
      netRevenue: true,
      ad: '<!-- ad content >',
      width: 320,
      height: 50,
      currency: 'USD',
      ttl: 600,
      creativeId: 1234
    };

    let bannerBid = {
      requestId: '30b31c1838de1e',
      bidderCode: 'aerserv',
      cpm: 5,
      netRevenue: true,
      ad: '<!-- ad content >',
      width: 320,
      height: 50,
      currency: 'USD',
      ttl: 600,
      creativeId: 1234
    };

    let videoResponse = {
      cpm: 5,
      netRevenue: true,
      width: 320,
      height: 250,
      currency: 'USD',
      vastXml: '<!-- ad content >',
      ttl: 600,
      creativeId: 1234
    };

    let videoBid = {
      requestId: '22edbae2733bf6',
      bidderCode: 'aerserv',
      cpm: 5,
      netRevenue: true,
      vastXml: '<!-- ad content >',
      width: 320,
      height: 250,
      currency: 'USD',
      ttl: 600,
      creativeId: 1234
    };

    it('returns no bid when response was not JSON', () => {
      let bids = spec.interpretResponse('random non-json response', {});
      expect(bids.length).to.equal(0);
    });

    it('returns correct bid with a banner response', () => {
      let bids = spec.interpretResponse(bannerResponse, {bidRequest: bannerBidRequest});
      expect(bids[0]).to.deep.equal(bannerBid);
    });

    it('returns correct bid with a vastXml video response', () => {
      let bids = spec.interpretResponse(videoResponse, {bidRequest: videoBidRequest});
      expect(bids[0]).to.deep.equal(videoBid);
    });

    it('returns correct bid with a vastUrl video response', () => {
      let vastUrlResponse = Object.assign({}, videoResponse);
      delete vastUrlResponse.vastXml;
      vastUrlResponse.vastUrl = '<!-- ad content >';
      let bids = spec.interpretResponse(vastUrlResponse, {bidRequest: videoBidRequest});

      let videoUrlBid = Object.assign({}, videoBid);
      delete videoUrlBid.vastXml;
      videoUrlBid.vastUrl = '<!-- ad content >';
      expect(bids[0]).to.deep.equal(videoUrlBid);
    });

    it('returns empty list on error', () => {
      let bids = spec.interpretResponse({error: 5}, {bidRequest: bannerBidRequest});
      expect(bids.length).to.equal(0);
    });

    // the following should never occur, but check anyway
    it('returns empty list on missing ad content', () => {
      let invalidResponse = Object.assign({}, bannerResponse);
      delete invalidResponse.ad;
      let bids = spec.interpretResponse(invalidResponse, {bidRequest: bannerBidRequest});
      expect(bids.length).to.equal(0);
    });

    it('returns empty list on no price', () => {
      let invalidResponse = Object.assign({}, bannerResponse);
      delete invalidResponse.cpm;
      let bids = spec.interpretResponse(invalidResponse, {bidRequest: bannerBidRequest});
      expect(bids.length).to.equal(0);
    });

    it('returns empty list on mismatched adtype', () => {
      let invalidResponse = Object.assign({}, videoResponse);
      delete invalidResponse.cpm;
      let bids = spec.interpretResponse(invalidResponse, {bidRequest: bannerBidRequest});
      expect(bids.length).to.equal(0);
    });

    it('returns empty list on errored valid response', () => {
      let errorResponse = Object.assign({error: 5}, bannerResponse);
      let bids = spec.interpretResponse(errorResponse, {bidRequest: bannerBidRequest});
      expect(bids.length).to.equal(0);
    });

    it('returns empty list empty response', () => {
      let bids = spec.interpretResponse({}, {bidRequest: bannerBidRequest});
      expect(bids.length).to.equal(0);
    });
  });
});
