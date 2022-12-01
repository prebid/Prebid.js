import * as auctionUserDetails from 'modules/auctionUserDetails/index.js';
import * as sinon from 'sinon';
import {expect, spy} from 'chai';

describe('floor additional data points', function () {
  let sandbox;
  let frequencyDepth = {
    pageView: 1,
    slotCnt: 2,
    bidServed: 4,
    impressionServed: 1,
    slotLevelFrquencyDepth: {

    },
    timestamp: {
      date: new Date().getDate(),
      hours: new Date().getHours()
    }
  }

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    sandbox.stub(auctionUserDetails, 'auctionInitHandler').returns(frequencyDepth);
    sandbox.stub(auctionUserDetails, 'auctionEndHandler').returns(frequencyDepth);
    sandbox.stub(auctionUserDetails, 'auctionBidResponseHandler').returns(frequencyDepth);
    sandbox.stub(auctionUserDetails, 'auctionBidWonHandler').returns(frequencyDepth);
    done();
  });

  afterEach(function (done) {
    sandbox.restore();
    done();
  });

  it('should call auctionInit handler and return storage object', function() {
    const response = auctionUserDetails.auctionInitHandler();
    expect(response).to.equal(frequencyDepth);
    expect(response.pageView).to.equal(1);
    expect(response.slotCnt).to.equal(2);
    expect(response.bidServed).to.equal(4);
    expect(response.impressionServed).to.equal(1);
  })

  it('should call auctionEnd handler and return storage object', function() {
    const response = auctionUserDetails.auctionEndHandler();
    expect(response).to.equal(frequencyDepth);
  })

  it('should call auctionBid handler and return storage object', function() {
    const response = auctionUserDetails.auctionBidResponseHandler();
    frequencyDepth.slotLevelFrquencyDepth = {'/43743431/DMDemo': {
      bidServed: 1
    }}
  	expect(response).to.equal(frequencyDepth);
    expect(response.bidServed).to.equal(4);
    expect(response.slotLevelFrquencyDepth['/43743431/DMDemo'].bidServed).to.equal(1);
  })

  it('should call auctionBidWon handler and return storage object', function() {
    const response = auctionUserDetails.auctionBidWonHandler();
  	expect(response).to.equal(frequencyDepth);
    expect(response.impressionServed).to.equal(1);
  })
})
