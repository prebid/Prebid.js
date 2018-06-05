import { expect } from 'chai';
import { targeting as targetingInstance } from 'src/targeting';
import { config } from 'src/config';
import { getAdUnits, createBidReceived } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import { auctionManager } from 'src/auctionManager';
import * as targetingModule from 'src/targeting';
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
    'hb_bidder': 'rubicon',
    'hb_adid': '148018fe5e',
    'hb_pb': '0.53',
    'foobar': '300x250'
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
    'hb_bidder': 'rubicon',
    'hb_adid': '5454545',
    'hb_pb': '0.25',
    'foobar': '300x250'
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
    'hb_bidder': 'rubicon',
    'hb_adid': '48747745',
    'hb_pb': '0.75',
    'foobar': '300x600'
  },
  'netRevenue': true,
  'currency': 'USD',
  'ttl': 300
};

describe('targeting tests', () => {
  describe('getAllTargeting', () => {
    let amBidsReceivedStub;
    let amGetAdUnitsStub;
    let bidExpiryStub;

    beforeEach(() => {
      $$PREBID_GLOBAL$$._sendAllBids = false;
      amBidsReceivedStub = sinon.stub(auctionManager, 'getBidsReceived').callsFake(function() {
        return [bid1, bid2, bid3];
      });
      amGetAdUnitsStub = sinon.stub(auctionManager, 'getAdUnitCodes').callsFake(function() {
        return ['/123456/header-bid-tag-0'];
      });
      bidExpiryStub = sinon.stub(targetingModule, 'isBidExpired').returns(true);
    });

    afterEach(() => {
      auctionManager.getBidsReceived.restore();
      auctionManager.getAdUnitCodes.restore();
      targetingModule.isBidExpired.restore();
    });

    it('selects the top bid when _sendAllBids true', () => {
      config.setConfig({ enableSendAllBids: true });
      let targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

      // we should only get the targeting data for the one requested adunit
      expect(Object.keys(targeting).length).to.equal(1);

      let sendAllBidCpm = Object.keys(targeting['/123456/header-bid-tag-0']).filter(key => key.indexOf('hb_pb_') != -1)
      // we shouldn't get more than 1 key for hb_pb_${bidder}
      expect(sendAllBidCpm.length).to.equal(1);

      // expect the winning CPM to be equal to the sendAllBidCPM
      expect(targeting['/123456/header-bid-tag-0']['hb_pb_rubicon']).to.deep.equal(targeting['/123456/header-bid-tag-0']['hb_pb']);
    });
  }); // end getAllTargeting tests

  describe('getAllTargeting without bids return empty object', () => {
    let amBidsReceivedStub;
    let amGetAdUnitsStub;
    let bidExpiryStub;

    beforeEach(() => {
      $$PREBID_GLOBAL$$._sendAllBids = false;
      amBidsReceivedStub = sinon.stub(auctionManager, 'getBidsReceived').callsFake(function() {
        return [];
      });
      amGetAdUnitsStub = sinon.stub(auctionManager, 'getAdUnitCodes').callsFake(function() {
        return ['/123456/header-bid-tag-0'];
      });
      bidExpiryStub = sinon.stub(targetingModule, 'isBidExpired').returns(true);
    });

    afterEach(() => {
      auctionManager.getBidsReceived.restore();
      auctionManager.getAdUnitCodes.restore();
      targetingModule.isBidExpired.restore();
    });

    it('returns targetingSet correctly', () => {
      let targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

      // we should only get the targeting data for the one requested adunit to at least exist even though it has no keys to set
      expect(Object.keys(targeting).length).to.equal(1);
    });
  }); // end getAllTargeting without bids return empty object

  describe('Targeting in concurrent auctions', () => {
    describe('check getOldestBid', () => {
      let bidExpiryStub;
      let auctionManagerStub;
      beforeEach(() => {
        bidExpiryStub = sinon.stub(targetingModule, 'isBidExpired').returns(true);
        auctionManagerStub = sinon.stub(auctionManager, 'getBidsReceived');
      });

      afterEach(() => {
        bidExpiryStub.restore();
        auctionManagerStub.restore();
      });

      it('should use bids from pool to get Winning Bid', () => {
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

      it('should not use rendered bid to get winning bid', () => {
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

      it('should use highest cpm bid from bid pool to get winning bid', () => {
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

    describe('check bidExpiry', () => {
      let auctionManagerStub;
      let timestampStub;
      beforeEach(() => {
        auctionManagerStub = sinon.stub(auctionManager, 'getBidsReceived');
        timestampStub = sinon.stub(utils, 'timestamp');
      });

      afterEach(() => {
        auctionManagerStub.restore();
        timestampStub.restore();
      });
      it('should not include expired bids in the auction', () => {
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
});
