import { expect } from 'chai';
import { spec } from 'modules/peak226BidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const URL = 'a.ad216.com/header_bid';

describe('PeakAdapter', () => {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', () => {
    it('should return true when required params found', () => {
      const bid = {
        params: {
          uid: 123
        }
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      const bid = {
        params: {}
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  // xdescribe('buildRequests', () => {
  //   const bidRequests = [
  //     {
  //       params: {
  //         uid: '1234'
  //       }
  //     }
  //   ];

  //   it('sends bid request to URL via GET', () => {
  //     const request = spec.buildRequests(bidRequests);

  //     expect(request.url).to.equal(`${URL}?uids=1234`);
  //     expect(request.method).to.equal('GET');
  //   });
  // });

  describe('interpretResponse', () => {
    it('should handle empty response', () => {
      let bids = spec.interpretResponse(
        {},
        {
          bidsMap: {}
        }
      );

      expect(bids).to.be.lengthOf(0);
    });

    it('should handle no seatbid returned', () => {
      let response = {};

      let bids = spec.interpretResponse(
        { body: response },
        {
          bidsMap: {}
        }
      );

      expect(bids).to.be.lengthOf(0);
    });

    it('should handle empty seatbid returned', () => {
      let response = { seatbid: [] };

      let bids = spec.interpretResponse(
        { body: response },
        {
          bidsMap: {}
        }
      );

      expect(bids).to.be.lengthOf(0);
    });

    it('should handle seatbid returned bids', () => {
      const bidsMap = { 1: [{ bidId: 11 }] };
      const bid = {
        price: 0.2,
        auid: 1,
        h: 250,
        w: 300,
        adm: 'content'
      };
      const response = {
        seatbid: [
          {
            seat: 'foo',
            bid: [bid]
          }
        ]
      };

      let bids = spec.interpretResponse({ body: response }, { bidsMap });

      expect(bids).to.be.lengthOf(1);

      expect(bids[0].cpm).to.equal(bid.price);
      expect(bids[0].width).to.equal(bid.w);
      expect(bids[0].height).to.equal(bid.h);
      expect(bids[0].ad).to.equal(bid.adm);
      expect(bids[0].bidderCode).to.equal(spec.code);
    });
  });
});
