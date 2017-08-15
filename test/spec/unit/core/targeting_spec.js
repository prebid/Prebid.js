import { expect } from 'chai';
import Targeting from 'src/targeting';
import { config } from 'src/config';
import { getAdUnits } from 'test/fixtures/fixtures';
import CONSTANTS from 'src/constants.json';

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
  }
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
  }
};

describe('targeting tests', () => {
  describe('getAllTargeting', () => {
    beforeEach(() => {
      $$PREBID_GLOBAL$$._sendAllBids = false;
      $$PREBID_GLOBAL$$._bidsReceived = [];
      $$PREBID_GLOBAL$$._adUnitCodes = [];
      $$PREBID_GLOBAL$$.adUnits = [];
    });

    it('selects the top bid when _sendAllBids true', () => {
      $$PREBID_GLOBAL$$.adUnits = [{
        code: '/123456/header-bid-tag-0',
        sizes: [300, 250],
        bids: [
          {
            'bidder': 'rubicon',
            'params': {
              'accountId': 10617,
              'siteId': 23635,
              'zoneId': 453908
            }
          }
        ]
      }];
      config.setConfig({ enableSendAllBids: true });
      $$PREBID_GLOBAL$$._bidsReceived.push(bid1, bid2);
      $$PREBID_GLOBAL$$._adUnitCodes = ['/123456/header-bid-tag-0'];
      let targeting = Targeting.getAllTargeting(['/123456/header-bid-tag-0']);
      let flattened = [];
      targeting.filter(obj => obj['/123456/header-bid-tag-0'] !== undefined).forEach(item => flattened = flattened.concat(item['/123456/header-bid-tag-0']));
      let sendAllBidCpm = flattened.filter(obj => obj.hb_pb_rubicon !== undefined);
      let winningBidCpm = flattened.filter(obj => obj.hb_pb !== undefined);
      // we shouldn't get more than 1 key for hb_pb_${bidder}
      expect(sendAllBidCpm.length).to.equal(1);
      // expect the winning CPM to be equal to the sendAllBidCPM
      expect(sendAllBidCpm[0]['hb_pb_rubicon']).to.deep.equal(winningBidCpm[0]['hb_pb']);
    });
  }); // end getAllTargeting tests
});
