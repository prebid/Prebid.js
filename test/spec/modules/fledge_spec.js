import {
  expect
} from 'chai';
import * as fledge from 'modules/fledgeForGpt.js';

const CODE = 'sampleBidder';
const AD_UNIT_CODE = 'mock/placement';

describe('fledgeForGpt module', function() {
  let nextFnSpy;
  fledge.init({enabled: true})

  const bidRequest = {
    adUnitCode: AD_UNIT_CODE,
    bids: [{
      bidId: '1',
      bidder: CODE,
      auctionId: 'first-bid-id',
      adUnitCode: AD_UNIT_CODE,
      transactionId: 'au',
    }]
  };
  const fledgeAuctionConfig = {
    bidId: '1',
  }

  describe('addComponentAuctionHook', function() {
    beforeEach(function() {
      nextFnSpy = sinon.spy();
    });

    it('should call next() when a proper bidrequest and fledgeAuctionConfig are provided', function() {
      fledge.addComponentAuctionHook(nextFnSpy, bidRequest, fledgeAuctionConfig);
      expect(nextFnSpy.called).to.be.true;
    });
  });
});
