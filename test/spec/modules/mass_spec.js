import { expect } from 'chai';
import {
  init,
  addBidResponseHook,
  addListenerOnce,
  getRenderPayload,
  render,
  listenerAdded,
  massEnabled
} from 'modules/mass';
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

  it('should be enabled by default', function() {
    expect(massEnabled).to.equal(true);
  });

  it('can be disabled', function() {
    init({enabled: false});
    expect(massEnabled).to.equal(false);
  });

  it('should only affect MASS bids', function() {
    init({renderUrl: 'http://...'});
    mockedNonMassBids.forEach(function(mockedBid) {
      const originalBid = Object.assign({}, mockedBid);
      const bid = Object.assign({}, originalBid);

      bidderRequest.bids = [bid];

      addBidResponseHook.call({bidderRequest}, noop, 'ad-code-id', bid);

      expect(bid).to.deep.equal(originalBid);
    });
  });

  it('should only update the ad markup field', function() {
    init({renderUrl: 'http://...'});
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

  it('should add a message listener', function() {
    addListenerOnce();
    expect(listenerAdded).to.equal(true);
  });

  it('should get correct bid in render payload', function() {
    const payload = getRenderPayload({data: {massBidId: 'mass-bid-1'}});
    expect(payload.type).to.equal('prebid');
    expect(payload.bid.bidId).to.equal('mass-bid-1');
  });

  it('should load the bootloader on rendering', function() {
    render({});
    expect(window.mass).to.be.an('object');
    expect(window.mass.bootloader.loaded).to.equal(true);
  });
});
