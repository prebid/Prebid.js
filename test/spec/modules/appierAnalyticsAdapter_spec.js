import appierAnalyticsAdapter from 'modules/appierAnalyticsAdapter';
import {expect} from 'chai';

const events = require('src/events');
const constants = require('src/constants.json');

const auctionId = 'b0b39610-b941-4659-a87c-de9f62d3e13e';
const bidderCode = 'appier';
const timeout = 1000;

const BID1 = {
  'auctionId': auctionId,
  'adUnitCode': '/12345678/adunit_1',
  'bidder': bidderCode,
  'width': 300,
  'height': 250,
  'cpm': 0.59878,
  'currency': 'USD',
  'originalCpm': 18.26179,
  'originalCurrency': 'TWD',
  'ad': '<html></html>',
  'responseTimestamp': 1519149629415,
  'requestTimestamp': 1519149628471,
  'timeToRespond': 944,
};

const BID1_ADJUSTMENT = Object.assign({}, BID1, {
  adUnitCode: '/12345678/adunit_1',
  'cpm': 0.61590,
  'currency': 'USD',
  'originalCpm': 18.78495,
  'originalCurrency': 'TWD',
});

const BID2 = Object.assign({}, BID1, {
  adUnitCode: '/12345678/adunit_2',
  'cpm': 0.43125,
  'currency': 'USD',
  'originalCpm': 13.15313,
  'originalCurrency': 'TWD',
});

const MOCK = {
  AUCTION_INIT: {
    'auctionId': auctionId,
    'timestamp': 1519767010567,
    'auctionStatus': 'inProgress',
    'adUnits': [{
      'code': '/12345678/adunit_1',
      'bids': [{
        'bidder': bidderCode,
        'params': {
          'hzid': 'WhctHaViHtI'
        }
      }]
    }
    ],
    'adUnitCodes': ['/12345678/adunit_1'],
    'bidderRequests': [{
      'bidderCode': bidderCode,
      'auctionId': auctionId,
      'bids': [{
        'bidder': bidderCode,
        'params': {
          'hzid': 'WhctHaViHtI'
        },
        'adUnitCode': '/12345678/adunit_1',
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
      'affiliateId': 'WhctHaViHtI',
      'configId': '5bc06509-129f-4204-b214-dd85089fe0d9'
    }
  },
  BID_REQUESTED: {
    'bidder': bidderCode,
    'auctionId': auctionId,
    'bids': [
      {
        'bidder': bidderCode,
        'params': {
          'hzid': 'WhctHaViHtI'
        },
        'adUnitCode': '/12345678/adunit_1',
        'auctionId': auctionId
      },
      {
        'bidder': bidderCode,
        'params': {
          'hzid': 'WhctHaViHtI'
        },
        'adUnitCode': '/12345678/adunit_2',
        'auctionId': auctionId
      },
    ],
    'auctionStart': 1519149536560,
    'timeout': timeout,
    'start': 1519149562216
  },
  BID_RESPONSE: [
    BID1,
    BID2
  ],
  BID_ADJUSTMENT: [
    BID1_ADJUSTMENT
  ],
  AUCTION_END: {
    'auctionId': auctionId,
    'finish': 1519767011567,
    'adUnits': [{
      'code': '/12345678/adunit_1',
      'bids': [{
        'bidder': bidderCode,
        'params': {
          'hzid': 'WhctHaViHtI'
        }
      }]
    }
    ],
    'noBids': [],
    'bidsReceived': [],

  },
  BID_WON: [
    Object.assign({}, BID1, {
      'status': 'rendered'
    }),
    Object.assign({}, BID2, {
      'status': 'rendered'
    })
  ],
  BIDDER_DONE: {
    'bidderCode': bidderCode,
    'bids': [
      BID1,
      BID2
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

const expectedCacheBids = {
  'adUnits': {
    '/12345678/adunit_1': {
      'appier': {
        'status': 'timeout',
        'isTimeout': true,
        'time': 944,
        'cpm': 0.59878,
        'currency': 'USD',
        'originalCpm': 18.26179,
        'cpmUsd': 0.59878,
        'originalCurrency': 'TWD',
        'prebidWon': false
      }
    }
  }
};

const expectedCacheHeader = {
  'eventId': auctionId,
  'version': '0.1.0',
  'affiliateId': 'WhctHaViHtI',
  'configId': 'd9cc9a9b-e9b2-40ed-a17c-f1c9a8a4b29c',
  'referrer': 'http://localhost:9876/context.html',
  'device': 'desktop',
  'sampling': 1,
  'adSampling': 1,
  'prebid': '2.4.0-pre',
  'timeout': 1000,
  'start': 1519767010567,
  'finish': 1552273100841
};

const expectedCacheAds = {
  'adUnits': {
    '/12345678/adunit_1': {
      'appier': {
        'ads': '<html></html>'
      }
    }
  }
};

const expectedCacheBidsWon = {
  'adUnits': {
    '/12345678/adunit_1': {
      'appier': {
        'time': 944,
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
};

describe('Appier Prebid AnalyticsAdapter', function () {
  const affiliateId = 'WhctHaViHtI';
  const configId = 'd9cc9a9b-e9b2-40ed-a17c-f1c9a8a4b29c';
  const serverUrl = 'https://analytics.server.url/v1';
  const autoPick = 'none';

  let xhr;
  let requests;

  // let auctionStart = Date.now();

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
    });
    afterEach(function () {
      appierAnalyticsAdapter.disableAnalytics();
      events.getEvents.restore();
    });

    it('should build message correctly', function () {
      appierAnalyticsAdapter.enableAnalytics({
        provider: 'appierAnalytics',
        options: {
          affiliateId: affiliateId,
          configId: configId,
          sampling: 1,
          adSampling: 1
        }
      });

      events.emit(constants.EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(constants.EVENTS.BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, MOCK.BID_ADJUSTMENT);
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(constants.EVENTS.BID_TIMEOUT, MOCK.BID_TIMEOUT);

      // events.emit(constants.EVENTS.AUCTION_END, MOCK.AUCTION_END);
      appierAnalyticsAdapter.updateAuctionEndMessage(MOCK.AUCTION_END);

      events.emit(constants.EVENTS.BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(constants.EVENTS.BID_WON, MOCK.BID_WON[0]);

      const cache = appierAnalyticsAdapter.getCacheManager();

      expect(cache.cache[auctionId].header).to.include.all.keys(Object.keys(expectedCacheHeader));
      expect(cache.cache[auctionId].bids).to.deep.equal(expectedCacheBids);
      expect(cache.cache[auctionId].ads).to.deep.equal(expectedCacheAds);
      expect(cache.cache[auctionId].bidsWon).to.deep.equal(expectedCacheBidsWon);
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
  });
});
