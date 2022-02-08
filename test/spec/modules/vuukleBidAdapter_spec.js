import { expect } from 'chai';
import { spec } from 'modules/vuukleBidAdapter.js';

describe('vuukleBidAdapterTests', function() {
  let bidRequestData = {
    bids: [
      {
        bidId: 'testbid',
        bidder: 'vuukle',
        params: {
          test: 1
        },
        sizes: [[300, 250]]
      }
    ]
  };
  let request = [];

  it('validate_pub_params', function() {
    expect(
      spec.isBidRequestValid({
        bidder: 'vuukle',
        params: {
          test: 1
        }
      })
    ).to.equal(true);
  });

  it('validate_generated_params', function() {
    request = spec.buildRequests(bidRequestData.bids);
    let req_data = request[0].data;

    expect(req_data.bidId).to.equal('testbid');
  });

  it('validate_response_params', function() {
    let serverResponse = {
      body: {
        'cpm': 0.01,
        'width': 300,
        'height': 250,
        'creative_id': '12345',
        'ad': 'test ad',
        'adomain': ['example.com']
      }
    };

    request = spec.buildRequests(bidRequestData.bids);
    let bids = spec.interpretResponse(serverResponse, request[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];
    expect(bid.ad).to.equal('test ad');
    expect(bid.cpm).to.equal(0.01);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.creativeId).to.equal('12345');
    expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
  });
});
