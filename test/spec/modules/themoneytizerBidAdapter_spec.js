import { spec } from '../../../modules/themoneytizerBidAdapter.js'

const ENDPOINT_URL = 'https://ads.biddertmz.com/m/';

const VALID_BID_BANNER = {
  ortb2Imp: {
    ext: {}
  },
  params: {
    pid: 123456,
  },
  mediaTypes: {
    banner: {
      sizes: [[970, 250]]
    }
  },
  adUnitCode: 'ad-unit-code',
  bidId: '82376dbe72be72',
  timeout: 3000,
  ortb2: {},
  userIdAsEids: [],
  auctionId: '123456-abcdef-7890',
  schain: {}
}

const BIDDER_REQUEST_BANNER = {
  bids: [VALID_BID_BANNER]
}

const SERVER_RESPONSE = {
  c_sync: {
    status: 'ok',
    bidder_status: [
      {
        bidder: 'bidder-A',
        usersync: {
          url: 'https://syncurl.com',
          type: 'redirect'
        }
      },
      {
        bidder: 'bidder-B',
        usersync: {
          url: 'https://syncurl2.com',
          type: 'image'
        }
      }
    ]
  },
  bid: {
    requestId: '17750222eb16825',
    cpm: 0.098,
    currency: 'USD',
    width: 300,
    height: 600,
    creativeId: '44368852571075698202250',
    dealId: '',
    netRevenue: true,
    ttl: 5,
    ad: '<p>This is an ad</p>',
    mediaType: 'banner',
  }
};

describe('The Moneytizer Bidder Adapter', function () {
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

    it('should return false when params are incomplete', function () {
      const bidWithIncompleteParams = {
        ...VALID_BID_BANNER,
        params: {}
      };
      expect(spec.isBidRequestValid(bidWithIncompleteParams)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let requests, request;

    before(function () {
      requests = spec.buildRequests([VALID_BID_BANNER], BIDDER_REQUEST_BANNER);
      request = requests[0];
    });

    it('should build a request array for valid bids', function () {
      expect(requests).to.be.an('array').that.is.not.empty;
    });

    it('should build a request with the correct method, URL, and data type', function () {
      expect(request).to.include.keys(['method', 'url', 'data']);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.data).to.be.a('string');
    });

    describe('Payload structure', function () {
      let payload;

      before(function () {
        payload = JSON.parse(request.data);
      });

      it('should have correct payload structure', function () {
        expect(payload).to.be.an('object');
        expect(payload.size).to.be.an('object');
        expect(payload.params).to.be.an('object');
      });
    });
  });

  describe('interpretResponse', function () {
    let bidResponse, receivedBid;
    const responseBody = {
      bid: {
        id: 'auctionId',
        impid: 'impId',
        cpm: 0.0,
        ad: 'adMarkup',
        crid: 'creativeId',
        height: 250,
        width: 300
      },
      timeout: false
    };

    before(function () {
      receivedBid = responseBody.bid;
      const response = { body: responseBody };
      bidResponse = spec.interpretResponse(response, null);
    });

    it('should not return an empty response', function () {
      expect(bidResponse).to.not.be.empty;
    });

    describe('Parsed Bid Object', function () {
      let bid;

      before(function () {
        bid = bidResponse[0];
      });

      it('should not be empty', function () {
        expect(bid).to.not.be.empty;
      });

      it('should correctly interpret ad markup', function () {
        expect(bid.ad).to.equal(receivedBid.ad);
      });

      it('should correctly interpret CPM', function () {
        expect(bid.cpm).to.equal(receivedBid.cpm);
      });

      it('should correctly interpret dimensions', function () {
        expect(bid.height).to.equal(receivedBid.height);
        expect(bid.width).to.equal(receivedBid.width);
      });

      it('should correctly interpret request ID', function () {
        expect(bid.impid).to.equal(receivedBid.impid);
      });
    });
  });

  describe('onTimeout', function () {
    const timeoutData = [{
      timeout: null
    }];

    it('should exists and be a function', () => {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });
    it('should include timeoutData', function () {
      expect(spec.onTimeout(timeoutData)).to.be.undefined;
    })
  });

  describe('getUserSyncs', function () {
    const response = { body: SERVER_RESPONSE };

    it('should have empty user sync with iframeEnabled to false', function () {
      const result = spec.getUserSyncs({ iframeEnabled: false }, [response]);

      expect(result).to.be.empty;
    });

    it('should have user sync with iframeEnabled to true', function () {
      const result = spec.getUserSyncs({ iframeEnabled: true }, [response]);

      expect(result).to.not.be.empty;
      expect(result[0].type).to.equal('image');
      expect(result[0].url).to.equal(SERVER_RESPONSE.c_sync.bidder_status[0].usersync.url);
    });

    it('should transform type redirect into image', function () {
      const result = spec.getUserSyncs({ iframeEnabled: true }, [response]);

      expect(result[1].type).to.equal('image');
    });
  });
});
