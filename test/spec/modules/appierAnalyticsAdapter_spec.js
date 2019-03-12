import appierAnalyticsAdapter from 'modules/appierAnalyticsAdapter';
import {expect} from 'chai';

const events = require('src/events');
const constants = require('src/constants.json');

const affiliateId = 'WhctHaViHtI';
const configId = 'd9cc9a9b-e9b2-40ed-a17c-f1c9a8a4b29c';
const serverUrl = 'https://analytics.server.url/v1';
const autoPick = 'none';
const hzid = 'WhctHaV9';
const auctionId = 'b0b39610-b941-4659-a87c-de9f62d3e13e';
const bidderCode = 'appier';
const timeout = 2000;
const auctionStart = Date.now();

const MOCK_BIDS = {
  'BID1': {
    'auctionId': auctionId,
    'adUnitCode': '/12345678/adunit_1',
    'bidder': bidderCode,
    'width': 300,
    'height': 250,
    'cpm': 0.59878,
    'currency': 'USD',
    'originalCpm': 18.26179,
    'originalCurrency': 'TWD',
    'ad': '<html lang="en"></html>',
    'responseTimestamp': auctionStart,
    'requestTimestamp': auctionStart + 600,
    'timeToRespond': 600,
    'bidId': 'xxxxx',
  },
  'BID1_ADJUSTMENT': Object.assign({}, this.BID1, {
    'cpm': 0.61590,
    'currency': 'USD',
    'originalCpm': 18.78495,
    'originalCurrency': 'TWD',
  }),
  'BID2': Object.assign({}, this.BID1, {
    'adUnitCode': '/12345678/adunit_2',
    'cpm': 0.43125,
    'currency': 'USD',
    'originalCpm': 13.15313,
    'originalCurrency': 'TWD',
  })

};

const MOCK_EVENT = {
  AUCTION_INIT: {
    'auctionId': auctionId,
    'timestamp': auctionStart,
    'auctionStatus': 'inProgress',
    'adUnits': [{
      'code': '/12345678/adunit_1',
      'bids': [{
        'bidder': bidderCode,
        'params': {
          'hzid': hzid
        }
      }]
    }, {
      'code': '/12345678/adunit_2',
      'bids': [{
        'bidder': bidderCode,
        'params': {
          'hzid': hzid
        }
      }]
    }
    ],
    'adUnitCodes': ['/12345678/adunit_1', '/12345678/adunit_2'],
    'bidderRequests': [{
      'bidderCode': bidderCode,
      'auctionId': auctionId,
      'bids': [{
        'bidder': bidderCode,
        'params': {
          'hzid': hzid
        },
        'adUnitCode': '/12345678/adunit_1',
        'auctionId': auctionId,
      }, {
        'bidder': bidderCode,
        'params': {
          'hzid': hzid
        },
        'adUnitCode': '/12345678/adunit_2',
        'auctionId': auctionId,
      }
      ],
      'timeout': timeout,
    }
    ],
    'bidsReceived': [],
    'winningBids': [],
    'timeout': timeout,
    'config': {
      'affiliateId': affiliateId,
      'configId': configId
    }
  },
  BID_REQUESTED: {
    'bidder': bidderCode,
    'auctionId': auctionId,
    'bids': [
      {
        'bidder': bidderCode,
        'params': {
          'hzid': hzid
        },
        'adUnitCode': '/12345678/adunit_1',
        'auctionId': auctionId
      }, {
        'bidder': bidderCode,
        'params': {
          'hzid': hzid
        },
        'adUnitCode': '/12345678/adunit_2',
        'auctionId': auctionId
      }
    ],
    'auctionStart': auctionStart,
    'timeout': timeout,
    'start': auctionStart + 50
  },
  BID_RESPONSE: [
    MOCK_BIDS.BID1,
    MOCK_BIDS.BID2
  ],
  BID_ADJUSTMENT: [
    MOCK_BIDS.BID1_ADJUSTMENT
  ],
  AUCTION_END: {
    'auctionId': auctionId,
    'finish': auctionStart + 900,
    'adUnits': [{
      'code': '/12345678/adunit_1',
      'bids': [{
        'bidder': bidderCode,
        'params': {
          'hzid': hzid
        }
      }]
    }, {
      'code': '/12345678/adunit_2',
      'bids': [{
        'bidder': bidderCode,
        'params': {
          'hzid': hzid
        }
      }]
    }
    ],
    'noBids': [],
    'bidsReceived': [],

  },
  BID_WON: [
    Object.assign({}, MOCK_BIDS.BID1, {
      'status': 'rendered'
    }),
    Object.assign({}, MOCK_BIDS.BID2, {
      'status': 'rendered'
    })
  ],
  BIDDER_DONE: {
    'bidderCode': bidderCode,
    'bids': [
      MOCK_BIDS.BID1,
      MOCK_BIDS.BID2
    ]
  },
  BID_TIMEOUT: [
    {
      'bidder': bidderCode,
      'adUnitCode': '/12345678/adunit_1',
      'auctionId': auctionId
    }
  ]
};

