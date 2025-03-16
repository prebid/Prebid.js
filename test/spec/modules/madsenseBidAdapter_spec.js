import { expect } from 'chai';
import { spec } from 'modules/madsenseBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { generateUUID } from '../../../src/utils.js';

const getCommonParams = () => ({
  company_id: '1234567'
});

const getVideoParams = () => ({
  video: {
    playerWidth: 640,
    playerHeight: 480,
    mimes: ['video/mp4', 'application/javascript'],
    protocols: [2, 5],
    api: [2],
    position: 1,
    delivery: [2],
    sid: 134,
    rewarded: 1,
    placement: 1,
    plcmt: 1,
    hp: 1,
    inventoryid: 123,
  },
  site: {
    id: 1,
    page: 'https://test.io',
    referrer: 'http://test.io',
  },
});

const getBannerRequest = () => ({
  bidderCode: 'madsense',
  auctionId: generateUUID(),
  bidderRequestId: 'bidderRequestId',
  bids: [
    {
      bidder: 'madsense',
      params: getCommonParams(),
      auctionId: generateUUID(),
      placementCode: 'dummy-placement-code',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]],
        },
      },
      bidId: 'a1b2c3d4',
      bidderRequestId: 'bidderRequestId',
    },
  ],
  start: Date.now(),
  auctionStart: Date.now() - 1,
  timeout: 3000,
});

const getVideoBid = (bidId) => ({
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[640, 480]],
    },
  },
  bidder: 'madsense',
  sizes: [640, 480],
  bidId,
  adUnitCode: 'video1',
  params: {
    ...getVideoParams(),
    ...getCommonParams(),
  },
});

const getVideoRequest = () => ({
  bidderCode: 'madsense',
  auctionId: generateUUID(),
  bidderRequestId: 'q1w2e3r4',
  bids: [getVideoBid('i8u7y6t5'), getVideoBid('i8u7y6t5')],
  auctionStart: Date.now(),
  timeout: 5000,
  start: Date.now() + 4,
  refererInfo: {
    numIframes: 1,
    reachedTop: true,
    referer: 'test.io',
  },
});

const getBidderResponse = () => ({
  headers: null,
  body: {
    id: 'bid-response',
    seatbid: [
      {
        bid: [
          {
            id: 'a1b2c3d4',
            impid: 'a1b2c3d4',
            price: 0.18,
            adm: '<script>adm</script>',
            adid: '144762342',
            adomain: ['https://test.io'],
            iurl: 'iurl',
            cid: '109',
            crid: 'creativeId',
            w: 300,
            h: 250,
            ext: {
              prebid: { type: 'banner' },
              bidder: {
                appnexus: {
                  brand_id: 321654987,
                  auction_id: 321654987000000,
                  bidder_id: 2,
                  bid_ad_type: 0,
                },
              },
            },
          },
        ],
        seat: 'madsense',
      },
    ]
  },
});

describe('madsenseBidAdapter', function () {
  describe('interpretResponse', function () {
    context('when mediaType is banner', function () {
      it('handles empty response', function () {
        const bidderRequest = getBannerRequest();
        const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
        const EMPTY_RESP = { ...getBidderResponse(), body: {} };
        const bids = spec.interpretResponse(EMPTY_RESP, bidRequest);

        expect(bids).to.be.empty;
      });

      it('validates banner bid', function () {
        const bidderRequest = getBannerRequest();
        const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
        const bidderResponse = getBidderResponse();
        const bids = spec.interpretResponse(bidderResponse, bidRequest);

        expect(bids).to.be.an('array').that.is.not.empty;
        validateBid(bids[0], bidderResponse.body.seatbid[0].bid[0]);
      });
    });

    context('when mediaType is video', function () {
      it('handles empty response', function () {
        const bidderRequest = getVideoRequest();
        const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
        const EMPTY_RESP = { ...getBidderResponse(), body: {} };
        const bids = spec.interpretResponse(EMPTY_RESP, bidRequest);

        expect(bids).to.be.empty;
      });

      it('returns no bids if required fields are missing', function () {
        const bidderRequest = getVideoRequest();
        const bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);

        const MISSING_FIELDS_RESP = {
          ...getBidderResponse(),
          body: { seatbid: [{ bid: [{ price: 6.01 }] }] },
        };
        const bids = spec.interpretResponse(MISSING_FIELDS_RESP, bidRequest);
        expect(bids.length).to.equal(0);
      });
    });
  });
});

function validateBid(actualBid, expectedBid) {
  expect(actualBid).to.include({
    currency: 'USD',
    requestId: expectedBid.impid,
    cpm: expectedBid.price,
    width: expectedBid.w,
    height: expectedBid.h,
    ad: expectedBid.adm,
    creativeId: expectedBid.crid,
    ttl: 55,
    netRevenue: true,
  });
  expect(actualBid.meta).to.have.property('advertiserDomains');
}
