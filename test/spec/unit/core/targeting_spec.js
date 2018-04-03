import { expect } from 'chai';
import { targeting as targetingInstance } from 'src/targeting';
import { config } from 'src/config';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';
import { auctionManager } from 'src/auctionManager';
import * as targetingModule from 'src/targeting';

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
});
