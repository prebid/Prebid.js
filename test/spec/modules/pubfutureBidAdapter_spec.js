import { expect } from 'chai';
import { spec } from 'modules/pubfutureBidAdapter.js';
import 'modules/priceFloors.js';

const ENDPOINT = 'https://ortb2.pubstar-ad.com/v1/bid';

const BANNER_BID = {
  bidder: 'pubfuture',
  adUnitCode: 'banner-div',
  bidId: 'bid-1',
  params: {
    adUnitId: 'unit-123',
    publisherId: 'pub-1',
  },
  mediaTypes: { banner: { sizes: [[300, 250]] } },
};

const VIDEO_BID = {
  bidder: 'pubfuture',
  adUnitCode: 'video-div',
  bidId: 'bid-2',
  params: {
    adUnitId: 'unit-video',
  },
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[640, 480]],
      mimes: ['video/mp4'],
    },
  },
};

const TEST_AD_BID = {
  bidder: 'pubfuture',
  adUnitCode: 'test-div',
  bidId: 'bid-3',
  params: {
    test: true,
  },
  mediaTypes: { banner: { sizes: [[300, 250]] } },
};

const TEST_AD_UNIT_ID = '1247/99228313862_68e5e38e1a65f400287e6845';

const BIDDER_REQUEST = {
  bidderCode: 'pubfuture',
  auctionId: 'auction-1',
  bidderRequestId: 'br-1',
  bids: [BANNER_BID],
};

describe('pubfutureBidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('accepts a bid with adUnitId', function () {
      expect(spec.isBidRequestValid(BANNER_BID)).to.equal(true);
    });

    it('rejects a bid without adUnitId', function () {
      expect(spec.isBidRequestValid({ params: {} })).to.equal(false);
    });

    it('rejects a bid with empty adUnitId', function () {
      expect(spec.isBidRequestValid({ params: { adUnitId: '' } })).to.equal(false);
    });

    it('rejects a bid with a non-string adUnitId', function () {
      expect(spec.isBidRequestValid({ params: { adUnitId: 42 } })).to.equal(false);
    });

    it('accepts a test bid without an adUnitId', function () {
      expect(spec.isBidRequestValid({ params: { test: true } })).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('POSTs a single oRTB request to the fixed endpoint', function () {
      const [request] = spec.buildRequests([BANNER_BID], BIDDER_REQUEST);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0].tagid).to.equal('unit-123');
      expect(request.data.site.publisher.id).to.equal('pub-1');
    });

    it('maps params.bidfloor onto the imp', function () {
      const bid = { ...BANNER_BID, params: { ...BANNER_BID.params, bidfloor: 0.5 } };
      const [request] = spec.buildRequests([bid], { ...BIDDER_REQUEST, bids: [bid] });
      expect(request.data.imp[0].bidfloor).to.equal(0.5);
      expect(request.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('does not overwrite a floor already set by the priceFloors module (getFloor)', function () {
      const bid = {
        ...BANNER_BID,
        params: { ...BANNER_BID.params, bidfloor: 0.5 },
        getFloor: () => ({ currency: 'USD', floor: 2.75 }),
      };
      const [request] = spec.buildRequests([bid], { ...BIDDER_REQUEST, bids: [bid] });
      expect(request.data.imp[0].bidfloor).to.equal(2.75);
      expect(request.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('collects several ad units into one request', function () {
      const bids = [BANNER_BID, VIDEO_BID];
      const [request] = spec.buildRequests(bids, { ...BIDDER_REQUEST, bids });
      expect(request.data.imp).to.have.lengthOf(2);
      expect(request.data.imp[1].tagid).to.equal('unit-video');
      expect(request.data.imp[1].video).to.be.an('object');
    });

    it('swaps tagid to the well-known test ad unit and flags the request as test:1', function () {
      const bids = [TEST_AD_BID];
      const [request] = spec.buildRequests(bids, { ...BIDDER_REQUEST, bids });
      expect(request.data.imp[0].tagid).to.equal(TEST_AD_UNIT_ID);
      expect(request.data.test).to.equal(1);
    });

    it('leaves test at the oRTB default (0 = live) for a normal auction', function () {
      const [request] = spec.buildRequests([BANNER_BID], BIDDER_REQUEST);
      expect(request.data.test).to.equal(0);
    });

    it('ignores a real adUnitId when test is true', function () {
      const bid = { ...TEST_AD_BID, params: { ...TEST_AD_BID.params, adUnitId: 'unit-123' } };
      const [request] = spec.buildRequests([bid], { ...BIDDER_REQUEST, bids: [bid] });
      expect(request.data.imp[0].tagid).to.equal(TEST_AD_UNIT_ID);
    });
  });

  describe('interpretResponse', function () {
    it('returns [] on an empty body', function () {
      expect(spec.interpretResponse({ body: {} }, {})).to.deep.equal([]);
    });

    it('returns [] on an empty seatbid array', function () {
      const [request] = spec.buildRequests([BANNER_BID], BIDDER_REQUEST);
      const response = { body: { id: request.data.id, seatbid: [] } };
      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });

    it('maps a banner seatbid with mtype to a banner prebid bid', function () {
      const [request] = spec.buildRequests([BANNER_BID], BIDDER_REQUEST);
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 1.25,
              adm: '<div>ad</div>',
              crid: 'creative-1',
              mtype: 1,
              w: 300,
              h: 250,
            }],
          }],
        },
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].cpm).to.equal(1.25);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(300);
    });

    it('drops a real ad unit bid that omits mtype (no fallback — the gateway is required to send it)', function () {
      const [request] = spec.buildRequests([BANNER_BID], BIDDER_REQUEST);
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 1.25,
              adm: '<div>ad</div>',
              crid: 'creative-1',
              w: 300,
              h: 250,
            }],
          }],
        },
      };
      expect(spec.interpretResponse(response, request)).to.deep.equal([]);
    });

    it('TEMP: still maps the test ad unit to banner when the gateway omits mtype', function () {
      // Scoped fallback while the gateway fixes missing `mtype` on the test
      // ad unit's response specifically — remove this test (and the fallback
      // in bidResponse()) once the gateway always sends `mtype`.
      const bids = [TEST_AD_BID];
      const [request] = spec.buildRequests(bids, { ...BIDDER_REQUEST, bids });
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 1.25,
              adm: '<div>test ad</div>',
              crid: 'creative-test',
              w: 300,
              h: 250,
            }],
          }],
        },
      };
      const parsed = spec.interpretResponse(response, request);
      expect(parsed).to.have.lengthOf(1);
      expect(parsed[0].mediaType).to.equal('banner');
    });

    it('honors an explicit mtype from the server', function () {
      const bids = [VIDEO_BID];
      const [request] = spec.buildRequests(bids, { ...BIDDER_REQUEST, bids });
      const response = {
        body: {
          id: request.data.id,
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 3.0,
              adm: '<VAST version="4.0"></VAST>',
              crid: 'creative-v',
              mtype: 2,
              w: 640,
              h: 480,
            }],
          }],
        },
      };
      const parsed = spec.interpretResponse(response, request);
      expect(parsed).to.have.lengthOf(1);
      expect(parsed[0].mediaType).to.equal('video');
    });
  });

  describe('getUserSyncs', function () {
    it('returns no syncs', function () {
      expect(spec.getUserSyncs()).to.deep.equal([]);
    });
  });
});
