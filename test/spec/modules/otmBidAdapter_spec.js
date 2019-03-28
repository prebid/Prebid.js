import { expect } from 'chai';
import { spec } from 'modules/otmBidAdapter';

describe('otmBidAdapterTests', function () {
  it('validate_pub_params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'otm',
      params: {
        pid: 1,
        tid: 'demo',
        bidfloor: 20
      }
    })).to.equal(true);
  });

  it('validate_generated_params', function () {
    let bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'otm',
      params: {
        pid: 1,
        tid: 'demo',
        bidfloor: 20
      },
      sizes: [[240, 400]]
    }];

    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;

    expect(req_data.bidId).to.equal('bid1234');
  });

  it('validate_response_params', function () {
    let bidRequestData = {
      data: {
        bidId: 'bid1234'
      }
    };

    let serverResponse = {
      body: {
        price: 1.12,
        ad: 'Ad html',
        size: '250x600'
      }
    };

    let bids = spec.interpretResponse(serverResponse, bidRequestData);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.cpm).to.equal(1.12);
    expect(bid.currency).to.equal('RUB');
    expect(bid.width).to.equal('250');
    expect(bid.height).to.equal('600');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('bid1234');
    expect(bid.ad).to.equal('Ad html');
  });
});
