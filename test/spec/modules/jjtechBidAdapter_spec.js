import { expect } from 'chai';
import { spec } from '../../../modules/jjtechBidAdapter.ts';
import { deepClone } from '../../../src/utils.js';

const ENDPOINT_URL = 'https://prebid-server.jambojar.com/openrtb2/auction';

const bidRequestBase = {
  adUnitCode: 'banner-ad-unit-code',
  auctionId: 'auction-id',
  bidId: 'bid-id-1',
  bidder: 'jjtech',
  bidderRequestId: 'bidder-request-id',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  params: { placementId: 'test-placement-1' },
};

describe('JJTech bid adapter', () => {
  describe('spec', () => {
    it('has the required properties', () => {
      expect(spec).to.have.property('code', 'jjtech');
      expect(spec).to.have.property('supportedMediaTypes').that.includes('banner');
      expect(spec).to.have.property('isBidRequestValid').that.is.a('function');
      expect(spec).to.have.property('buildRequests').that.is.a('function');
      expect(spec).to.have.property('interpretResponse').that.is.a('function');
      expect(spec).to.have.property('getUserSyncs').that.is.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid;

    beforeEach(() => {
      bid = deepClone(bidRequestBase);
    });

    it('returns true when placementId is a non-empty string', () => {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('returns false when params is missing', () => {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when placementId is missing', () => {
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when placementId is an empty string', () => {
      bid.params = { placementId: '' };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when placementId is a number', () => {
      bid.params = { placementId: 12345 };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when placementId is null', () => {
      bid.params = { placementId: null };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', () => {
    let bid;
    let bidderRequest;

    beforeEach(() => {
      bid = deepClone(bidRequestBase);
      bidderRequest = {
        bidderCode: 'jjtech',
        auctionId: bid.auctionId,
        bidderRequestId: bid.bidderRequestId,
        bids: [bid],
        ortb2: {
          site: { page: 'https://example.com/article' },
        },
      };
    });

    it('sends a single POST to the JJTech endpoint', () => {
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT_URL);
    });

    it('builds an ORTB request with one banner imp per bid', () => {
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0].id).to.equal('bid-id-1');
      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      expect(request.data.site.page).to.equal('https://example.com/article');
    });

    it('puts placementId on each imp at ext.jjtech.placementId', () => {
      const secondBid = deepClone(bidRequestBase);
      secondBid.bidId = 'bid-id-2';
      secondBid.adUnitCode = 'banner-ad-unit-code-2';
      secondBid.params = { placementId: 'test-placement-2' };
      bidderRequest.bids = [bid, secondBid];

      const request = spec.buildRequests([bid, secondBid], bidderRequest);
      expect(request.data.imp).to.have.lengthOf(2);
      expect(request.data.imp[0].ext.jjtech.placementId).to.equal('test-placement-1');
      expect(request.data.imp[1].ext.jjtech.placementId).to.equal('test-placement-2');
    });

    it('forwards the US privacy string', () => {
      bidderRequest.ortb2.regs = { ext: { us_privacy: '1YNN' } };
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request.data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('forwards GDPR consent when present', () => {
      bidderRequest.ortb2.regs = { ext: { gdpr: 1 } };
      bidderRequest.ortb2.user = { ext: { consent: 'CONSENT-STRING' } };
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('CONSENT-STRING');
    });

    it('forwards the COPPA flag from config', () => {
      bidderRequest.ortb2.regs = { coppa: 1 };
      const request = spec.buildRequests([bid], bidderRequest);
      expect(request.data.regs.coppa).to.equal(1);
    });
  });

  describe('interpretResponse', () => {
    let bid;
    let bidderRequest;
    let request;

    const serverResponse = {
      body: {
        id: 'response-id',
        cur: 'USD',
        seatbid: [
          {
            seat: 'jjtech',
            bid: [
              {
                id: 'seatbid-bid-id',
                impid: 'bid-id-1',
                price: 1.25,
                adm: '<div>jjtech-ad</div>',
                adomain: ['advertiser.com'],
                crid: 'creative-id-1',
                w: 300,
                h: 250,
                mtype: 1,
              },
            ],
          },
        ],
      },
    };

    beforeEach(() => {
      bid = deepClone(bidRequestBase);
      bidderRequest = {
        bidderCode: 'jjtech',
        auctionId: bid.auctionId,
        bidderRequestId: bid.bidderRequestId,
        bids: [bid],
        ortb2: {},
      };
      request = spec.buildRequests([bid], bidderRequest);
    });

    it('maps an ORTB banner bid to a Prebid bid', () => {
      const result = spec.interpretResponse(serverResponse, request);
      const bids = result.bids || result;
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('bid-id-1');
      expect(bids[0].cpm).to.equal(1.25);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.equal('<div>jjtech-ad</div>');
      expect(bids[0].creativeId).to.equal('creative-id-1');
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(300);
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.com']);
    });

    it('returns no bids for an empty response body', () => {
      const result = spec.interpretResponse({ body: null }, request);
      const bids = result.bids || result;
      expect(bids).to.have.lengthOf(0);
    });

    it('returns no bids when seatbid is missing', () => {
      const result = spec.interpretResponse({ body: { id: 'response-id' } }, request);
      const bids = result.bids || result;
      expect(bids).to.have.lengthOf(0);
    });
  });

  describe('getUserSyncs', () => {
    it('registers no user syncs', () => {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [])).to.deep.equal([]);
    });
  });
});
