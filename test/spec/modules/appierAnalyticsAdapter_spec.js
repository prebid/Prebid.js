import {appierAnalyticsAdapter, detectDevice} from 'modules/appierAnalyticsAdapter';
import {expect} from 'chai';
import * as ajax from 'src/ajax';

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
    'timeToRespond': 600
  },
  'BID1_ADJUSTMENT': {
    'cpm': 0.61590,
    'currency': 'USD',
    'originalCpm': 18.26179,
    'originalCurrency': 'TWD',
  },
  'BID1_TIMEOUT': {
    'cpm': 0.43125,
    'currency': 'USD',
    'originalCpm': 13.15313,
    'originalCurrency': 'TWD',
    'timeToRespond': 2200
  },
  'BID2': {
    'adUnitCode': '/12345678/adunit_2',
    'cpm': 0.43125,
    'currency': 'USD',
    'originalCpm': 13.15313,
    'originalCurrency': 'TWD',
  }
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
    'timeout': timeout
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
  BID_RESPONSE_REGULAR: [
    MOCK_BIDS.BID1,
    Object.assign({}, MOCK_BIDS.BID1, MOCK_BIDS.BID2)
  ],
  BID_RESPONSE_TIMEOUT: [
    Object.assign({}, MOCK_BIDS.BID1, MOCK_BIDS.BID1_TIMEOUT)
  ],
  BID_ADJUSTMENT: [
    Object.assign({}, MOCK_BIDS.BID1, MOCK_BIDS.BID1_ADJUSTMENT)
  ],
  AUCTION_END_REGULAR: {
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
    }],
    'noBids': [],
    'bidsReceived': [],
  },
  AUCTION_END_NOBID: {
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
    }
    ],
    'noBids': [{
      'bidder': bidderCode,
      'adUnitCode': '/12345678/adunit_2',
    }],
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
  BIDDER_DONE: [{
    'bidderCode': bidderCode,
    'bids': [
      MOCK_BIDS.BID1
    ]
  }, {
    'bidderCode': bidderCode,
    'bids': [
      MOCK_BIDS.BID2
    ]
  }],
  BID_TIMEOUT: [
    {
      'bidder': bidderCode,
      'adUnitCode': '/12345678/adunit_2',
      'auctionId': auctionId
    }
  ]
};

