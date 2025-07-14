import { expect } from 'chai';
import { spec, __setTestConverter } from 'modules/oprxBidAdapter.js';

describe('oprxBidAdapter', function () {
  const bid = {
    bidder: 'oprx',
    bidId: 'bid123',
    auctionId: 'auction123',
    adUnitCode: 'div-id',
    transactionId: 'txn123',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    params: {
      key: 'abc',
      placement_id: '123456',
      npi: '9999999999',
      bid_floor: 1.25
    }
  };

  const bidderRequest = {
    auctionId: 'auction123',
    bidderCode: 'oprx',
    refererInfo: { referer: 'https://example.com' }
  };

  // SETUP: Replace real converter with mock
  before(() => {
    __setTestConverter({
      toORTB: ({ bRequests }) => ({
        id: 'test-request',
        imp: bRequests.map(bid => ({
          id: bid.bidId,
          banner: { format: [{ w: 300, h: 250 }] },
          bidfloor: bid.params.bid_floor || 0
        })),
        cur: ['USD'],
        site: { page: 'https://example.com' }
      }),
      fromORTB: ({ response }) => ({
        bids: response.seatbid?.[0]?.bid?.map(b => ({
          requestId: b.impid,
          cpm: b.price,
          ad: b.adm,
          width: b.w,
          height: b.h,
          currency: 'USD',
          creativeId: b.crid,
          netRevenue: true,
          ttl: 50
        })) || []
      })
    });
  });

  describe('buildRequests', () => {
    it('should build a valid request object', () => {
      const request = spec.buildRequests([bid], bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.include('placement_id=123456');
      expect(request.data).to.be.an('object');
    });
  });

  describe('interpretResponse', () => {
    let request;

    beforeEach(() => {
      request = spec.buildRequests([bid], bidderRequest)[0];
    });

    it('should return a valid bid response', () => {
      const serverResponse = {
        body: {
          id: 'resp123',
          cur: 'USD',
          seatbid: [{
            bid: [{
              impid: 'bid123',
              price: 2.5,
              adm: '<div>Ad</div>',
              crid: 'creative-789',
              w: 300,
              h: 250
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.be.an('array').with.lengthOf(1);
      const b = bids[0];
      expect(b.cpm).to.equal(2.5);
      expect(b.ad).to.include('Ad');
    });
  });
});
