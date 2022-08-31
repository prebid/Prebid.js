import {
  expect
} from 'chai';
import { init } from 'gulp-sourcemaps';
import * as fledge from 'modules/fledgeForGpt.js';

const CODE = 'sampleBidder';
const AD_UNIT_CODE = 'mock/placement';

describe('fledgeForGpt module', function() {
  let nextFnSpy;
  init({enabled: true})

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

    afterEach(function() {
      fledge.clearComponentAuctions();
    })

    it('should call next() when a proper bidrequest and fledgeAuctionConfig are provided', function() {
      fledge.addComponentAuctionHook(nextFnSpy, bidRequest, fledgeAuctionConfig);
      expect(nextFnSpy.called).to.be.true;
    });

    it('should be able to retrieve fledgeAuctionConfig that was added', function() {
      fledge.addComponentAuctionHook(nextFnSpy, bidRequest, fledgeAuctionConfig);

      // TODO: Take randomness into account
      const auctionConfig = fledge.getAuctionConfig(bidRequest.bids[0]);
      expect(auctionConfig.bidId).to.equal(bidRequest.bids[0].bidId);
    });

    it('should not call next() when there either the bidrequest or fledgeAuctionConfig is undefined', function() {
      fledge.addComponentAuctionHook(nextFnSpy, undefined, undefined);
      fledge.addComponentAuctionHook(nextFnSpy, bidRequest, undefined);
      fledge.addComponentAuctionHook(nextFnSpy, undefined, fledgeAuctionConfig);
      expect(nextFnSpy.called).to.not.be.true;
    });
  });
});
