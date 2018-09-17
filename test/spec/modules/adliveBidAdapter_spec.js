import { expect } from 'chai';
import { spec } from 'modules/adliveBidAdapter';

describe('adliveBidAdapterTests', function () {
  it('validate_pub_params', function () {
    expect(spec.isBidRequestValid({
      bidder: 'adlive',
      params: {
        hashes: ['1e100887dd614b0909bf6c49ba7f69fdd1360437']
      }
    })).to.equal(true);
  });
  it('validate_generated_params', function () {
    let bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'adlive',
      params: {hashes: ['1e100887dd614b0909bf6c49ba7f69fdd1360437']},
      sizes: [[300, 250]]
    }]
    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;
    expect(req_data.bidid).to.equal('bid1234');
  });
  it('validate_response_params', function () {
    let serverResponse = {
      body: [{
        bidid: 'bid1234',
        price: 1.12,
        size: [300, 250],
        content: 'Ad html',
        hash: '1e100887dd614b0909bf6c49ba7f69fdd1360437'
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
