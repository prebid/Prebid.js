import {expect} from 'chai';
import {
  filters,
  getGPTSlotsForAdUnits,
  getHighestCpmBidsFromBidPool,
  sortByDealAndPriceBucketOrCpm,
  targeting as targetingInstance
} from 'src/targeting.js';
import {config} from 'src/config.js';
import {createBidReceived} from 'test/fixtures/fixtures.js';
import {DEFAULT_TARGETING_KEYS, JSON_MAPPING, NATIVE_KEYS, TARGETING_KEYS} from 'src/constants.js';
import {auctionManager} from 'src/auctionManager.js';
import * as utils from 'src/utils.js';
import {deepClone} from 'src/utils.js';
import {createBid} from '../../../../src/bidfactory.js';
import {hook, setupBeforeHookFnOnce} from '../../../../src/hook.js';
import {getHighestCpm} from '../../../../src/utils/reducers.js';
import {getGlobal} from '../../../../src/prebidGlobal.js';
import { getAdUnitBidLimitMap } from '../../../../src/targeting.js';

function mkBid(bid) {
  return Object.assign(createBid(), bid);
}

const sampleBid = {
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
    [TARGETING_KEYS.BIDDER]: 'rubicon',
    [TARGETING_KEYS.AD_ID]: '148018fe5e',
    [TARGETING_KEYS.PRICE_BUCKET]: '0.53',
    [TARGETING_KEYS.DEAL]: '1234'
  },
  'dealId': '1234',
  'netRevenue': true,
  'currency': 'USD',
  'ttl': 300
};

const bid1 = mkBid(sampleBid);

const bid2 = mkBid({
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
    [TARGETING_KEYS.BIDDER]: 'rubicon',
    [TARGETING_KEYS.AD_ID]: '5454545',
    [TARGETING_KEYS.PRICE_BUCKET]: '0.25'
  },
  'netRevenue': true,
  'currency': 'USD',
  'ttl': 300
});

const bid3 = mkBid({
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
    [TARGETING_KEYS.BIDDER]: 'rubicon',
    [TARGETING_KEYS.AD_ID]: '48747745',
    [TARGETING_KEYS.PRICE_BUCKET]: '0.75'
  },
  'netRevenue': true,
  'currency': 'USD',
  'ttl': 300
});

const nativeBid1 = mkBid({
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
    [TARGETING_KEYS.BIDDER]: 'appnexus',
    [TARGETING_KEYS.AD_ID]: '591e7c9354b633',
    [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
    [TARGETING_KEYS.SIZE]: '0x0',
    [TARGETING_KEYS.SOURCE]: 'client',
    [TARGETING_KEYS.FORMAT]: 'native',
    [NATIVE_KEYS.title]: 'This is a Prebid Native Creative',
    [NATIVE_KEYS.body]: 'This is a Prebid Native Creative. There are many like it, but this one is mine.',
    [NATIVE_KEYS.sponsoredBy]: 'Prebid.org',
    [NATIVE_KEYS.clickUrl]: 'http://prebid.org/dev-docs/show-native-ads.html',
    [NATIVE_KEYS.image]: 'http://vcdn.adnxs.com/p/creative-image/94/22/cd/0f/9422cd0f-f400-45d3-80f5-2b92629d9257.jpg',
    [NATIVE_KEYS.icon]: 'http://vcdn.adnxs.com/p/creative-image/bd/59/a6/c6/bd59a6c6-0851-411d-a16d-031475a51312.png'
  }
});

const nativeBid2 = mkBid({
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
    [TARGETING_KEYS.BIDDER]: 'dgads',
    [TARGETING_KEYS.AD_ID]: '6e0aba55ed54e5',
    [TARGETING_KEYS.PRICE_BUCKET]: '1.90',
    [TARGETING_KEYS.SIZE]: '0x0',
    [TARGETING_KEYS.SOURCE]: 'client',
    [TARGETING_KEYS.FORMAT]: 'native',
    [NATIVE_KEYS.image]: 'https://ads-tr.bigmining.com/img/300x250.png',
    [NATIVE_KEYS.title]: 'Test Title',
    [NATIVE_KEYS.body]: 'Test Description',
    [NATIVE_KEYS.sponsoredBy]: 'test.com',
    [NATIVE_KEYS.clickUrl]: 'http://prebid.org/'
  }
});

