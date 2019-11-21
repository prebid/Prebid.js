import { expect } from 'chai';
import { spec } from 'modules/betweenBidAdapter';

describe('betweenBidAdapterTests', function () {
  it('validate_pub_params: valid bid', function () {
    expect(spec.isBidRequestValid({
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: 1112
      }
    })).to.equal(true);
  });

  it('validate_pub_params: empty bid', function () {
    expect(spec.isBidRequestValid()).to.equal(false);
  });

  it('validate_pub_params: bid.params.s is not a number', function () {
    expect(spec.isBidRequestValid({
      bidder: 'between',
      params: {
        w: 240,
        h: 400,
        s: '1112'
      }
    })).to.equal(false);
  });

  it('validate_pub_params: bid.params.w is absent', function () {
    expect(spec.isBidRequestValid({
      bidder: 'between',
      params: {
        h: 400,
        s: 1112
      }
    })).to.equal(false);
  });

  it('validate_pub_params: bid.params is absent', function () {
    expect(spec.isBidRequestValid({
      bidder: 'between',
      params: {
      }
    })).to.equal(false);
  });

  it('validate_generated_params', function () {
    let bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {w: 240, h: 400, s: 1112},
      sizes: [[240, 400]]
    }]
    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;
    expect(req_data.bidid).to.equal('bid1234');
  });
  it('validate_response_params', function () {
    let serverResponse = {
      body: [{
        bidid: 'bid1234',
        cpm: 1.12,
        w: 240,
        h: 400,
        currency: 'USD',
        ad: 'Ad html'
      }]
    };
    let bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.cpm).to.equal(1.12);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(240);
    expect(bid.height).to.equal(400);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('bid1234');
    expect(bid.ad).to.equal('Ad html');
  });
  it('validate_response_params', function () {
    let serverResponse = {
      body: [{
        bidid: 'bid1234',
        w: 240,
        h: 400,
        currency: 'USD',
        ad: 'Ad html'
      }]
    };
    let bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.cpm).to.equal(0);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(240);
    expect(bid.height).to.equal(400);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('bid1234');
    expect(bid.ad).to.equal('Ad html');
  });
});
