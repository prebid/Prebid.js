import {expect} from 'chai';
import {spec} from 'modules/otmBidAdapter.js';

describe('otmBidAdapterTests', function () {
  it('validate_pub_params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'otm',
      params: {
        tid: '123',
        bidfloor: 20
      }
    })).to.equal(true);
  });

  it('validate_generated_params', function () {
    let bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'otm',
      params: {
        tid: '123',
        bidfloor: 20
      },
      sizes: [[240, 400]]
    }];

    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;

    expect(req_data.bidid).to.equal('bid1234');
  });

  it('validate_best_size_select', function () {
    // when:
    let bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'otm',
      params: {
        tid: '123',
        bidfloor: 20
      },
      sizes: [[300, 500], [300, 600], [240, 400], [300, 50]]
    }];

    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;

    // then:
    expect(req_data.w).to.equal(240);
    expect(req_data.h).to.equal(400);

    // when:
    bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'otm',
      params: {
        tid: '123',
        bidfloor: 20
      },
      sizes: [[200, 240], [400, 440]]
    }];

    request = spec.buildRequests(bidRequestData);
    req_data = request[0].data;

    // then:
    expect(req_data.w).to.equal(200);
    expect(req_data.h).to.equal(240);
  });

  it('validate_response_params', function () {
    let bidRequestData = {
      data: {
        bidId: 'bid1234'
      }
    };

    let serverResponse = {
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

    let bids = spec.interpretResponse(serverResponse, bidRequestData);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.cpm).to.equal(847.097);
    expect(bid.currency).to.equal('RUB');
    expect(bid.width).to.equal(240);
    expect(bid.height).to.equal(400);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('101f211def7c99');
    expect(bid.ad).to.equal('<html><body>test html</body></html>');
  });
});
