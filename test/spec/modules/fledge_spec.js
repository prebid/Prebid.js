import {
  expect
} from 'chai';
import * as fledge from 'modules/fledge.js';
import {
  config
} from 'src/config.js';
import {
  auctionManager
} from '../../../src/auctionManager.js';
import * as utils from 'src/utils.js';

const CODE = 'sampleBidder';
const AD_UNIT_CODE = 'mock/placement';

describe('fledge module', function() {
  let nextFnSpy;

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

  describe('renderAdHook', function() {
    const origRunAdAuction = navigator?.runAdAuction;
    let runAdAuctionThenStub;
    let findBidByAdIdStub;

    beforeEach(function() {
      // navigator.runAdAuction doesn't exist, so we can't stub it normally with
      // sinon.stub(navigator, 'runAdAuction') or something
      navigator.runAdAuction = sinon.stub();
      runAdAuctionThenStub = sinon.stub();

      // this is to get runAdAuction to run synchronously
      navigator.runAdAuction.returns({
        then: runAdAuctionThenStub,
      })
      nextFnSpy = sinon.spy();
      findBidByAdIdStub = sinon.stub(auctionManager, 'findBidByAdId');
      findBidByAdIdStub.returns(bidRequest.bids[0])
    });

    after(function() {
      navigator.runAdAuction = origRunAdAuction;
    })

    afterEach(function() {
      config.resetConfig();
      findBidByAdIdStub.restore();
      fledge.clearComponentAuctions();
    });

    it('should call next() when there is no doc/id', function() {
      fledge.renderAdHook(nextFnSpy, undefined, undefined);
      expect(nextFnSpy.called).to.be.true;
    });

    it('should run fledge auction when there is a valid doc/id and a component auction config has been added', function() {
      fledge.addComponentAuctionHook(nextFnSpy, bidRequest, fledgeAuctionConfig);
      fledge.renderAdHook(nextFnSpy, sinon.stub(), sinon.stub());
      expect(runAdAuctionThenStub.called).to.be.true;
    });

    it('should not run fledge auction when there are no component auctions added', function() {
      fledge.renderAdHook(nextFnSpy, sinon.stub(), sinon.stub());
      expect(runAdAuctionThenStub.called).to.be.false;
      expect(nextFnSpy.called).to.be.true;
    });
  });

  describe('renderFledgeAd', function() {
    let createInvisibleIframeStub;
    let insertElementStub;

    beforeEach(function() {
      createInvisibleIframeStub = sinon.stub(utils, 'createInvisibleIframe');
      insertElementStub = sinon.stub(utils, 'insertElement');
    });

    afterEach(function() {
      createInvisibleIframeStub.restore();
      insertElementStub.restore();
    });

    it('it should set the fledge ad uri in the iframe', function() {
      const iframeStub = sinon.stub();
      iframeStub.style = {};
      createInvisibleIframeStub.returns(iframeStub);
      const fledgeAdUri = 'testuri';

      fledge.renderFledgeAd(bidRequest.bids[0], sinon.stub(), fledgeAdUri);
      expect(insertElementStub.called).to.equal(true);
      expect(iframeStub.src).to.equal(fledgeAdUri);
    });
  });
});
