import { expect } from 'chai';
import { spec } from 'modules/adponeBidAdapter';

describe('adponeBidAdapter', function () {
  let bid = {
    bidder: 'adpone',
    adUnitCode: 'adunit-code',
    sizes: [[300, 250]],
    bidId: '30b31c1838de1e',
    bidderRequestId: '22edbae2733bf6',
    auctionId: '1d1a030790a475',
    params: {
      placementId: '1',
    }
  };

  describe('isBidRequestValid', function () {
    it('should return true when necessary information is found', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when necessary information is not found', function () {
      // empty bid
      expect(spec.isBidRequestValid({bidId: '', params: {}})).to.be.false;

      // empty bidId
      bid.bidId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      // empty placementId
      bid.bidId = '30b31c1838de1e';
      bid.params.placementId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;

      bid.adUnitCode = 'adunit-code';
    });
  });
});

describe('interpretResponse', function () {
  let serverResponse;
  let bidRequest = { data: {id: '1234'} };

  beforeEach(function () {
    serverResponse = {
      body: {
        id: '2579e20c0bb89',
        seatbid: [
          {
            bid: [
              {
                id: '613673EF-A07C-4486-8EE9-3FC71A7DC73D',
                impid: '2579e20c0bb89_0',
                price: 1,
                adm: '<html><a href="http://www.adpone.com" target="_blank"><img src ="https://placehold.it/300x250" /></a></html>',
                adomain: [
                  'www.addomain.com'
                ],
                iurl: 'http://localhost11',
                crid: 'creative111',
                h: 250,
                w: 300,
                ext: {
                  dspid: 6
                }
              }
            ],
            seat: 'adpone'
          }
        ],
        cur: 'USD'
      },
    };
  });

  it('should correctly reorder the server response', function () {
    const newResponse = spec.interpretResponse(serverResponse, bidRequest);
    expect(newResponse.length).to.be.equal(1);
    expect(newResponse[0]).to.deep.equal({
      id: '613673EF-A07C-4486-8EE9-3FC71A7DC73D',
      requestId: '1234',
      cpm: 1,
      width: 300,
      height: 250,
      creativeId: 'creative111',
      currency: 'USD',
      netRevenue: true,
      ttl: 300,
      ad: '<html><a href="http://www.adpone.com" target="_blank"><img src ="https://placehold.it/300x250" /></a></html>'
    });
  });

  it('should not add responses if the cpm is 0 or null', function () {
    serverResponse.body.seatbid[0].bid[0].price = 0;
    let response = spec.interpretResponse(serverResponse, bidRequest);
    expect(response).to.deep.equal([]);

    serverResponse.body.seatbid[0].bid[0].price = null;
    response = spec.interpretResponse(serverResponse, bidRequest);
    expect(response).to.deep.equal([])
  });
});
