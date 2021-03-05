import { expect } from 'chai';
import { addBidResponseHook } from 'modules/mass';
import { logInfo } from 'src/utils.js';

// mock a MASS bid:
const mockedMassBids = [
  {
    bidder: 'ix',
    bidId: 'mass-bid-1',
    requestId: 'mass-bid-1',
    bidderRequestId: 'bidder-request-id-1',
    dealId: 'MASS1234',
    ad: 'mass://provider/product/etc...',
    meta: {}
  },
  {
    bidder: 'ix',
    bidId: 'mass-bid-2',
    requestId: 'mass-bid-2',
    bidderRequestId: 'bidder-request-id-1',
    dealId: '1234',
    ad: 'mass://provider/product/etc...',
    meta: {
      mass: true
    }
  },
];

// mock non-MASS bids:
const mockedNonMassBids = [
  {
    bidder: 'ix',
    bidId: 'non-mass-bid-1',
    requstId: 'non-mass-bid-1',
    bidderRequestId: 'bidder-request-id-1',
    dealId: 'MASS1234',
    ad: '<creative />',
    meta: {
      mass: true
    }
  },
  {
    bidder: 'ix',
    bidId: 'non-mass-bid-2',
    requestId: 'non-mass-bid-2',
    bidderRequestId: 'bidder-request-id-1',
    dealId: '1234',
    ad: 'mass://provider/product/etc...',
    meta: {}
  },
];

// mock bidder request:
const mockedBidderRequest = {
  bidderCode: 'ix',
  bidderRequestId: 'bidder-request-id-1'
};

const noop = function() {};

describe('MASS Module', function() {
  let bidderRequest = Object.assign({}, mockedBidderRequest);

  it('should only affect MASS bids', function() {
    mockedNonMassBids.forEach(function(mockedBid) {
      const originalBid = Object.assign({}, mockedBid);
      const bid = Object.assign({}, originalBid);

      bidderRequest.bids = [bid];

      addBidResponseHook.call({bidderRequest}, noop, 'ad-code-id', bid);

      expect(bid).to.deep.equal(originalBid);
    });
  });

  it('should only update the ad markup field', function() {
    mockedMassBids.forEach(function(mockedBid) {
      const originalBid = Object.assign({}, mockedBid);
      const bid = Object.assign({}, originalBid);

      bidderRequest.bids = [bid];

      addBidResponseHook.call({bidderRequest}, noop, 'ad-code-id', bid);

      expect(bid.ad).to.not.equal(originalBid.ad);

      delete bid.ad;
      delete originalBid.ad;

      expect(bid).to.deep.equal(originalBid);
    });
  });
});
