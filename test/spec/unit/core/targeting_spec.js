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
  'dealId': '1234',
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

const nativeBid1 = {
  'bidderCode': 'appnexus',
  'width': 0,
  'height': 0,
  'statusMessage': 'Bid available',
  'adId': '591e7c9354b633',
  'requestId': '24aae81e32d6f6',
  'mediaType': 'native',
  'source': 'client',
  'cpm': 10,
  'creativeId': 97494403,
  'currency': 'USD',
  'netRevenue': true,
  'ttl': 300,
  'adUnitCode': '/19968336/prebid_native_example_1',
  'appnexus': {
    'buyerMemberId': 9325
  },
  'meta': {
    'advertiserId': 2529885
  },
  'native': {
    'title': 'This is a Prebid Native Creative',
    'body': 'This is a Prebid Native Creative. There are many like it, but this one is mine.',
    'sponsoredBy': 'Prebid.org',
    'clickUrl': 'http://prebid.org/dev-docs/show-native-ads.html',
    'clickTrackers': ['http://www.clickUrl.com/404'],
    'impressionTrackers': ['http://imp.trackerUrl.com/it1'],
    'javascriptTrackers': '<script>//js script here</script>',
    'image': {
      'url': 'http://vcdn.adnxs.com/p/creative-image/94/22/cd/0f/9422cd0f-f400-45d3-80f5-2b92629d9257.jpg',
      'height': 2250,
      'width': 3000
    },
    'icon': {
      'url': 'http://vcdn.adnxs.com/p/creative-image/bd/59/a6/c6/bd59a6c6-0851-411d-a16d-031475a51312.png',
      'height': 83,
      'width': 127
    }
  },
  'auctionId': '72138a4a-b747-4192-9192-dcc41d675de8',
  'responseTimestamp': 1565785219461,
  'requestTimestamp': 1565785219405,
  'bidder': 'appnexus',
  'timeToRespond': 56,
  'pbLg': '5.00',
  'pbMg': '10.00',
  'pbHg': '10.00',
  'pbAg': '10.00',
  'pbDg': '10.00',
  'pbCg': '',
  'size': '0x0',
  'adserverTargeting': {
    [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus',
    [CONSTANTS.TARGETING_KEYS.AD_ID]: '591e7c9354b633',
    [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
    [CONSTANTS.TARGETING_KEYS.SIZE]: '0x0',
    [CONSTANTS.TARGETING_KEYS.SOURCE]: 'client',
    [CONSTANTS.TARGETING_KEYS.FORMAT]: 'native',
    [CONSTANTS.NATIVE_KEYS.title]: 'This is a Prebid Native Creative',
    [CONSTANTS.NATIVE_KEYS.body]: 'This is a Prebid Native Creative. There are many like it, but this one is mine.',
    [CONSTANTS.NATIVE_KEYS.sponsoredBy]: 'Prebid.org',
    [CONSTANTS.NATIVE_KEYS.clickUrl]: 'http://prebid.org/dev-docs/show-native-ads.html',
    [CONSTANTS.NATIVE_KEYS.image]: 'http://vcdn.adnxs.com/p/creative-image/94/22/cd/0f/9422cd0f-f400-45d3-80f5-2b92629d9257.jpg',
    [CONSTANTS.NATIVE_KEYS.icon]: 'http://vcdn.adnxs.com/p/creative-image/bd/59/a6/c6/bd59a6c6-0851-411d-a16d-031475a51312.png'
  }
};
const nativeBid2 = {
  'bidderCode': 'dgads',
  'width': 0,
  'height': 0,
  'statusMessage': 'Bid available',
  'adId': '6e0aba55ed54e5',
  'requestId': '4de26ec83d9661',
  'mediaType': 'native',
  'source': 'client',
  'cpm': 1.90909091,
  'creativeId': 'xuidx6c901261b0x2b2',
  'currency': 'JPY',
  'netRevenue': true,
  'ttl': 60,
  'referrer': 'http://test.localhost:9999/integrationExamples/gpt/demo_native.html?pbjs_debug=true',
  'native': {
    'image': {
      'url': 'https://ads-tr.bigmining.com/img/300x250.png',
      'width': 300,
      'height': 250
    },
    'title': 'Test Title',
    'body': 'Test Description',
    'sponsoredBy': 'test.com',
    'clickUrl': 'http://prebid.org/',
    'clickTrackers': ['https://www.clickUrl.com/404'],
    'impressionTrackers': [
      'http://imp.trackerUrl.com/it2'
    ]
  },
  'auctionId': '72138a4a-b747-4192-9192-dcc41d675de8',
  'responseTimestamp': 1565785219607,
  'requestTimestamp': 1565785219409,
  'bidder': 'dgads',
  'adUnitCode': '/19968336/prebid_native_example_1',
  'timeToRespond': 198,
  'pbLg': '1.50',
  'pbMg': '1.90',
  'pbHg': '1.90',
  'pbAg': '1.90',
  'pbDg': '1.90',
  'pbCg': '',
  'size': '0x0',
  'adserverTargeting': {
    [CONSTANTS.TARGETING_KEYS.BIDDER]: 'dgads',
    [CONSTANTS.TARGETING_KEYS.AD_ID]: '6e0aba55ed54e5',
    [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '1.90',
    [CONSTANTS.TARGETING_KEYS.SIZE]: '0x0',
    [CONSTANTS.TARGETING_KEYS.SOURCE]: 'client',
    [CONSTANTS.TARGETING_KEYS.FORMAT]: 'native',
    [CONSTANTS.NATIVE_KEYS.image]: 'https://ads-tr.bigmining.com/img/300x250.png',
    [CONSTANTS.NATIVE_KEYS.title]: 'Test Title',
    [CONSTANTS.NATIVE_KEYS.body]: 'Test Description',
    [CONSTANTS.NATIVE_KEYS.sponsoredBy]: 'test.com',
    [CONSTANTS.NATIVE_KEYS.clickUrl]: 'http://prebid.org/'
  }
};

describe('targeting tests', function () {
  let sandbox;
  let enableSendAllBids = false;
  let useBidCache;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    useBidCache = true;

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
      amBidsReceivedStub.restore();
      amGetAdUnitsStub.restore();
      bidExpiryStub.restore();
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

    describe('targetingControls.alwaysIncludeDeals', function () {
      let bid4;

      beforeEach(function() {
        bid4 = utils.deepClone(bid1);
        bid4.adserverTargeting = {
          hb_deal: '4321',
          hb_pb: '0.1',
          hb_adid: '567891011',
          hb_bidder: 'appnexus',
        };
        bid4.bidder = bid4.bidderCode = 'appnexus';
        bid4.cpm = 0.1; // losing bid so not included if enableSendAllBids === false
        bid4.dealId = '4321';
        enableSendAllBids = false;

        bidsReceived.push(bid4);
      });

      it('does not include losing deals when alwaysIncludeDeals not set', function () {
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Rubicon wins bid and has deal, but alwaysIncludeDeals is false, so only top bid plus deal_id
        // appnexus does not get sent since alwaysIncludeDeals is not defined
        expect(targeting['/123456/header-bid-tag-0']).to.deep.equal({
          'hb_deal_rubicon': '1234',
          'hb_deal': '1234',
          'hb_pb': '0.53',
          'hb_adid': '148018fe5e',
          'hb_bidder': 'rubicon',
          'foobar': '300x250'
        });
      });

      it('does not include losing deals when alwaysIncludeDeals set to false', function () {
        config.setConfig({
          targetingControls: {
            alwaysIncludeDeals: false
          }
        });

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Rubicon wins bid and has deal, but alwaysIncludeDeals is false, so only top bid plus deal_id
        // appnexus does not get sent since alwaysIncludeDeals is false
        expect(targeting['/123456/header-bid-tag-0']).to.deep.equal({
          'hb_deal_rubicon': '1234', // This is just how it works before this PR, always added no matter what for winner if they have deal
          'hb_deal': '1234',
          'hb_pb': '0.53',
          'hb_adid': '148018fe5e',
          'hb_bidder': 'rubicon',
          'foobar': '300x250'
        });
      });

      it('includes losing deals when alwaysIncludeDeals set to true and also winning deals bidder KVPs', function () {
        config.setConfig({
          targetingControls: {
            alwaysIncludeDeals: true
          }
        });
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Rubicon wins bid and has a deal, so all KVPs for them are passed (top plus bidder specific)
        // Appnexus had deal so passed through
        expect(targeting['/123456/header-bid-tag-0']).to.deep.equal({
          'hb_deal_rubicon': '1234',
          'hb_deal': '1234',
          'hb_pb': '0.53',
          'hb_adid': '148018fe5e',
          'hb_bidder': 'rubicon',
          'foobar': '300x250',
          'hb_pb_rubicon': '0.53',
          'hb_adid_rubicon': '148018fe5e',
          'hb_bidder_rubicon': 'rubicon',
          'hb_deal_appnexus': '4321',
          'hb_pb_appnexus': '0.1',
          'hb_adid_appnexus': '567891011',
          'hb_bidder_appnexus': 'appnexus'
        });
      });

      it('includes winning bid even when it is not a deal, plus other deal KVPs', function () {
        config.setConfig({
          targetingControls: {
            alwaysIncludeDeals: true
          }
        });
        let bid5 = utils.deepClone(bid4);
        bid5.adserverTargeting = {
          hb_pb: '3.0',
          hb_adid: '111111',
          hb_bidder: 'pubmatic',
        };
        bid5.bidder = bid5.bidderCode = 'pubmatic';
        bid5.cpm = 3.0; // winning bid!
        delete bid5.dealId; // no deal with winner
        bidsReceived.push(bid5);

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Pubmatic wins but no deal. So only top bid KVPs for them is sent
        // Rubicon has a dealId so passed through
        // Appnexus has a dealId so passed through
        expect(targeting['/123456/header-bid-tag-0']).to.deep.equal({
          'hb_bidder': 'pubmatic',
          'hb_adid': '111111',
          'hb_pb': '3.0',
          'foobar': '300x250',
          'hb_deal_rubicon': '1234',
          'hb_pb_rubicon': '0.53',
          'hb_adid_rubicon': '148018fe5e',
          'hb_bidder_rubicon': 'rubicon',
          'hb_deal_appnexus': '4321',
          'hb_pb_appnexus': '0.1',
          'hb_adid_appnexus': '567891011',
          'hb_bidder_appnexus': 'appnexus'
        });
      });
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

    it('ensures keys are properly generated when enableSendAllBids is true and multiple bidders use native', function() {
      const nativeAdUnitCode = '/19968336/prebid_native_example_1';
      enableSendAllBids = true;

      // update mocks for this test to return native bids
      amBidsReceivedStub.callsFake(function() {
        return [nativeBid1, nativeBid2];
      });
      amGetAdUnitsStub.callsFake(function() {
        return [nativeAdUnitCode];
      });

      let targeting = targetingInstance.getAllTargeting([nativeAdUnitCode]);
      expect(targeting[nativeAdUnitCode].hb_native_image).to.equal(nativeBid1.native.image.url);
      expect(targeting[nativeAdUnitCode].hb_native_linkurl).to.equal(nativeBid1.native.clickUrl);
      expect(targeting[nativeAdUnitCode].hb_native_title).to.equal(nativeBid1.native.title);
      expect(targeting[nativeAdUnitCode].hb_native_image_dgad).to.exist.and.to.equal(nativeBid2.native.image.url);
      expect(targeting[nativeAdUnitCode].hb_pb_dgads).to.exist.and.to.equal(nativeBid2.pbMg);
      expect(targeting[nativeAdUnitCode].hb_native_body_appne).to.exist.and.to.equal(nativeBid1.native.body);
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
