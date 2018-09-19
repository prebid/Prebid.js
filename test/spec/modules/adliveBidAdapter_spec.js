import { expect } from 'chai';
import { spec } from 'modules/adliveBidAdapter';

let bidRequestData = [{
  bidId: 'transaction_1234',
  bidder: 'adlive',
  params: {
    hashes: ['1e100887dd614b0909bf6c49ba7f69fdd1360437']},
  sizes: [[300, 250]]
}]

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
    let request = spec.buildRequests(bidRequestData);
    let req_data = request[0];
    req_data.data = JSON.parse(req_data.data)
    expect(req_data.data.transaction_id).to.equal('transaction_1234');
  });
  it('validate_response_params', function () {
    let serverResponse = {
      body: [{
        hash: '1e100887dd614b0909bf6c49ba7f69fdd1360437',
        content: 'Ad html',
        price: 1.12,
        size: [300, 250],
        is_passback: 0
      }]
    };
    let bids = spec.interpretResponse(serverResponse, bidRequestData[0]);
    console.log(bids)
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.hash).to.equal('1e100887dd614b0909bf6c49ba7f69fdd1360437');
    expect(bid.content).to.equal('Ad html');
    expect(bid.price).to.equal(1.12);
    expect(bid.size).to.equal([300, 250]);
    expect(bid.is_passback).to.equal(0);
  });
  it('validate_response_params_with passback', function () {
    let serverResponse = {
      body: [{
        hash: '1e100887dd614b0909bf6c49ba7f69fdd1360437',
        content: 'Ad html passback',
        size: [300, 250],
        is_passback: 1
      }]
    };
    let bids = spec.interpretResponse(serverResponse);
    expect(bids).to.have.lengthOf(1);
    let bid = bids[0];
    expect(bid.hash).to.equal('1e100887dd614b0909bf6c49ba7f69fdd1360437');
    expect(bid.content).to.equal('Ad html');
    expect(bid.size).to.equal([300, 250]);
    expect(bid.is_passback).to.equal(0);
  });
});
