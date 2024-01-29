import { spec } from '../../../modules/themoneytizerBidAdapter.js'

const VALID_BID_BANNER = {
  ext: {
    gpid: '/123456/prebid.com/desktop/ad-unit-code',
    data: {
      pbadslot: '/123456/prebid.com/desktop/ad-unit-code'
    }
  },
  params: {
    pid: 123456,
  },
  size: {
    banner: {
      sizes: [
        [
          970,
          250
        ]
      ]
    }
  },
  adunit: 'ad-unit-code',
  request_id: '1234567890',
  timeout: 3000,
  ortb2: {

  },
  eids: [],
  schain: {},
  version: 'v8.30.0',
  referer: 'https://prebid.com/',
  referer_canonical: 'https://prebid.com/',
  consent_required: false,
  userEids: []
};

const BIDDER_REQUEST_BANNER = {
  bids: [VALID_BID_BANNER]
}

describe('The Moneytizer Bidder Adapter', function () {
  const bannerRequest = VALID_BID_BANNER;

  describe('codes', function () {
    it('should return a bidder code of themoneytizer', function () {
      expect(spec.code).to.equal('themoneytizer');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true for a bid with all required fields', function () {
      const validBid = spec.isBidRequestValid(VALID_BID_BANNER);
      expect(validBid).to.be.true;
    });

    it('should return false for an invalid bid', function () {
      const invalidBid = spec.isBidRequestValid(null);
      expect(invalidBid).to.be.false;
    });

    it('should return false when required fields are missing', function () {
      const bid = {
        bidId: '123456',
        auctionId: '666',
        params: {} // empty params
      };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('Test the request processing function', function () {
      const requests = spec.buildRequests([VALID_BID_BANNER], BIDDER_REQUEST_BANNER);
      expect(requests).to.be.an('array').that.is.not.empty;
    });

    it('should build a request with all necessary parameters', function () {
      const request = spec.buildRequests([VALID_BID_BANNER], [BIDDER_REQUEST_BANNER]);

      expect(request).to.have.all.keys('method', 'url', 'data');
      expect(request.method).to.equal('POST');
    });
  });

  // const responseBody = {
  //     id: '12345',
  //     seatbid: [
  //         {
  //             bid: [
  //                 {
  //                     id: 'auctionId',
  //                     impid: 'impId',
  //                     price: 0.0,
  //                     adm: 'adMarkup',
  //                     crid: 'creativeId',
  //                     h: 50,
  //                     w: 320
  //                 }
  //             ]
  //         }
  //     ],
  //     cur: 'USD'
  // };

  // it('Test the response parsing function', function () {
  //     const receivedBid = responseBody.seatbid[0].bid[0];
  //     const response = {};
  //     response.body = responseBody;

  //     const bidResponse = spec.interpretResponse(response, null);
  //     expect(bidResponse).to.not.be.empty;

  //     const bid = bidResponse[0];
  //     expect(bid).to.not.be.empty;
  //     expect(bid.ad).to.equal(receivedBid.adm);
  //     expect(bid.cpm).to.equal(receivedBid.price);
  //     expect(bid.height).to.equal(receivedBid.h);
  //     expect(bid.width).to.equal(receivedBid.w);
  //     expect(bid.requestId).to.equal(receivedBid.impid);
  // });
});
