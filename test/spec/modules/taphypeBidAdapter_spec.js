import { expect } from 'chai';
import { spec } from 'modules/taphypeBidAdapter.js';

describe('taphypeBidAdapterTests', function () {
  it('validate_pub_params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'taphype',
      params: {
        placementId: 12345
      }
    })).to.equal(true);
  });

  it('validate_generated_params', function () {
    let bidRequestData = [{
      bidId: 'bid12345',
      bidder: 'taphype',
      params: {
        placementId: 12345
      },
      sizes: [[300, 250]]
    }];

    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;

    expect(req_data.bidId).to.equal('bid12345');
  });

  it('validate_response_params', function () {
    let bidRequestData = {
      data: {
        bidId: 'bid12345'
      }
    };

    let serverResponse = {
      body: {
        price: 1.23,
        ad: '<html></html>',
        size: '300,250'
      }
    };

    let bids = spec.interpretResponse(serverResponse, bidRequestData);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.cpm).to.equal(1.23);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal('300');
    expect(bid.height).to.equal('250');
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('bid12345');
    expect(bid.ad).to.equal('<html></html>');
  });
});
