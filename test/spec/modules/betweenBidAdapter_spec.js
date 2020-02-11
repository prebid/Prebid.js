import { expect } from 'chai';
import { spec } from 'modules/betweenBidAdapter';

describe('betweenBidAdapterTests', () => {
  it('validate_pub_params', () => {
    expect(spec.isBidRequestValid({
      bidder: 'between',
      params: {
        placementId: 'example',
        w: 240,
        h: 400,
        s: 1112
      }
    })).to.equal(true);
  });
  it('validate_generated_params', () => {
    let bidRequestData = [{
      bidId: 'bid1234',
      bidder: 'between',
      params: {w: 240, h: 400, s: 1112, placementId: 'example'},
      sizes: [[240, 400]]
    }]
    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0].data;
    expect(req_data.bidid).to.equal('bid1234');
  });
  it('validate_response_params', () => {
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
    expect(bid.requestId).to.equal('bid1234');
    expect(bid.ad).to.equal('Ad html');
  });
});
