import { expect } from 'chai';
import { spec } from 'modules/rtbsolutionsBidAdapter.js';

describe('rtbsolutionsBidAdapterTests', function () {
  it('validate_pub_params_1', function () {
    expect(spec.isBidRequestValid({
      bidder: 'rtbsolutions',
      params: {
        blockId: 777
      }
    })).to.equal(true);
  });
  it('validate_pub_params_2', function () {
    expect(spec.isBidRequestValid({
      bidder: 'rtbsolutions',
      params: {
        s1: 'test'
      }
    })).to.equal(false);
  });
  it('validate_generated_params', function () {
    let bidderRequest = {
      bids: [],
      refererInfo: {
        referer: ''
      }
    };
    bidderRequest.bids.push({
      bidId: 'bid1234',
      bidder: 'rtbsolutions',
      params: {blockId: 777},
      sizes: [[240, 400]]
    });
    let request = spec.buildRequests(true, bidderRequest);
    let req_data = request.data[0];
    expect(req_data.bid_id).to.equal('bid1234');
  });
  it('validate_response_params', function () {
    let serverResponse = {
      body: [{
        ad: 'Ad html',
        bid_id: 'bid1234',
        cpm: 1,
        creative_id: 1,
        height: 480,
        nurl: 'http://test.test',
        width: 640,
        currency: 'USD',
      }]
    };
    let bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.cpm).to.equal(1);
    expect(bid.currency).to.equal('USD');
    expect(bid.width).to.equal(640);
    expect(bid.height).to.equal(480);
    expect(bid.netRevenue).to.equal(true);
    expect(bid.requestId).to.equal('bid1234');
    expect(bid.ad).to.equal('Ad html');
  });
});
