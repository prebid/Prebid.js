import { expect } from 'chai';
import { targeting as targetingInstance, filters, sortByDealAndPriceBucket } from 'src/targeting';
import { config } from 'src/config';
import { getAdUnits, createBidReceived } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import { auctionManager } from 'src/auctionManager';
import * as utils from 'src/utils';

const bid1 = {
  'bidderCode': 'rubicon',
  'width': '300',
  'height': '250',
  'statusMessage': 'Bid available',
  'adId': '148018fe5e',
  'cpm': 0.537234,
  'ad': 'markup',
  'ad_id': '3163950',
  'sizeId': '15',
  'requestTimestamp': 1454535718610,
  'responseTimestamp': 1454535724863,
  'timeToRespond': 123,
  'pbLg': '0.50',
  'pbMg': '0.50',
  'pbHg': '0.53',
  'adUnitCode': '/123456/header-bid-tag-0',
  'bidder': 'rubicon',
  'size': '300x250',
  'adserverTargeting': {
    'foobar': '300x250',
    [CONSTANTS.TARGETING_KEYS.BIDDER]: 'rubicon',
    [CONSTANTS.TARGETING_KEYS.AD_ID]: '148018fe5e',
    [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '0.53',
    [CONSTANTS.TARGETING_KEYS.DEAL]: '1234'
  },
  'netRevenue': true,
  'currency': 'USD',
  'ttl': 300
};

const bid2 = {
  'bidderCode': 'rubicon',
  'width': '300',
  'height': '250',
  'statusMessage': 'Bid available',
  'adId': '5454545',
  'cpm': 0.25,
  'ad': 'markup',
  'ad_id': '3163950',
  'sizeId': '15',
  'requestTimestamp': 1454535718610,
  'responseTimestamp': 1454535724863,
  'timeToRespond': 123,
  'pbLg': '0.25',
  'pbMg': '0.25',
  'pbHg': '0.25',
  'adUnitCode': '/123456/header-bid-tag-0',
  'bidder': 'rubicon',
  'size': '300x250',
  'adserverTargeting': {
    'foobar': '300x250',
    [CONSTANTS.TARGETING_KEYS.BIDDER]: 'rubicon',
    [CONSTANTS.TARGETING_KEYS.AD_ID]: '5454545',
    [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '0.25'
  },
  'netRevenue': true,
  'currency': 'USD',
  'ttl': 300
};

const bid3 = {
  'bidderCode': 'rubicon',
  'width': '300',
  'height': '600',
  'statusMessage': 'Bid available',
  'adId': '48747745',
  'cpm': 0.75,
  'ad': 'markup',
  'ad_id': '3163950',
  'sizeId': '15',
  'requestTimestamp': 1454535718610,
  'responseTimestamp': 1454535724863,
  'timeToRespond': 123,
  'pbLg': '0.75',
  'pbMg': '0.75',
  'pbHg': '0.75',
  'adUnitCode': '/123456/header-bid-tag-1',
  'bidder': 'rubicon',
  'size': '300x600',
  'adserverTargeting': {
    'foobar': '300x600',
    [CONSTANTS.TARGETING_KEYS.BIDDER]: 'rubicon',
    [CONSTANTS.TARGETING_KEYS.AD_ID]: '48747745',
    [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '0.75'
  },
  'netRevenue': true,
  'currency': 'USD',
  'ttl': 300
};

describe('targeting tests', function () {
  let sandbox;
  let enableSendAllBids = false;
  let useBidCache;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    useBidCache = true;
    // enableSendAllBids = false;

    let origGetConfig = config.getConfig;
    sandbox.stub(config, 'getConfig').callsFake(function (key) {
      if (key === 'enableSendAllBids') {
        return enableSendAllBids;
      }
      if (key === 'useBidCache') {
        return useBidCache;
      }
      return origGetConfig.apply(config, arguments);
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('getAllTargeting', function () {
    let amBidsReceivedStub;
    let amGetAdUnitsStub;
    let bidExpiryStub;
    let logWarnStub;
    let logErrorStub;
    let bidsReceived;

    beforeEach(function () {
      bidsReceived = [bid1, bid2, bid3];

      amBidsReceivedStub = sandbox.stub(auctionManager, 'getBidsReceived').callsFake(function() {
        return bidsReceived;
      });
      amGetAdUnitsStub = sandbox.stub(auctionManager, 'getAdUnitCodes').callsFake(function() {
        return ['/123456/header-bid-tag-0'];
      });
      bidExpiryStub = sandbox.stub(filters, 'isBidNotExpired').returns(true);
      logWarnStub = sinon.stub(utils, 'logWarn');
      logErrorStub = sinon.stub(utils, 'logError');
    });

    afterEach(function() {
      config.resetConfig();
      logWarnStub.restore();
      logErrorStub.restore();
    });

    describe('when hb_deal is present in bid.adserverTargeting', function () {
      let bid4;

      beforeEach(function() {
        bid4 = utils.deepClone(bid1);
        bid4.adserverTargeting['hb_bidder'] = bid4.bidder = bid4.bidderCode = 'appnexus';
        bid4.cpm = 0;
        enableSendAllBids = true;

        bidsReceived.push(bid4);
      });

      it('returns targeting with both hb_deal and hb_deal_{bidder_code}', function () {
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // We should add both keys rather than one or the other
        expect(targeting['/123456/header-bid-tag-0']).to.contain.keys('hb_deal', `hb_deal_${bid1.bidderCode}`, `hb_deal_${bid4.bidderCode}`);

        // We should assign both keys the same value
        expect(targeting['/123456/header-bid-tag-0']['hb_deal']).to.deep.equal(targeting['/123456/header-bid-tag-0'][`hb_deal_${bid1.bidderCode}`]);
      });
    });

    it('will enforce a limit on the number of auction keys when auctionKeyMaxChars setting is active', function () {
      config.setConfig({
        targetingControls: {
          auctionKeyMaxChars: 150
        }
      });

      const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0', '/123456/header-bid-tag-1']);
      expect(targeting['/123456/header-bid-tag-1']).to.deep.equal({});
      expect(targeting['/123456/header-bid-tag-0']).to.contain.keys('hb_pb', 'hb_adid', 'hb_bidder', 'hb_deal');
      expect(targeting['/123456/header-bid-tag-0']['hb_adid']).to.equal(bid1.adId);
      expect(logWarnStub.calledOnce).to.be.true;
    });

    it('will return an error when auctionKeyMaxChars setting is set too low for any auction keys to be allowed', function () {
      config.setConfig({
        targetingControls: {
          auctionKeyMaxChars: 50
        }
      });

      const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0', '/123456/header-bid-tag-1']);
      expect(targeting['/123456/header-bid-tag-1']).to.deep.equal({});
      expect(targeting['/123456/header-bid-tag-0']).to.deep.equal({});
      expect(logWarnStub.calledTwice).to.be.true;
      expect(logErrorStub.calledOnce).to.be.true;
    });

    it('selects the top bid when enableSendAllBids true', function () {
      enableSendAllBids = true;
      let targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

      // we should only get the targeting data for the one requested adunit
      expect(Object.keys(targeting).length).to.equal(1);

      let sendAllBidCpm = Object.keys(targeting['/123456/header-bid-tag-0']).filter(key => key.indexOf(CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_') != -1)
      // we shouldn't get more than 1 key for hb_pb_${bidder}
      expect(sendAllBidCpm.length).to.equal(1);

      // expect the winning CPM to be equal to the sendAllBidCPM
      expect(targeting['/123456/header-bid-tag-0'][CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_rubicon']).to.deep.equal(targeting['/123456/header-bid-tag-0'][CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]);
    });

    it('does not include adpod type bids in the getBidsReceived results', function () {
      let adpodBid = utils.deepClone(bid1);
      adpodBid.video = { context: 'adpod', durationSeconds: 15, durationBucket: 15 };
      adpodBid.cpm = 5;
      bidsReceived.push(adpodBid);

      const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
      expect(targeting['/123456/header-bid-tag-0']).to.contain.keys('hb_deal', 'hb_adid', 'hb_bidder');
      expect(targeting['/123456/header-bid-tag-0']['hb_adid']).to.equal(bid1.adId);
    });
  }); // end getAllTargeting tests

  describe('getAllTargeting without bids return empty object', function () {
    let amBidsReceivedStub;
    let amGetAdUnitsStub;
    let bidExpiryStub;

    beforeEach(function () {
      amBidsReceivedStub = sandbox.stub(auctionManager, 'getBidsReceived').callsFake(function() {
        return [];
      });
      amGetAdUnitsStub = sandbox.stub(auctionManager, 'getAdUnitCodes').callsFake(function() {
        return ['/123456/header-bid-tag-0'];
      });
      bidExpiryStub = sandbox.stub(filters, 'isBidNotExpired').returns(true);
    });

    it('returns targetingSet correctly', function () {
      let targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

      // we should only get the targeting data for the one requested adunit to at least exist even though it has no keys to set
      expect(Object.keys(targeting).length).to.equal(1);
    });
  }); // end getAllTargeting without bids return empty object

  describe('Targeting in concurrent auctions', function () {
    describe('check getOldestBid', function () {
      let bidExpiryStub;
      let auctionManagerStub;
      beforeEach(function () {
        bidExpiryStub = sandbox.stub(filters, 'isBidNotExpired').returns(true);
        auctionManagerStub = sandbox.stub(auctionManager, 'getBidsReceived');
      });

      it('should use bids from pool to get Winning Bid', function () {
        let bidsReceived = [
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1'}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-1', adId: 'adid-2'}),
          createBidReceived({bidder: 'appnexus', cpm: 6, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3'}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-1', adId: 'adid-4'}),
        ];
        let adUnitCodes = ['code-0', 'code-1'];

        let bids = targetingInstance.getWinningBids(adUnitCodes, bidsReceived);

        expect(bids.length).to.equal(2);
        expect(bids[0].adId).to.equal('adid-1');
        expect(bids[1].adId).to.equal('adid-2');
      });

      it('should honor useBidCache', function() {
        useBidCache = true;

        auctionManagerStub.returns([
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1'}),
          createBidReceived({bidder: 'appnexus', cpm: 5, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-2'}),
        ]);

        let adUnitCodes = ['code-0'];
        targetingInstance.setLatestAuctionForAdUnit('code-0', 2);

        let bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(1);
        expect(bids[0].adId).to.equal('adid-1');

        useBidCache = false;

        bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(1);
        expect(bids[0].adId).to.equal('adid-2');
      });

      it('should not use rendered bid to get winning bid', function () {
        let bidsReceived = [
          createBidReceived({bidder: 'appnexus', cpm: 8, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1', status: 'rendered'}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-1', adId: 'adid-2'}),
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3'}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-1', adId: 'adid-4'}),
        ];
        auctionManagerStub.returns(bidsReceived);

        let adUnitCodes = ['code-0', 'code-1'];
        let bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(2);
        expect(bids[0].adId).to.equal('adid-2');
        expect(bids[1].adId).to.equal('adid-3');
      });

      it('should use highest cpm bid from bid pool to get winning bid', function () {
        // Pool is having 4 bids from 2 auctions. There are 2 bids from rubicon, #2 which is highest cpm bid will be selected to take part in auction.
        let bidsReceived = [
          createBidReceived({bidder: 'appnexus', cpm: 8, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1'}),
          createBidReceived({bidder: 'rubicon', cpm: 9, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-0', adId: 'adid-2'}),
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3'}),
          createBidReceived({bidder: 'rubicon', cpm: 8, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-0', adId: 'adid-4'}),
        ];
        auctionManagerStub.returns(bidsReceived);

        let adUnitCodes = ['code-0'];
        let bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(1);
        expect(bids[0].adId).to.equal('adid-2');
      });
    });

    describe('check bidExpiry', function () {
      let auctionManagerStub;
      let timestampStub;
      beforeEach(function () {
        auctionManagerStub = sandbox.stub(auctionManager, 'getBidsReceived');
        timestampStub = sandbox.stub(utils, 'timestamp');
      });

      it('should not include expired bids in the auction', function () {
        timestampStub.returns(200000);
        // Pool is having 4 bids from 2 auctions. All the bids are expired and only bid #3 is passing the bidExpiry check.
        let bidsReceived = [
          createBidReceived({bidder: 'appnexus', cpm: 18, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1', ttl: 150}),
          createBidReceived({bidder: 'sampleBidder', cpm: 16, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-0', adId: 'adid-2', ttl: 100}),
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3', ttl: 300}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-0', adId: 'adid-4', ttl: 50}),
        ];
        auctionManagerStub.returns(bidsReceived);

        let adUnitCodes = ['code-0', 'code-1'];
        let bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(1);
        expect(bids[0].adId).to.equal('adid-3');
      });
    });
  });

  describe('sortByDealAndPriceBucket', function() {
    it('will properly sort bids when some bids have deals and some do not', function () {
      let bids = [{
        adUnitTargeting: {
          hb_adid: 'abc',
          hb_pb: '1.00',
          hb_deal: '1234'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'def',
          hb_pb: '0.50',
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'ghi',
          hb_pb: '20.00',
          hb_deal: '4532'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'jkl',
          hb_pb: '9.00',
          hb_deal: '9864'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'mno',
          hb_pb: '50.00',
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'pqr',
          hb_pb: '100.00',
        }
      }];
      bids.sort(sortByDealAndPriceBucket);
      expect(bids[0].adUnitTargeting.hb_adid).to.equal('ghi');
      expect(bids[1].adUnitTargeting.hb_adid).to.equal('jkl');
      expect(bids[2].adUnitTargeting.hb_adid).to.equal('abc');
      expect(bids[3].adUnitTargeting.hb_adid).to.equal('pqr');
      expect(bids[4].adUnitTargeting.hb_adid).to.equal('mno');
      expect(bids[5].adUnitTargeting.hb_adid).to.equal('def');
    });

    it('will properly sort bids when all bids have deals', function () {
      let bids = [{
        adUnitTargeting: {
          hb_adid: 'abc',
          hb_pb: '1.00',
          hb_deal: '1234'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'def',
          hb_pb: '0.50',
          hb_deal: '4321'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'ghi',
          hb_pb: '2.50',
          hb_deal: '4532'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'jkl',
          hb_pb: '2.00',
          hb_deal: '9864'
        }
      }];
      bids.sort(sortByDealAndPriceBucket);
      expect(bids[0].adUnitTargeting.hb_adid).to.equal('ghi');
      expect(bids[1].adUnitTargeting.hb_adid).to.equal('jkl');
      expect(bids[2].adUnitTargeting.hb_adid).to.equal('abc');
      expect(bids[3].adUnitTargeting.hb_adid).to.equal('def');
    });

    it('will properly sort bids when no bids have deals', function () {
      let bids = [{
        adUnitTargeting: {
          hb_adid: 'abc',
          hb_pb: '1.00'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'def',
          hb_pb: '0.10'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'ghi',
          hb_pb: '10.00'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'jkl',
          hb_pb: '10.01'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'mno',
          hb_pb: '1.00'
        }
      }, {
        adUnitTargeting: {
          hb_adid: 'pqr',
          hb_pb: '100.00'
        }
      }];
      bids.sort(sortByDealAndPriceBucket);
      expect(bids[0].adUnitTargeting.hb_adid).to.equal('pqr');
      expect(bids[1].adUnitTargeting.hb_adid).to.equal('jkl');
      expect(bids[2].adUnitTargeting.hb_adid).to.equal('ghi');
      expect(bids[3].adUnitTargeting.hb_adid).to.equal('abc');
      expect(bids[4].adUnitTargeting.hb_adid).to.equal('mno');
      expect(bids[5].adUnitTargeting.hb_adid).to.equal('def');
    });
  });

  describe('setTargetingForAst', function () {
    let sandbox,
      apnTagStub;
    beforeEach(function() {
      sandbox = sinon.createSandbox();
      sandbox.stub(targetingInstance, 'resetPresetTargetingAST');
      apnTagStub = sandbox.stub(window.apntag, 'setKeywords');
    });
    afterEach(function () {
      sandbox.restore();
    });

    it('should set single addUnit code', function() {
      let adUnitCode = 'testdiv-abc-ad-123456-0';
      sandbox.stub(targetingInstance, 'getAllTargeting').returns({
        'testdiv1-abc-ad-123456-0': {hb_bidder: 'appnexus'}
      });
      targetingInstance.setTargetingForAst(adUnitCode);
      expect(targetingInstance.getAllTargeting.called).to.equal(true);
      expect(targetingInstance.resetPresetTargetingAST.called).to.equal(true);
      expect(apnTagStub.callCount).to.equal(1);
      expect(apnTagStub.getCall(0).args[0]).to.deep.equal('testdiv1-abc-ad-123456-0');
      expect(apnTagStub.getCall(0).args[1]).to.deep.equal({HB_BIDDER: 'appnexus'});
    });

    it('should set array of addUnit codes', function() {
      let adUnitCodes = ['testdiv1-abc-ad-123456-0', 'testdiv2-abc-ad-123456-0']
      sandbox.stub(targetingInstance, 'getAllTargeting').returns({
        'testdiv1-abc-ad-123456-0': {hb_bidder: 'appnexus'},
        'testdiv2-abc-ad-123456-0': {hb_bidder: 'appnexus'}
      });
      targetingInstance.setTargetingForAst(adUnitCodes);
      expect(targetingInstance.getAllTargeting.called).to.equal(true);
      expect(targetingInstance.resetPresetTargetingAST.called).to.equal(true);
      expect(apnTagStub.callCount).to.equal(2);
      expect(apnTagStub.getCall(1).args[0]).to.deep.equal('testdiv2-abc-ad-123456-0');
      expect(apnTagStub.getCall(1).args[1]).to.deep.equal({HB_BIDDER: 'appnexus'});
    });
  });
});
