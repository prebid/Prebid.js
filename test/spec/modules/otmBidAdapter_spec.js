import {expect} from 'chai';
import {spec} from 'modules/otmBidAdapter';

describe('otmBidAdapter', function () {
  it('pub_params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'otm',
      params: {
        tid: '123',
        bidfloor: 20
      }
    })).to.equal(true);
  });

  it('generated_params common case', function () {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'otm',
      params: {
        tid: '123',
        bidfloor: 20,
        domain: 'github.com'
      },
      sizes: [[240, 400]]
    }];

    const request = spec.buildRequests(bidRequestData);
    const req_data = request[0].data;

    expect(req_data.bidid).to.equal('bid1234');
    expect(req_data.domain).to.equal('github.com');
  });

  it('generated_params should return top level origin as domain if not defined', function () {
    const bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'otm',
      params: {
        tid: '123',
        bidfloor: 20
      },
      sizes: [[240, 400]]
    }];

    const bidderRequest = {refererInfo: {page: `https://github.com:3000/`, domain: 'github.com:3000'}}

    const request = spec.buildRequests(bidRequestData, bidderRequest);
    const req_data = request[0].data;

    expect(req_data.domain).to.equal(`github.com:3000`);
  });

  it('response_params common case', function () {
    const bidRequestData = {
      data: {
        bidId: 'bid1234'
      }
    };

    const serverResponse = {
      body: [
        {
          'auctionid': '3c6f8e22-541b-485c-9214-e974d9fb1b6f',
          'cpm': 847.097,
          'ad': '<html><body>test html</body></html>',
          'w': 240,
          'h': 400,
          'currency': 'RUB',
          'ttl': 300,
          'creativeid': '1_7869053',
          'bidid': '101f211def7c99',
          'transactionid': 'transaction_id_1'
        }
      ]
    };

    const bids = spec.interpretResponse(serverResponse, bidRequestData);
    expect(bids).to.have.lengthOf(1);
    const bid = bids[0];
    expect(bid.cpm).to.equal(847.097);
    expect(bid.currency).to.equal('RUB');
    expect(bid.width).to.equal(240);
    expect(bid.height).to.equal(400);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('101f211def7c99');
    expect(bid.ad).to.equal('<html><body>test html</body></html>');
  });
});