describe('targeting tests', function () {
  let sandbox;
  let enableSendAllBids = false;
  let useBidCache;
  let bidCacheFilterFunction;
  let undef;

  before(() => {
    hook.ready();
  });

  beforeEach(function() {
    sandbox = sinon.createSandbox();

    useBidCache = true;

    const origGetConfig = config.getConfig;
    sandbox.stub(config, 'getConfig').callsFake(function (key) {
      if (key === 'enableSendAllBids') {
        return enableSendAllBids;
      }
      if (key === 'useBidCache') {
        return useBidCache;
      }
      if (key === 'bidCacheFilterFunction') {
        return bidCacheFilterFunction;
      }
      return origGetConfig.apply(config, arguments);
    });
  });

  afterEach(function () {
    sandbox.restore();
    bidCacheFilterFunction = undef;
  });

  describe('isBidNotExpired', () => {
    let clock;
    beforeEach(() => {
      clock = sandbox.useFakeTimers(0);
    });

    Object.entries({
      'bid.ttlBuffer': (bid, ttlBuffer) => {
        bid.ttlBuffer = ttlBuffer
      },
      'setConfig({ttlBuffer})': (_, ttlBuffer) => {
        config.setConfig({ttlBuffer})
      },
    }).forEach(([t, setup]) => {
      describe(`respects ${t}`, () => {
        [0, 2].forEach(ttlBuffer => {
          it(`when ttlBuffer is ${ttlBuffer}`, () => {
            const bid = {
              responseTimestamp: 0,
              ttl: 10,
            }
            setup(bid, ttlBuffer);

            expect(filters.isBidNotExpired(bid)).to.be.true;
            clock.tick((bid.ttl - ttlBuffer) * 1000 - 100);
            expect(filters.isBidNotExpired(bid)).to.be.true;
            clock.tick(101);
            expect(filters.isBidNotExpired(bid)).to.be.false;
          });
        });
      });
    });
  });

  describe('getAllTargeting', function () {
    let amBidsReceivedStub;
    let amGetAdUnitsStub;
    let bidExpiryStub;
    let logWarnStub;
    let logErrorStub;
    let bidsReceived;

    beforeEach(function () {
      bidsReceived = [bid1, bid2, bid3].map(deepClone);

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

    describe('when handling different adunit targeting value types', function () {
      const adUnitCode = '/123456/header-bid-tag-0';
      const adServerTargeting = {};

      let getAdUnitsStub;

      before(function() {
        getAdUnitsStub = sandbox.stub(auctionManager, 'getAdUnits').callsFake(function() {
          return [
            {
              'code': adUnitCode,
              [JSON_MAPPING.ADSERVER_TARGETING]: adServerTargeting
            }
          ];
        });
      });

      after(function() {
        getAdUnitsStub.restore();
      });

      afterEach(function() {
        delete adServerTargeting.test_type;
      });

      const pairs = [
        ['string', '2.3', '2.3'],
        ['number', 2.3, '2.3'],
        ['boolean', true, 'true'],
        ['string-separated', '2.3, 4.5', '2.3,4.5'],
        ['array-of-string', ['2.3', '4.5'], '2.3,4.5'],
        ['array-of-number', [2.3, 4.5], '2.3,4.5'],
        ['array-of-boolean', [true, false], 'true,false']
      ];
      pairs.forEach(([type, value, result]) => {
        it(`accepts ${type}`, function() {
          adServerTargeting.test_type = value;

          const targeting = targetingInstance.getAllTargeting([adUnitCode]);

          expect(targeting[adUnitCode].test_type).is.equal(result);
        });
      });
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

      after(function() {
        config.setConfig({
          targetingControls: {
            alwaysIncludeDeals: false
          }
        });
        enableSendAllBids = false;
      })

      it('returns targeting with both hb_deal and hb_deal_{bidder_code}', function () {
        config.setConfig({
          targetingControls: {
            alwaysIncludeDeals: true
          }
        });

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // We should add both keys rather than one or the other
        expect(targeting['/123456/header-bid-tag-0']).to.contain.keys('hb_deal', `hb_deal_${bid1.bidderCode}`, `hb_deal_${bid4.bidderCode}`);

        // We should assign both keys the same value
        expect(targeting['/123456/header-bid-tag-0']['hb_deal']).to.deep.equal(targeting['/123456/header-bid-tag-0'][`hb_deal_${bid1.bidderCode}`]);
      });
    });

    function expectHbVersion(expectation) {
      const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0', '/123456/header-bid-tag-1']);
      Object.values(targeting).forEach(tgMap => expectation(tgMap['hb_ver']));
    }

    it('will include hb_ver by default', () => {
      expectHbVersion(version => {
        expect(version).to.exist;
      })
    })

    it('will include hb_ver based on puc.version config', () => {
      config.setConfig({
        targetingControls: {
          version: 'custom-version'
        }
      })
      expectHbVersion(version => {
        expect(version).to.eql('custom-version');
      })
    })

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

    it('will not filter hb_ver if any other targeting is set', () => {
      config.setConfig({
        targetingControls: {
          auctionKeyMaxChars: 150
        }
      })
      const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0', '/123456/header-bid-tag-1']);
      expect(targeting['/123456/header-bid-tag-1']).to.deep.equal({});
      expect(targeting['/123456/header-bid-tag-0']).to.contain.keys('hb_ver');
    })

    it('does not include adunit targeting for ad units that are not requested', () => {
      sandbox.stub(auctionManager, 'getAdUnits').callsFake(() => ([
        {
          code: 'au1',
          [JSON_MAPPING.ADSERVER_TARGETING]: {'aut': 'v1'}
        },
        {
          code: 'au2',
          [JSON_MAPPING.ADSERVER_TARGETING]: {'aut': 'v2'}
        }
      ]));
      expect(targetingInstance.getAllTargeting('au1').au2).to.not.exist;
    })

    describe('when bidLimit is present in setConfig', function () {
      let bid4;

      beforeEach(function() {
        bid4 = utils.deepClone(bid1);
        bid4.adserverTargeting['hb_bidder'] = bid4.bidder = bid4.bidderCode = 'appnexus';
        bid4.cpm = 2.25;
        bid4.adId = '8383838';
        enableSendAllBids = true;

        bidsReceived.push(bid4);
      });

      it('when sendBidsControl.bidLimit is set greater than 0 in getHighestCpmBidsFromBidPool', function () {
        config.setConfig({
          sendBidsControl: {
            bidLimit: 2,
            dealPrioritization: true
          }
        });

        const bids = getHighestCpmBidsFromBidPool(bidsReceived, getHighestCpm, 2);

        expect(bids.length).to.equal(3);
        expect(bids[0].adId).to.equal('8383838');
        expect(bids[1].adId).to.equal('148018fe5e');
        expect(bids[2].adId).to.equal('48747745');
      });

      it('when sendBidsControl.bidLimit is set greater than 0 and deal priortization is false in getHighestCpmBidsFromBidPool', function () {
        config.setConfig({
          sendBidsControl: {
            bidLimit: 2,
            dealPrioritization: false
          }
        });

        const bids = getHighestCpmBidsFromBidPool(bidsReceived, getHighestCpm, 2);

        expect(bids.length).to.equal(3);
        expect(bids[0].adId).to.equal('8383838');
        expect(bids[1].adId).to.equal('148018fe5e');
        expect(bids[2].adId).to.equal('48747745');
      });

      it('selects the top n number of bids when enableSendAllBids is true and and bitLimit is set', function () {
        let getAdUnitsStub = sandbox.stub(auctionManager, 'getAdUnits').callsFake(() => ([
          {
            code: '/123456/header-bid-tag-0',
          },
        ]));

        config.setConfig({
          sendBidsControl: {
            bidLimit: 1
          }
        });

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        const limitedBids = Object.keys(targeting['/123456/header-bid-tag-0']).filter(key => key.indexOf(TARGETING_KEYS.PRICE_BUCKET + '_') !== -1)

        getAdUnitsStub.restore();
        expect(limitedBids.length).to.equal(1);
      });

      it('sends all bids when enableSendAllBids is true and and bitLimit is above total number of bids received', function () {
        config.setConfig({
          sendBidsControl: {
            bidLimit: 50
          }
        });

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        const limitedBids = Object.keys(targeting['/123456/header-bid-tag-0']).filter(key => key.indexOf(TARGETING_KEYS.PRICE_BUCKET + '_') !== -1)

        expect(limitedBids.length).to.equal(2);
      });

      it('Sends all bids when enableSendAllBids is true and and bidLimit is set to 0', function () {
        config.setConfig({
          sendBidsControl: {
            bidLimit: 0
          }
        });

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        const limitedBids = Object.keys(targeting['/123456/header-bid-tag-0']).filter(key => key.indexOf(TARGETING_KEYS.PRICE_BUCKET + '_') !== -1)

        expect(limitedBids.length).to.equal(2);
      });

      it('getHighestCpmBidsFromBidPool calculates bids limit properly when bidLimit is a map', function () {
        const bidLimit = {
          'adunit1': 2
        };
        const bids = [
          { ...bid1, bidderCode: 'rubicon', adUnitCode: 'adunit1' },
          { ...bid2, bidderCode: 'appnexus', adUnitCode: 'adunit1' },
          { ...bid3, bidderCode: 'dgads', adUnitCode: 'adunit1' },
        ];

        const limitedBids = getHighestCpmBidsFromBidPool(bids, getHighestCpm, bidLimit);

        expect(limitedBids.length).to.equal(2);
      });
    });

    it('getAdUnitBidLimitMap returns correct map of adUnitCode to bidLimit', function() {
      enableSendAllBids = true;
      let getAdUnitsStub = sandbox.stub(auctionManager, 'getAdUnits').callsFake(() => ([
        {
          code: 'adunit1',
          bidLimit: 2
        },
        {
          code: 'adunit2',
          bidLimit: 5
        },
        {
          code: 'adunit3'
        }
      ]));

      const adUnitBidLimitMap = getAdUnitBidLimitMap(['adunit1', 'adunit2', 'adunit3'], 0);

      expect(adUnitBidLimitMap).to.deep.equal({
        'adunit1': 2,
        'adunit2': 5,
        'adunit3': undefined
      });
      getAdUnitsStub.restore();
    })

    describe('targetingControls.allowZeroCpmBids', function () {
      let bid4;
      let bidderSettingsStorage;

      before(function() {
        bidderSettingsStorage = getGlobal().bidderSettings;
      });

      beforeEach(function () {
        bid4 = utils.deepClone(bid1);
        bid4.adserverTargeting = {
          hb_pb: '0.0',
          hb_adid: '567891011',
          hb_bidder: 'appnexus',
        };
        bid4.bidder = bid4.bidderCode = 'appnexus';
        bid4.cpm = 0;
        bidsReceived = [bid4];
      });

      after(function() {
        getGlobal().bidderSettings = bidderSettingsStorage;
        enableSendAllBids = false;
      })

      it('targeting should not include a 0 cpm by default', function() {
        bid4.adserverTargeting = {};
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        expect(targeting['/123456/header-bid-tag-0']).to.deep.equal({});
      });

      it('targeting should allow a 0 cpm with targetingControls.allowZeroCpmBids set to true', function () {
        getGlobal().bidderSettings = {
          standard: {
            allowZeroCpmBids: true
          }
        };

        enableSendAllBids = true;

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        expect(targeting['/123456/header-bid-tag-0']).to.include.all.keys('hb_pb', 'hb_bidder', 'hb_adid', 'hb_bidder_appnexus', 'hb_adid_appnexus', 'hb_pb_appnexus');
        expect(targeting['/123456/header-bid-tag-0']['hb_pb']).to.equal('0.0')
      });
    });

    describe('targetingControls.allowTargetingKeys', function () {
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
        enableSendAllBids = true;
        config.setConfig({
          targetingControls: {
            allowTargetingKeys: ['BIDDER', 'AD_ID', 'PRICE_BUCKET']
          }
        });
        bidsReceived.push(bid4);
      });

      it('targeting should include custom keys', function () {
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        expect(targeting['/123456/header-bid-tag-0']).to.include.all.keys('foobar');
      });

      it('targeting should include keys prefixed by allowed default targeting keys', function () {
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        expect(targeting['/123456/header-bid-tag-0']).to.include.all.keys('hb_bidder_rubicon', 'hb_adid_rubicon', 'hb_pb_rubicon');
        expect(targeting['/123456/header-bid-tag-0']).to.include.all.keys('hb_bidder_appnexus', 'hb_adid_appnexus', 'hb_pb_appnexus');
      });

      it('targeting should not include keys prefixed by disallowed default targeting keys', function () {
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        expect(targeting['/123456/header-bid-tag-0']).to.not.have.all.keys(['hb_deal_appnexus', 'hb_deal_rubicon']);
      });
    });

    describe('targetingControls.addTargetingKeys', function () {
      let winningBid = null;

      beforeEach(function () {
        bidsReceived = [bid1, bid2, nativeBid1, nativeBid2].map(deepClone);
        bidsReceived.forEach((bid) => {
          bid.adserverTargeting[TARGETING_KEYS.SOURCE] = 'test-source';
          bid.adUnitCode = 'adunit';
          if (winningBid == null || bid.cpm > winningBid.cpm) {
            winningBid = bid;
          }
        });
        enableSendAllBids = true;
      });

      const expandKey = function (key) {
        const keys = new Set();
        if (winningBid.adserverTargeting[key] != null) {
          keys.add(key);
        }
        bidsReceived
          .filter((bid) => bid.adserverTargeting[key] != null)
          .map((bid) => bid.bidderCode)
          .forEach((code) => keys.add(`${key}_${code}`.substr(0, 20)));
        return [...keys];
      }

      const targetingResult = function () {
        return targetingInstance.getAllTargeting(['adunit'])['adunit'];
      }

      it('should include added keys', function () {
        config.setConfig({
          targetingControls: {
            addTargetingKeys: ['SOURCE']
          }
        });
        expect(targetingResult()).to.include.all.keys(...expandKey(TARGETING_KEYS.SOURCE));
      });

      it('should keep default and native keys', function() {
        config.setConfig({
          targetingControls: {
            addTargetingKeys: ['SOURCE']
          }
        });
        const defaultKeys = new Set(Object.values(DEFAULT_TARGETING_KEYS));

        const expectedKeys = new Set();
        bidsReceived
          .map((bid) => Object.keys(bid.adserverTargeting))
          .reduce((left, right) => left.concat(right), [])
          .filter((key) => defaultKeys.has(key))
          .map(expandKey)
          .reduce((left, right) => left.concat(right), [])
          .forEach((k) => expectedKeys.add(k));
        expect(targetingResult()).to.include.all.keys(...expectedKeys);
      });

      it('should not be allowed together with allowTargetingKeys', function () {
        config.setConfig({
          targetingControls: {
            allowTargetingKeys: [TARGETING_KEYS.BIDDER],
            addTargetingKeys: [TARGETING_KEYS.SOURCE]
          }
        });
        expect(targetingResult).to.throw();
      });
    });

    describe('targetingControls.allowSendAllBidsTargetingKeys', function () {
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
        enableSendAllBids = true;
        config.setConfig({
          targetingControls: {
            allowTargetingKeys: ['BIDDER', 'AD_ID', 'PRICE_BUCKET'],
            allowSendAllBidsTargetingKeys: ['PRICE_BUCKET', 'AD_ID']
          }
        });
        bidsReceived.push(bid4);
      });

      it('targeting should include custom keys', function () {
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        expect(targeting['/123456/header-bid-tag-0']).to.include.all.keys('foobar');
      });

      it('targeting should only include keys prefixed by allowed default send all bids targeting keys and standard keys', function () {
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        expect(targeting['/123456/header-bid-tag-0']).to.include.all.keys('hb_bidder', 'hb_adid', 'hb_pb');
        expect(targeting['/123456/header-bid-tag-0']).to.include.all.keys('hb_adid_rubicon', 'hb_pb_rubicon');
        expect(targeting['/123456/header-bid-tag-0']).to.include.all.keys('hb_bidder', 'hb_adid', 'hb_pb', 'hb_adid_appnexus', 'hb_pb_appnexus');
      });

      it('targeting should not include keys prefixed by disallowed default targeting keys and disallowed send all bid targeting keys', function () {
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
        expect(targeting['/123456/header-bid-tag-0']).to.not.have.all.keys(['hb_deal', 'hb_bidder_rubicon', 'hb_bidder_appnexus', 'hb_deal_appnexus', 'hb_deal_rubicon']);
      });
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
        sinon.assert.match(targeting['/123456/header-bid-tag-0'], {
          'hb_deal_rubicon': '1234',
          'hb_deal': '1234',
          'hb_pb': '0.53',
          'hb_adid': '148018fe5e',
          'hb_bidder': 'rubicon',
          'foobar': '300x250',
          'hb_deal_appnexus': sinon.match(val => typeof val === 'undefined'),
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
        sinon.assert.match(targeting['/123456/header-bid-tag-0'], {
          'hb_deal_rubicon': '1234', // This is just how it works before this PR, always added no matter what for winner if they have deal
          'hb_deal': '1234',
          'hb_pb': '0.53',
          'hb_adid': '148018fe5e',
          'hb_bidder': 'rubicon',
          'foobar': '300x250',
          'hb_deal_appnexus': sinon.match(val => typeof val === 'undefined')
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
        sinon.assert.match(targeting['/123456/header-bid-tag-0'], {
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
        const bid5 = utils.deepClone(bid4);
        bid5.adserverTargeting = {
          hb_pb: '3.0',
          hb_adid: '111111',
          hb_bidder: 'pubmatic',
          foobar: '300x250'
        };
        bid5.bidder = bid5.bidderCode = 'pubmatic';
        bid5.cpm = 3.0; // winning bid!
        delete bid5.dealId; // no deal with winner
        bidsReceived.push(bid5);

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Pubmatic wins but no deal. So only top bid KVPs for them is sent
        // Rubicon has a dealId so passed through
        // Appnexus has a dealId so passed through
        sinon.assert.match(targeting['/123456/header-bid-tag-0'], {
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

    describe('targetingControls.alwaysIncludeDeals with enableSendAllBids', function () {
      beforeEach(function() {
        enableSendAllBids = true;
      });

      it('includes bids w/o deal when enableSendAllBids and alwaysIncludeDeals set to true', function () {
        config.setConfig({
          enableSendAllBids: true,
          targetingControls: {
            alwaysIncludeDeals: true
          }
        });

        const bid5 = utils.deepClone(bid1);
        bid5.adserverTargeting = {
          hb_pb: '3.0',
          hb_adid: '111111',
          hb_bidder: 'pubmatic',
          foobar: '300x250'
        };
        bid5.bidder = bid5.bidderCode = 'pubmatic';
        bid5.cpm = 3.0; // winning bid!
        delete bid5.dealId; // no deal with winner
        bidsReceived.push(bid5);

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Pubmatic wins but no deal. But enableSendAllBids is true.
        // So Pubmatic is passed through
        sinon.assert.match(targeting['/123456/header-bid-tag-0'], {
          'hb_bidder': 'pubmatic',
          'hb_adid': '111111',
          'hb_pb': '3.0',
          'foobar': '300x250',
          'hb_pb_pubmatic': '3.0',
          'hb_adid_pubmatic': '111111',
          'hb_bidder_pubmatic': 'pubmatic',
          'hb_deal_rubicon': '1234',
          'hb_pb_rubicon': '0.53',
          'hb_adid_rubicon': '148018fe5e',
          'hb_bidder_rubicon': 'rubicon'
        });
      });
    });

    describe('targetingControls.allBidsCustomTargeting', function () {
      beforeEach(function () {
        const winningBid = deepClone(bid1);
        winningBid.adserverTargeting.foobar = 'winner';

        const losingBid = utils.deepClone(bid2);
        losingBid.adserverTargeting = {
          hb_deal: '4321',
          hb_pb: '0.1',
          hb_adid: '567891011',
          hb_bidder: 'appnexus',
          foobar: 'loser'
        };
        losingBid.bidder = losingBid.bidderCode = 'appnexus';
        losingBid.cpm = 0.1;

        bidsReceived = [winningBid, losingBid];
        enableSendAllBids = false;
      });

      afterEach(function () {
        config.resetConfig();
      });

      it('should merge custom targeting from all bids when allBidsCustomTargeting: true', function () {
        // Default behavior - no specific configuration
        config.setConfig({targetingControls: {allBidsCustomTargeting: true}});
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Custom key values from both bids should be combined to maintain existing functionality
        expect(targeting['/123456/header-bid-tag-0']).to.have.property('foobar');
        expect(targeting['/123456/header-bid-tag-0']['foobar']).to.equal('winner,loser');
      });

      it('should use custom targeting from winning bid when allBidsCustomTargeting=false', function () {
        // Set allBidsCustomTargeting to false
        config.setConfig({
          targetingControls: {
            allBidsCustomTargeting: false
          }
        });

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Only the winning bid's custom key value should be used
        expect(targeting['/123456/header-bid-tag-0']).to.have.property('foobar');
        expect(targeting['/123456/header-bid-tag-0']['foobar']).to.equal('winner');
      });

      it('should use custom targeting from winning bid when allBidsCustomTargeting is not set', function () {
        // allBidsCustomTargeting defaults to false
        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Only the winning bid's custom key value should be used
        expect(targeting['/123456/header-bid-tag-0']).to.have.property('foobar');
        expect(targeting['/123456/header-bid-tag-0']['foobar']).to.equal('winner');
      });

      it('should handle multiple custom keys correctly when allBidsCustomTargeting=false', function () {
        // Add another custom key to the bids
        bidsReceived[0].adserverTargeting.custom1 = 'value1';
        bidsReceived[1].adserverTargeting.custom2 = 'value2';

        config.setConfig({
          targetingControls: {
            allBidsCustomTargeting: false
          }
        });

        const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

        // Only winning bid's custom values should be present
        expect(targeting['/123456/header-bid-tag-0']).to.have.property('foobar');
        expect(targeting['/123456/header-bid-tag-0'].foobar).to.equal('winner');
        expect(targeting['/123456/header-bid-tag-0']).to.have.property('custom1');
        expect(targeting['/123456/header-bid-tag-0']).to.not.have.property('custom2');
      });
    });

    it('selects the top bid when enableSendAllBids true', function () {
      enableSendAllBids = true;
      const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

      // we should only get the targeting data for the one requested adunit
      expect(Object.keys(targeting).length).to.equal(1);

      const sendAllBidCpm = Object.keys(targeting['/123456/header-bid-tag-0']).filter(key => key.indexOf(TARGETING_KEYS.PRICE_BUCKET + '_') !== -1)
      // we shouldn't get more than 1 key for hb_pb_${bidder}
      expect(sendAllBidCpm.length).to.equal(1);

      // expect the winning CPM to be equal to the sendAllBidCPM
      expect(targeting['/123456/header-bid-tag-0'][TARGETING_KEYS.PRICE_BUCKET + '_rubicon']).to.deep.equal(targeting['/123456/header-bid-tag-0'][TARGETING_KEYS.PRICE_BUCKET]);
    });

    if (FEATURES.NATIVE) {
      it('ensures keys are properly generated when enableSendAllBids is true and multiple bidders use native', function () {
        const nativeAdUnitCode = '/19968336/prebid_native_example_1';
        enableSendAllBids = true;

        // update mocks for this test to return native bids
        amBidsReceivedStub.callsFake(function () {
          return [nativeBid1, nativeBid2];
        });
        amGetAdUnitsStub.callsFake(function () {
          return [nativeAdUnitCode];
        });

        const targeting = targetingInstance.getAllTargeting([nativeAdUnitCode]);
        expect(targeting[nativeAdUnitCode].hb_pb_dgads).to.exist.and.to.equal(nativeBid2.pbMg);
      });
    }

    it('does not include adpod type bids in the getBidsReceived results', function () {
      const adpodBid = utils.deepClone(bid1);
      adpodBid.video = { context: 'adpod', durationSeconds: 15, durationBucket: 15 };
      adpodBid.cpm = 5;
      bidsReceived.push(adpodBid);

      const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);
      expect(targeting['/123456/header-bid-tag-0']).to.contain.keys('hb_deal', 'hb_adid', 'hb_bidder');
      expect(targeting['/123456/header-bid-tag-0']['hb_adid']).to.equal(bid1.adId);
    });
  }); // end getAllTargeting tests

  describe('getAllTargeting will work correctly when a hook raises has modified flag in getHighestCpmBidsFromBidPool', function () {
    let bidsReceived;
    let amGetAdUnitsStub;
    let amBidsReceivedStub;
    let bidExpiryStub;

    beforeEach(function () {
      bidsReceived = [bid2, bid1].map(deepClone);

      amBidsReceivedStub = sandbox.stub(auctionManager, 'getBidsReceived').callsFake(function() {
        return bidsReceived;
      });
      amGetAdUnitsStub = sandbox.stub(auctionManager, 'getAdUnitCodes').callsFake(function() {
        return ['/123456/header-bid-tag-0'];
      });
      bidExpiryStub = sandbox.stub(filters, 'isBidNotExpired').returns(true);

      setupBeforeHookFnOnce(getHighestCpmBidsFromBidPool, function (fn, bidsReceived, highestCpmCallback, adUnitBidLimit = 0, hasModified = false) {
        fn.call(this, bidsReceived, highestCpmCallback, adUnitBidLimit, true);
      });
    });

    afterEach(function () {
      getHighestCpmBidsFromBidPool.getHooks().remove();
    })

    it('will apply correct targeting', function () {
      const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

      expect(targeting['/123456/header-bid-tag-0']['hb_pb']).to.equal('0.53');
      expect(targeting['/123456/header-bid-tag-0']['hb_adid']).to.equal('148018fe5e');
    })
  });

  describe('getAllTargeting without bids return empty object', function () {
    let amBidsReceivedStub;
    let amGetAdUnitsStub;
    let bidExpiryStub;

    beforeEach(function () {
      enableSendAllBids = false;
      amBidsReceivedStub = sandbox.stub(auctionManager, 'getBidsReceived').callsFake(function() {
        return [];
      });
      amGetAdUnitsStub = sandbox.stub(auctionManager, 'getAdUnitCodes').callsFake(function() {
        return ['/123456/header-bid-tag-0'];
      });
      bidExpiryStub = sandbox.stub(filters, 'isBidNotExpired').returns(true);
    });

    it('returns targetingSet correctly', function () {
      const targeting = targetingInstance.getAllTargeting(['/123456/header-bid-tag-0']);

      // we should only get the targeting data for the one requested adunit to at least exist even though it has no keys to set
      expect(Object.keys(targeting).length).to.equal(1);
    });
  }); // end getAllTargeting without bids return empty object

  describe('Targeting in concurrent auctions', function () {
    describe('check getOldestBid', function () {
      let bidExpiryStub;
      let auctionManagerStub;
      beforeEach(function () {
        enableSendAllBids = false;
        bidExpiryStub = sandbox.stub(filters, 'isBidNotExpired').returns(true);
        auctionManagerStub = sandbox.stub(auctionManager, 'getBidsReceived');
      });

      it('should use bids from pool to get Winning Bid', function () {
        const bidsReceived = [
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1'}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-1', adId: 'adid-2'}),
          createBidReceived({bidder: 'appnexus', cpm: 6, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3'}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-1', adId: 'adid-4'}),
        ];
        const adUnitCodes = ['code-0', 'code-1'];

        const bids = targetingInstance.getWinningBids(adUnitCodes, bidsReceived);

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

        const adUnitCodes = ['code-0'];
        targetingInstance.setLatestAuctionForAdUnit('code-0', 2);

        let bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(1);
        expect(bids[0].adId).to.equal('adid-1');
        expect(bids[0].latestTargetedAuctionId).to.equal(2);

        useBidCache = false;

        bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(1);
        expect(bids[0].adId).to.equal('adid-2');
        expect(bids[0].latestTargetedAuctionId).to.equal(2);
      });

      it('should use bidCacheFilterFunction', function() {
        auctionManagerStub.returns([
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1', mediaType: 'banner'}),
          createBidReceived({bidder: 'appnexus', cpm: 5, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-2', mediaType: 'banner'}),
          createBidReceived({bidder: 'appnexus', cpm: 6, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-1', adId: 'adid-3', mediaType: 'banner'}),
          createBidReceived({bidder: 'appnexus', cpm: 8, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-1', adId: 'adid-4', mediaType: 'banner'}),
          createBidReceived({bidder: 'appnexus', cpm: 27, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-2', adId: 'adid-5', mediaType: 'video'}),
          createBidReceived({bidder: 'appnexus', cpm: 25, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-2', adId: 'adid-6', mediaType: 'video'}),
          createBidReceived({bidder: 'appnexus', cpm: 26, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-3', adId: 'adid-7', mediaType: 'video'}),
          createBidReceived({bidder: 'appnexus', cpm: 28, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-3', adId: 'adid-8', mediaType: 'video'}),
        ]);

        const adUnitCodes = ['code-0', 'code-1', 'code-2', 'code-3'];
        targetingInstance.setLatestAuctionForAdUnit('code-0', 2);
        targetingInstance.setLatestAuctionForAdUnit('code-1', 2);
        targetingInstance.setLatestAuctionForAdUnit('code-2', 2);
        targetingInstance.setLatestAuctionForAdUnit('code-3', 2);

        // Bid Caching On, No Filter Function
        useBidCache = true;
        bidCacheFilterFunction = undef;
        let bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(4);
        expect(bids[0].adId).to.equal('adid-1');
        expect(bids[0].latestTargetedAuctionId).to.equal(2);
        expect(bids[1].adId).to.equal('adid-4');
        expect(bids[1].latestTargetedAuctionId).to.equal(2);
        expect(bids[2].adId).to.equal('adid-5');
        expect(bids[2].latestTargetedAuctionId).to.equal(2);
        expect(bids[3].adId).to.equal('adid-8');
        expect(bids[3].latestTargetedAuctionId).to.equal(2);

        // Bid Caching Off, No Filter Function
        useBidCache = false;
        bidCacheFilterFunction = undef;
        bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(4);
        expect(bids[0].adId).to.equal('adid-2');
        expect(bids[0].latestTargetedAuctionId).to.equal(2);
        expect(bids[1].adId).to.equal('adid-4');
        expect(bids[1].latestTargetedAuctionId).to.equal(2);
        expect(bids[2].adId).to.equal('adid-6');
        expect(bids[2].latestTargetedAuctionId).to.equal(2);
        expect(bids[3].adId).to.equal('adid-8');
        expect(bids[3].latestTargetedAuctionId).to.equal(2);

        // Bid Caching On AGAIN, No Filter Function (should be same as first time)
        useBidCache = true;
        bidCacheFilterFunction = undef;
        bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(4);
        expect(bids[0].adId).to.equal('adid-1');
        expect(bids[0].latestTargetedAuctionId).to.equal(2);
        expect(bids[1].adId).to.equal('adid-4');
        expect(bids[1].latestTargetedAuctionId).to.equal(2);
        expect(bids[2].adId).to.equal('adid-5');
        expect(bids[2].latestTargetedAuctionId).to.equal(2);
        expect(bids[3].adId).to.equal('adid-8');
        expect(bids[3].latestTargetedAuctionId).to.equal(2);

        // Bid Caching On, with Filter Function to Exclude video
        useBidCache = true;
        let bcffCalled = 0;
        bidCacheFilterFunction = bid => {
          bcffCalled++;
          return bid.mediaType !== 'video';
        }
        bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(4);
        expect(bids[0].adId).to.equal('adid-1');
        expect(bids[0].latestTargetedAuctionId).to.equal(2);
        expect(bids[1].adId).to.equal('adid-4');
        expect(bids[1].latestTargetedAuctionId).to.equal(2);
        expect(bids[2].adId).to.equal('adid-6');
        expect(bids[2].latestTargetedAuctionId).to.equal(2);
        expect(bids[3].adId).to.equal('adid-8');
        expect(bids[3].latestTargetedAuctionId).to.equal(2);
        // filter function should have been called for each cached bid (4 times)
        expect(bcffCalled).to.equal(4);

        // Bid Caching Off, with Filter Function to Exclude video
        // - should not use cached bids or call the filter function
        useBidCache = false;
        bcffCalled = 0;
        bidCacheFilterFunction = bid => {
          bcffCalled++;
          return bid.mediaType !== 'video';
        }
        bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(4);
        expect(bids[0].adId).to.equal('adid-2');
        expect(bids[0].latestTargetedAuctionId).to.equal(2);
        expect(bids[1].adId).to.equal('adid-4');
        expect(bids[1].latestTargetedAuctionId).to.equal(2);
        expect(bids[2].adId).to.equal('adid-6');
        expect(bids[2].latestTargetedAuctionId).to.equal(2);
        expect(bids[3].adId).to.equal('adid-8');
        expect(bids[3].latestTargetedAuctionId).to.equal(2);
        // filter function should not have been called
        expect(bcffCalled).to.equal(0);
      });

      it('should not use rendered bid to get winning bid', function () {
        const bidsReceived = [
          createBidReceived({bidder: 'appnexus', cpm: 8, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1', status: 'rendered'}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-1', adId: 'adid-2'}),
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3'}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-1', adId: 'adid-4'}),
        ];
        auctionManagerStub.returns(bidsReceived);

        const adUnitCodes = ['code-0', 'code-1'];
        const bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(2);
        expect(bids[0].adId).to.equal('adid-2');
        expect(bids[1].adId).to.equal('adid-3');
      });

      it('should use highest cpm bid from bid pool to get winning bid', function () {
        // Pool is having 4 bids from 2 auctions. There are 2 bids from rubicon, #2 which is highest cpm bid will be selected to take part in auction.
        const bidsReceived = [
          createBidReceived({bidder: 'appnexus', cpm: 8, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1'}),
          createBidReceived({bidder: 'rubicon', cpm: 9, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-0', adId: 'adid-2'}),
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3'}),
          createBidReceived({bidder: 'rubicon', cpm: 8, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-0', adId: 'adid-4'}),
        ];
        auctionManagerStub.returns(bidsReceived);

        const adUnitCodes = ['code-0'];
        const bids = targetingInstance.getWinningBids(adUnitCodes);

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
        const bidsReceived = [
          createBidReceived({bidder: 'appnexus', cpm: 18, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1', ttl: 150}),
          createBidReceived({bidder: 'sampleBidder', cpm: 16, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-0', adId: 'adid-2', ttl: 100}),
          createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3', ttl: 300}),
          createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-0', adId: 'adid-4', ttl: 50}),
        ];
        auctionManagerStub.returns(bidsReceived);

        const adUnitCodes = ['code-0', 'code-1'];
        const bids = targetingInstance.getWinningBids(adUnitCodes);

        expect(bids.length).to.equal(1);
        expect(bids[0].adId).to.equal('adid-3');
      });
    });
  });

  describe('sortByDealAndPriceBucketOrCpm', function() {
    it('will properly sort bids when some bids have deals and some do not', function () {
      const bids = [{
        adserverTargeting: {
          hb_adid: 'abc',
          hb_pb: '1.00',
          hb_deal: '1234'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'def',
          hb_pb: '0.50',
        }
      }, {
        adserverTargeting: {
          hb_adid: 'ghi',
          hb_pb: '20.00',
          hb_deal: '4532'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'jkl',
          hb_pb: '9.00',
          hb_deal: '9864'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'mno',
          hb_pb: '50.00',
        }
      }, {
        adserverTargeting: {
          hb_adid: 'pqr',
          hb_pb: '100.00',
        }
      }];
      bids.sort(sortByDealAndPriceBucketOrCpm());
      expect(bids[0].adserverTargeting.hb_adid).to.equal('ghi');
      expect(bids[1].adserverTargeting.hb_adid).to.equal('jkl');
      expect(bids[2].adserverTargeting.hb_adid).to.equal('abc');
      expect(bids[3].adserverTargeting.hb_adid).to.equal('pqr');
      expect(bids[4].adserverTargeting.hb_adid).to.equal('mno');
      expect(bids[5].adserverTargeting.hb_adid).to.equal('def');
    });

    it('will properly sort bids when all bids have deals', function () {
      const bids = [{
        adserverTargeting: {
          hb_adid: 'abc',
          hb_pb: '1.00',
          hb_deal: '1234'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'def',
          hb_pb: '0.50',
          hb_deal: '4321'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'ghi',
          hb_pb: '2.50',
          hb_deal: '4532'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'jkl',
          hb_pb: '2.00',
          hb_deal: '9864'
        }
      }];
      bids.sort(sortByDealAndPriceBucketOrCpm());
      expect(bids[0].adserverTargeting.hb_adid).to.equal('ghi');
      expect(bids[1].adserverTargeting.hb_adid).to.equal('jkl');
      expect(bids[2].adserverTargeting.hb_adid).to.equal('abc');
      expect(bids[3].adserverTargeting.hb_adid).to.equal('def');
    });

    it('will properly sort bids when no bids have deals', function () {
      const bids = [{
        adserverTargeting: {
          hb_adid: 'abc',
          hb_pb: '1.00'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'def',
          hb_pb: '0.10'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'ghi',
          hb_pb: '10.00'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'jkl',
          hb_pb: '10.01'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'mno',
          hb_pb: '1.00'
        }
      }, {
        adserverTargeting: {
          hb_adid: 'pqr',
          hb_pb: '100.00'
        }
      }];
      bids.sort(sortByDealAndPriceBucketOrCpm());
      expect(bids[0].adserverTargeting.hb_adid).to.equal('pqr');
      expect(bids[1].adserverTargeting.hb_adid).to.equal('jkl');
      expect(bids[2].adserverTargeting.hb_adid).to.equal('ghi');
      expect(bids[3].adserverTargeting.hb_adid).to.equal('abc');
      expect(bids[4].adserverTargeting.hb_adid).to.equal('mno');
      expect(bids[5].adserverTargeting.hb_adid).to.equal('def');
    });

    it('will properly sort bids when some bids have deals and some do not and by cpm when flag is set to true', function () {
      const bids = [{
        cpm: 1.04,
        adserverTargeting: {
          hb_adid: 'abc',
          hb_pb: '1.00',
          hb_deal: '1234'
        }
      }, {
        cpm: 0.50,
        adserverTargeting: {
          hb_adid: 'def',
          hb_pb: '0.50',
          hb_deal: '4532'
        }
      }, {
        cpm: 0.53,
        adserverTargeting: {
          hb_adid: 'ghi',
          hb_pb: '0.50',
          hb_deal: '4532'
        }
      }, {
        cpm: 9.04,
        adserverTargeting: {
          hb_adid: 'jkl',
          hb_pb: '9.00',
          hb_deal: '9864'
        }
      }, {
        cpm: 50.00,
        adserverTargeting: {
          hb_adid: 'mno',
          hb_pb: '50.00',
        }
      }, {
        cpm: 100.00,
        adserverTargeting: {
          hb_adid: 'pqr',
          hb_pb: '100.00',
        }
      }];
      bids.sort(sortByDealAndPriceBucketOrCpm(true));
      expect(bids[0].adserverTargeting.hb_adid).to.equal('jkl');
      expect(bids[1].adserverTargeting.hb_adid).to.equal('abc');
      expect(bids[2].adserverTargeting.hb_adid).to.equal('ghi');
      expect(bids[3].adserverTargeting.hb_adid).to.equal('def');
      expect(bids[4].adserverTargeting.hb_adid).to.equal('pqr');
      expect(bids[5].adserverTargeting.hb_adid).to.equal('mno');
    });
  });

  describe('setTargetingForAst', function () {
    let sandbox,
      apnTagStub;

    before(() => {
      if (window.apntag?.setKeywords == null) {
        const orig = window.apntag;
        window.apntag = {setKeywords: () => {}}
        after(() => {
          window.apntag = orig;
        })
      }
    });

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      sandbox.stub(targetingInstance, 'resetPresetTargetingAST');
      apnTagStub = sandbox.stub(window.apntag, 'setKeywords');
    });
    afterEach(function () {
      sandbox.restore();
    });

    it('should set single addUnit code', function() {
      const adUnitCode = 'testdiv-abc-ad-123456-0';
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
      const adUnitCodes = ['testdiv1-abc-ad-123456-0', 'testdiv2-abc-ad-123456-0']
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

  describe('getGPTSlotsForAdUnits', () => {
    function mockSlot(path, elId) {
      return {
        getAdUnitPath() {
          return path;
        },
        getSlotElementId() {
          return elId;
        }
      }
    }

    let slots;

    beforeEach(() => {
      slots = [
        mockSlot('slot/1', 'div-1'),
        mockSlot('slot/2', 'div-2'),
        mockSlot('slot/1', 'div-3'),
      ]
    });

    it('can find slots by ad unit path', () => {
      const paths = ['slot/1', 'slot/2']
      expect(getGPTSlotsForAdUnits(paths, null, () => slots)).to.eql({[paths[0]]: [slots[0], slots[2]], [paths[1]]: [slots[1]]});
    })

    it('can find slots by ad element ID', () => {
      const elementIds = ['div-1', 'div-2']
      expect(getGPTSlotsForAdUnits(elementIds, null, () => slots)).to.eql({[elementIds[0]]: [slots[0]], [elementIds[1]]: [slots[1]]});
    })

    it('returns empty list on no match', () => {
      expect(getGPTSlotsForAdUnits(['missing', 'slot/2'], null, () => slots)).to.eql({
        missing: [],
        'slot/2': [slots[1]]
      });
    });

    it('can use customSlotMatching resolving to ad unit codes', () => {
      const csm = (slot) => {
        if (slot.getAdUnitPath() === 'slot/1') {
          return (au) => {
            return au === 'custom'
          }
        }
      }
      expect(getGPTSlotsForAdUnits(['div-2', 'custom'], csm, () => slots)).to.eql({
        'custom': [slots[0], slots[2]],
        'div-2': [slots[1]]
      })
    });

    it('can use customSlotMatching resolving to elementIds', () => {
      const csm = (slot) => {
        if (slot.getSlotElementId() === 'div-1') {
          return (au) => {
            return au === 'custom'
          }
        }
      }
      expect(getGPTSlotsForAdUnits(['div-2', 'custom'], csm, () => slots)).to.eql({
        'custom': [slots[0]],
        'div-2': [slots[1]]
      })
    });

    it('can handle repeated adUnitCodes', () => {
      expect(getGPTSlotsForAdUnits(['div-1', 'div-1'], null, () => slots)).to.eql({
        'div-1': [slots[0]]
      })
    })
  })
});
