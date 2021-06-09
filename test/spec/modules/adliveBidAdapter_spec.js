import { expect } from 'chai';
import { spec } from 'modules/adliveBidAdapter.js';

describe('adliveBidAdapterTests', function() {
  let bidRequestData = {
    bids: [
      {
        bidId: 'transaction_1234',
        bidder: 'adlive',
        params: {
          hashes: ['1e100887dd614b0909bf6c49ba7f69fdd1360437']
        },
        sizes: [[300, 250]]
      }
    ]
  };
  let request = [];

  it('validate_pub_params', function() {
    expect(
      spec.isBidRequestValid({
        bidder: 'adlive',
        params: {
          hashes: ['1e100887dd614b0909bf6c49ba7f69fdd1360437']
        }
      })
    ).to.equal(true);
  });

  it('validate_generated_params', function() {
    request = spec.buildRequests(bidRequestData.bids);
    let req_data = JSON.parse(request[0].data);

    expect(req_data.transaction_id).to.equal('transaction_1234');
  });

  it('validate_response_params', function() {
    let serverResponse = {
      body: [
        {
          hash: '1e100887dd614b0909bf6c49ba7f69fdd1360437',
          content: 'Ad html',
          price: 1.12,
          size: [300, 250],
          is_passback: 0
        }
      ]
    };

    let bids = spec.interpretResponse(serverResponse, bidRequestData.bids[0]);
    expect(bids).to.have.lengthOf(1);

    let bid = bids[0];

    expect(bid.creativeId).to.equal('1e100887dd614b0909bf6c49ba7f69fdd1360437');
    expect(bid.ad).to.equal('Ad html');
    expect(bid.cpm).to.equal(1.12);
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });

  it('validate_response_params_with passback', function() {
    let serverResponse = {
      body: [
        {
          hash: '1e100887dd614b0909bf6c49ba7f69fdd1360437',
          content: 'Ad html passback',
          size: [300, 250],
          is_passback: 1
        }
      ]
    };
    let bids = spec.interpretResponse(serverResponse, bidRequestData.bids[0]);

    expect(bids).to.have.lengthOf(0);
  });
});