describe('Appier Prebid AnalyticsAdapter', function () {
  let requests;
  let cache;

  describe('event tracking and message cache manager', function () {
    let ajaxStub;

    beforeEach(function () {
      requests = [];
      sinon.stub(events, 'getEvents').returns([]);

      ajaxStub = sinon.stub(ajax, 'ajax').callsFake(function (url, callbacks) {
        const fakeResponse = sinon.stub();
        fakeResponse.returns('headerContent');
        callbacks.success('response body', {getResponseHeader: fakeResponse});
      });
    });

    afterEach(function () {
      appierAnalyticsAdapter.disableAnalytics();
      events.getEvents.restore();
      ajaxStub.restore();
    });

    it('should build message correctly for regular bids and prebid won', function () {
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
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK_EVENT.BID_RESPONSE_REGULAR[0]);
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK_EVENT.BID_RESPONSE_REGULAR[1]);
      events.emit(constants.EVENTS.BIDDER_DONE, MOCK_EVENT.BIDDER_DONE[0]);
      events.emit(constants.EVENTS.BIDDER_DONE, MOCK_EVENT.BIDDER_DONE[1]);
      appierAnalyticsAdapter.handleAuctionEndMessage(MOCK_EVENT.AUCTION_END_REGULAR, [MOCK_BIDS.BID1]);
      events.emit(constants.EVENTS.BID_WON, MOCK_EVENT.BID_WON[0]);

      cache = appierAnalyticsAdapter.getCache();

      expect(cache[auctionId].header).to.include.all.keys(
        ['eventId', 'version', 'affiliateId', 'configId', 'referrer', 'device',
          'sampling', 'adSampling', 'prebid', 'timeout', 'start', 'finish']
      );

      expect(cache[auctionId].bids).to.deep.equal({
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
              'prebidWon': true
            }
          },
          '/12345678/adunit_2': {
            'appier': {
              'status': 'bid',
              'isTimeout': false,
              'time': 600,
              'cpm': 0.43125,
              'currency': 'USD',
              'cpmUsd': 0.43125,
              'originalCpm': 13.15313,
              'originalCurrency': 'TWD',
              'prebidWon': false,
            }
          }
        }
      });
      expect(cache[auctionId].ads).to.deep.equal({
        'adUnits': {
          '/12345678/adunit_1': {
            'appier': {
              'ads': '<html lang="en"></html>'
            }
          },
          '/12345678/adunit_2': {
            'appier': {
              'ads': '<html lang="en"></html>'
            }
          }
        }
      });
      expect(cache[auctionId].bidsWon).to.deep.equal({
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

    it('should build message correctly for adjusted bids', function () {
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
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK_EVENT.BID_RESPONSE_REGULAR[0]);
      events.emit(constants.EVENTS.BID_ADJUSTMENT, MOCK_EVENT.BID_ADJUSTMENT[0]);
      events.emit(constants.EVENTS.BIDDER_DONE, MOCK_EVENT.BIDDER_DONE);
      appierAnalyticsAdapter.handleAuctionEndMessage(MOCK_EVENT.AUCTION_END_REGULAR, []);

      cache = appierAnalyticsAdapter.getCache();

      expect(cache[auctionId].bids).to.deep.equal({
        'adUnits': {
          '/12345678/adunit_1': {
            'appier': {
              'status': 'bid',
              'isTimeout': false,
              'time': 600,
              'cpm': 0.61590,
              'currency': 'USD',
              'cpmUsd': 0.61590,
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
    });

    it('should build message correctly for timeout bids and no-response bids', function () {
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
      events.emit(constants.EVENTS.BID_TIMEOUT, MOCK_EVENT.BID_TIMEOUT);
      appierAnalyticsAdapter.handleAuctionEndMessage(MOCK_EVENT.AUCTION_END_REGULAR, []);

      cache = appierAnalyticsAdapter.getCache();

      expect(cache[auctionId].bids).to.deep.equal({
        'adUnits': {
          '/12345678/adunit_1': {
            'appier': {
              'status': 'requested',
              'isTimeout': true
            }
          },
          '/12345678/adunit_2': {
            'appier': {
              'status': 'timeout',
              'isTimeout': true,
            }
          }
        }
      });
    });

    it('should build message correctly for no-bids', function () {
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
      appierAnalyticsAdapter.handleAuctionEndMessage(MOCK_EVENT.AUCTION_END_NOBID, []);

      cache = appierAnalyticsAdapter.getCache();

      expect(cache[auctionId].bids).to.deep.equal({
        'adUnits': {
          '/12345678/adunit_1': {
            'appier': {
              'status': 'requested',
              'isTimeout': true
            }
          },
          '/12345678/adunit_2': {
            'appier': {
              'status': 'noBid',
              'isTimeout': true,
            }
          }
        }
      });
    });

    it('should build message correctly for bids after auction end', function () {
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
      appierAnalyticsAdapter.handleAuctionEndMessage(MOCK_EVENT.AUCTION_END_NOBID, []);
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK_EVENT.BID_RESPONSE_REGULAR[0]);
      events.emit(constants.EVENTS.BIDDER_DONE, MOCK_EVENT.BIDDER_DONE[0]);

      cache = appierAnalyticsAdapter.getCache();

      expect(cache[auctionId].bids).to.deep.equal({
        'adUnits': {
          '/12345678/adunit_1': {
            'appier': {
              'status': 'bid',
              'isTimeout': true,
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
              'status': 'noBid',
              'isTimeout': true,
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

  describe('device detector', function () {
    it('should correctly parse user agents', function () {
      const userAgentsDesktop = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0.3 Safari/605.1.15',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:65.0) Gecko/20100101 Firefox/65.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763',
      ];
      const userAgentsMobile = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 11_2_6 like Mac OS X) AppleWebKit/604.5.6 (KHTML, like Gecko) Version/11.0 Mobile/15D100 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 6.0.1; SM-G532G Build/MMB29T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.83 Mobile Safari/537.36',
      ];
      const userAgentsTablet = [
        'Mozilla/5.0 (iPad; CPU OS 9_3_5 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13G36 Safari/601.1',
      ];

      for (let ua of userAgentsDesktop) {
        expect(detectDevice(ua)).to.deep.equal('desktop');
      }
      for (let ua of userAgentsMobile) {
        expect(detectDevice(ua)).to.deep.equal('mobile');
      }
      for (let ua of userAgentsTablet) {
        expect(detectDevice(ua)).to.deep.equal('tablet');
      }
    });
  });
});
