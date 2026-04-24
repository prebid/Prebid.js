import { cloneDeep } from "lodash";
import { spec } from "../../../modules/yaleoBidAdapter.ts";

const bannerBidRequestBase = {
  adUnitCode: 'banner-ad-unit-code',
  auctionId: 'banner-auction-id',
  bidId: 'banner-bid-id',
  bidder: 'yaleo',
  bidderRequestId: 'banner-bidder-request-id',
  mediaTypes: { banner: [[300, 250]] },
  params: { placementId: '12345' },
};

const bannerServerResponseBase = {
  body: {
    id: 'banner-server-response-id',
    seatbid: [
      {
        bid: [
          {
            id: 'banner-seatbid-bid-id',
            impid: 'banner-bid-id',
            price: 0.05,
            adm: '<div>banner-ad</div>',
            adid: 'banner-ad-id',
            adomain: ['audienzz.com', 'yaleo.com'],
            iurl: 'iurl',
            cid: 'banner-campaign-id',
            crid: 'banner-creative-id',
            cat: [],
            w: 300,
            h: 250,
            mtype: 1,
          },
        ],
        seat: 'yaleo',
      },
    ],
    cur: 'USD',
  },
};

describe('Yaleo bid adapter', () => {
  let bannerBidRequest;

  beforeEach(() => {
    bannerBidRequest = cloneDeep(bannerBidRequestBase);
  });

  describe('spec', () => {
    it('checks that spec has required properties', () => {
      expect(spec).to.have.property('code', 'yaleo');
      expect(spec).to.have.property('supportedMediaTypes').that.includes('banner');
      expect(spec).to.have.property('isBidRequestValid').that.is.a('function');
      expect(spec).to.have.property('buildRequests').that.is.a('function');
      expect(spec).to.have.property('interpretResponse').that.is.a('function');
      expect(spec).to.have.property('gvlid').that.equals(783);
    });
  });

  describe('isBidRequestValid', () => {
    it('returns true when all params are specified', () => {
      bannerBidRequest.params = {
        placementId: '12345',
        maxCpm: 5.00,
        memberId: 12345,
      };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
    });

    it('returns true when required params are specified', () => {
      bannerBidRequest.params = { placementId: '12345' };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
    });

    it('returns false when params are empty', () => {
      bannerBidRequest.params = {};
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when params are not specified', () => {
      bannerBidRequest.params = undefined;
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returnsfalse when required params are not specified', () => {
      bannerBidRequest.params = { wrongParam: '12345' };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is a number', () => {
      bannerBidRequest.params = { placementId: 12345 };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is a boolean', () => {
      bannerBidRequest.params = { placementId: true };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is an object', () => {
      bannerBidRequest.params = { placementId: {} };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is an array', () => {
      bannerBidRequest.params = { placementId: [] };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is undefined', () => {
      bannerBidRequest.params = { placementId: undefined };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });

    it('returns false when placementId is null', () => {
      bannerBidRequest.params = { placementId: null };
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    it('creates a valid banner bid request', () => {
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
        ortb2: {
          site: {
            page: 'http://example.com',
          }
        }
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://bidder.yaleo.com/prebid');
      expect(request.data.imp.length).to.equal(1);
      expect(request.data.imp[0]).to.have.property('banner');
      expect(request.data.site.page).to.be.equal('http://example.com');
    });

    it('checks that all params are passed to the request', () => {
      bannerBidRequest.params = {
        placementId: '12345',
        maxCpm: 5.00,
        memberId: 12345,
      };
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);
      const yaleoParams = request.data.imp[0].ext.prebid.bidder.yaleo;

      expect(yaleoParams.placementId).to.equal('12345');
      expect(yaleoParams.maxCpm).to.equal(5.00);
      expect(yaleoParams.memberId).to.equal(12345);
    });
  });

  it('checks that only specified params are passed to the request', () => {
    bannerBidRequest.params = {
      placementId: '12345',
    };

    const bidderRequest = {
      bids: [bannerBidRequest],
      auctionId: bannerBidRequest.auctionId,
      bidderRequestId: bannerBidRequest.bidderRequestId,
    };

    const request = spec.buildRequests([bannerBidRequest], bidderRequest);
    const yaleoParams = request.data.imp[0].ext.prebid.bidder.yaleo;

    expect(yaleoParams).to.deep.equal({ placementId: '12345' });
  });

  describe('interpretResponse', () => {
    let bannerServerResponse;
    beforeEach(() => {
      bannerServerResponse = cloneDeep(bannerServerResponseBase);
    });

    it('parses banner bid response correctly', () => {
      const bidderRequest = {
        bids: [bannerBidRequest],
        auctionId: bannerBidRequest.auctionId,
        bidderRequestId: bannerBidRequest.bidderRequestId,
      };

      const request = spec.buildRequests([bannerBidRequest], bidderRequest);
      const response = spec.interpretResponse(bannerServerResponse, request);

      expect(response).to.have.property('bids');
      expect(response.bids.length).to.be.equal(1);
      expect(response.bids[0].cpm).to.equal(0.05);
      expect(response.bids[0].currency).to.equal('USD');
      expect(response.bids[0].mediaType).to.equal('banner');
      expect(response.bids[0].width).to.equal(300);
      expect(response.bids[0].height).to.equal(250);
      expect(response.bids[0].creativeId).to.equal('banner-creative-id');
      expect(response.bids[0].ad).to.equal('<div>banner-ad</div>');
      expect(response.bids[0].bidderCode).to.equal('yaleo');
      expect(response.bids[0].meta.advertiserDomains).to.deep.equal(['audienzz.com', 'yaleo.com']);
      expect(response.bids[0].netRevenue).to.be.true;
      expect(response.bids[0].ttl).to.equal(300);
    });
  });
});