describe('Appier Prebid AnalyticsAdapter', function () {
  let xhr;
  let requests;

  before(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = request => requests.push(request);
  });
  after(function () {
    xhr.restore();
  });

  describe('event tracking and message cache manager', function () {
    beforeEach(function () {
      requests = [];
      sinon.stub(events, 'getEvents').returns([]);
      // getHighestCpmBids = sinon.stub(pbjs, 'getHighestCpmBids').returns([MOCK_BIDS.BID1]);
      // ajaxStub = sinon.stub(ajax, 'ajax').returns({"code": 200});
    });
    afterEach(function () {
      appierAnalyticsAdapter.disableAnalytics();
      events.getEvents.restore();
      // getHighestCpmBids.restore();
      // ajaxStub.restore();
    });

    it('should build message correctly for regular bids', function () {
      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: {
          affiliateId: affiliateId,
          configId: configId,
          sampling: 1,
          adSampling: 1
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, MOCK_EVENT.AUCTION_INIT);
      events.emit(constants.EVENTS.BID_REQUESTED, MOCK_EVENT.BID_REQUESTED);
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK_EVENT.BID_RESPONSE[0]);
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK_EVENT.BID_RESPONSE[1]);
      events.emit(constants.EVENTS.BIDDER_DONE, MOCK_EVENT.BIDDER_DONE);
      // events.emit(constants.EVENTS.AUCTION_END, MOCK_EVENT.AUCTION_END);
      appierAnalyticsAdapter.updateAuctionEndMessage(MOCK_EVENT.AUCTION_END);
      events.emit(constants.EVENTS.BID_WON, MOCK_EVENT.BID_WON[0]);

      const cache = appierAnalyticsAdapter.getCacheManager();

      expect(cache.cache[auctionId].header).to.include.all.keys(
        ['eventId', 'version', 'affiliateId', 'configId', 'referrer', 'device',
          'sampling', 'adSampling', 'prebid', 'timeout', 'start', 'finish']
      );

      expect(cache.cache[auctionId].bids).to.deep.equal({
        'adUnits': {
          '/12345678/adunit_1': {
            'appier': {
              'status': 'bid',
              'isTimeout': false,
              'time': 600,
              'cpm': 0.59878,
              'currency': 'USD',
              'cpmUsd': 0.59878,
              'originalCpm': 18.26179,
              'originalCurrency': 'TWD',
              'prebidWon': false
            }
          },
          '/12345678/adunit_2': {
            'appier': {
              'status': 'requested',
              'isTimeout': true,
            }
          }
        }
      });
      expect(cache.cache[auctionId].ads).to.deep.equal({
        'adUnits': {
          '/12345678/adunit_1': {
            'appier': {
              'ads': '<html lang="en"></html>'
            }
          }
        }
      });

      expect(cache.cache[auctionId].bidsWon).to.deep.equal({
        'adUnits': {
          '/12345678/adunit_1': {
            'appier': {
              'time': 600,
              'status': 'bidWon',
              'cpm': 0.59878,
              'currency': 'USD',
              'originalCpm': 18.26179,
              'originalCurrency': 'TWD',
              'cpmUsd': 0.59878,
              'isTimeout': false,
              'prebidWon': true
            }
          }
        }
      });
    });
  });

  describe('enableAnalytics and config parser', function () {
    beforeEach(function () {
      requests = [];
      sinon.stub(events, 'getEvents').returns([]);
    });

    afterEach(function () {
      appierAnalyticsAdapter.disableAnalytics();
      events.getEvents.restore();
    });

    it('should parse config correctly with minimum required options', function () {
      let configOptions = {
        affiliateId: affiliateId,
        configId: configId,
      };

      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });

      expect(appierAnalyticsAdapter.getAnalyticsOptions().options).to.deep.equal(configOptions);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().affiliateId).to.equal(configOptions.affiliateId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().configId).to.equal(configOptions.configId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().server).to.equal('https://prebid-analytics.c.appier.net/v1');
      expect(appierAnalyticsAdapter.getAnalyticsOptions().autoPick).to.equal(null);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(true);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().adSampled).to.equal(false);
    });

    it('should parse config correctly with optional values', function () {
      let configOptions = {
        affiliateId: affiliateId,
        configId: configId,
        server: serverUrl,
        autoPick: autoPick,
        sampling: 0,
        adSampling: 1,
      };

      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });

      expect(appierAnalyticsAdapter.getAnalyticsOptions().options).to.deep.equal(configOptions);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().affiliateId).to.equal(configOptions.affiliateId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().configId).to.equal(configOptions.configId);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().server).to.equal(configOptions.server);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().autoPick).to.equal(configOptions.autoPick);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(false);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().adSampled).to.equal(true);
    });

    it('should not enable Analytics when affiliateId is missing', function () {
      let configOptions = {
        options: {
          configId: configId
        }
      };
      let validConfig = appierAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });

    it('should not enable Analytics when configId is missing', function () {
      let configOptions = {
        options: {
          affiliateId: affiliateId
        }
      };
      let validConfig = appierAnalyticsAdapter.initConfig(configOptions);
      expect(validConfig).to.equal(false);
    });

    it('should fall back to default value when sampling factor is not number', function () {
      let configOptions = {
        options: {
          affiliateId: affiliateId,
          configId: configId,
          sampling: 'string',
          adSampling: 'string'
        }
      };
      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: configOptions
      });

      expect(appierAnalyticsAdapter.getAnalyticsOptions().sampled).to.equal(false);
      expect(appierAnalyticsAdapter.getAnalyticsOptions().adSampled).to.equal(true);
    });
  });
});
