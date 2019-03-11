import appierAnalyticsAdapter from 'modules/appierAnalyticsAdapter';
import {expect} from 'chai';

const events = require('src/events');
const constants = require('src/constants.json');

const BID = {
  'bidder': 'rubicon',
  'width': 640,
  'height': 480,
  'mediaType': 'video',
  'statusMessage': 'Bid available',
  'bidId': '2ecff0db240757',
  'adId': 'fake_ad_id',
  'source': 'client',
  'requestId': '2ecff0db240757',
  'currency': 'USD',
  'creativeId': '3571560',
  'cpm': 1.22752,
  'ttl': 300,
  'netRevenue': false,
  'ad': '<html></html>',
  'rubiconTargeting': {
    'rpfl_elemid': '/19968336/header-bid-tag-0',
    'rpfl_14062': '2_tier0100'
  },
  'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
  'responseTimestamp': 1519149629415,
  'requestTimestamp': 1519149628471,
  'adUnitCode': '/19968336/header-bid-tag-0',
  'timeToRespond': 944,
  'pbLg': '1.00',
  'pbMg': '1.20',
  'pbHg': '1.22',
  'pbAg': '1.20',
  'pbDg': '1.22',
  'pbCg': '',
  'size': '640x480',
  'adserverTargeting': {
    'hb_bidder': 'rubicon',
    'hb_adid': '2ecff0db240757',
    'hb_pb': 1.20,
    'hb_size': '640x480',
    'hb_source': 'client'
  },
  getStatusCode() {
    return 1;
  }
};

const BID2 = Object.assign({}, BID, {
  adUnitCode: '/19968336/header-bid-tag1',
  bidId: '3bd4ebb1c900e2',
  adId: 'fake_ad_id',
  requestId: '3bd4ebb1c900e2',
  width: 728,
  height: 90,
  mediaType: 'banner',
  cpm: 1.52,
  source: 'server',
  rubiconTargeting: {
    'rpfl_elemid': '/19968336/header-bid-tag1',
    'rpfl_14062': '2_tier0100'
  },
  adserverTargeting: {
    'hb_bidder': 'rubicon',
    'hb_adid': '3bd4ebb1c900e2',
    'hb_pb': '1.500',
    'hb_size': '728x90',
    'hb_source': 'server'
  }
});

const MOCK = {
  SET_TARGETING: {
    [BID.adUnitCode]: BID.adserverTargeting,
    [BID2.adUnitCode]: BID2.adserverTargeting
  },
  AUCTION_INIT: {
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
    'timestamp': 1519767010567,
    'auctionStatus': 'inProgress',
    'adUnits': [ {
      'code': '/19968336/header-bid-tag1',
      'sizes': [[640, 480]],
      'bids': [ {
        'bidder': 'rubicon',
        'params': {
          'accountId': 1001, 'siteId': 113932, 'zoneId': 535512
        }
      } ],
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014'
    }
    ],
    'adUnitCodes': ['/19968336/header-bid-tag1'],
    'bidderRequests': [ {
      'bidderCode': 'rubicon',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
      'bidderRequestId': '1be65d7958826a',
      'bids': [ {
        'bidder': 'rubicon',
        'params': {
          'accountId': 1001, 'siteId': 113932, 'zoneId': 535512
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[640, 480]]
          }
        },
        'adUnitCode': '/19968336/header-bid-tag1',
        'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
        'sizes': [[640, 480]],
        'bidId': '2ecff0db240757',
        'bidderRequestId': '1be65d7958826a',
        'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
        'src': 'client',
        'bidRequestsCount': 1
      }
      ],
      'timeout': 3000,
      'refererInfo': {
        'referer': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
      }
    }
    ],
    'bidsReceived': [],
    'winningBids': [],
    'timeout': 3000,
    'config': {
      'accountId': 1001, 'endpoint': '//localhost:9999/event'
    }
  },
  BID_REQUESTED: {
    'bidder': 'rubicon',
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
    'bidderRequestId': '1be65d7958826a',
    'bids': [
      {
        'bidder': 'rubicon',
        'params': {
          'accountId': '1001',
          'siteId': '70608',
          'zoneId': '335918',
          'userId': '12346',
          'keywords': ['a', 'b', 'c'],
          'inventory': 'test',
          'visitor': {'ucat': 'new', 'lastsearch': 'iphone'},
          'position': 'btf',
          'video': {
            'language': 'en',
            'playerHeight': 480,
            'playerWidth': 640,
            'size_id': 203,
            'skip': 1,
            'skipdelay': 15,
            'aeParams': {
              'p_aso.video.ext.skip': '1',
              'p_aso.video.ext.skipdelay': '15'
            }
          }
        },
        'mediaType': 'video',
        'adUnitCode': '/19968336/header-bid-tag-0',
        'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
        'sizes': [[640, 480]],
        'bidId': '2ecff0db240757',
        'bidderRequestId': '1be65d7958826a',
        'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
      },
      {
        'bidder': 'rubicon',
        'params': {
          'accountId': '14062',
          'siteId': '70608',
          'zoneId': '335918',
          'userId': '12346',
          'keywords': ['a', 'b', 'c'],
          'inventory': {'rating': '4-star', 'prodtype': 'tech'},
          'visitor': {'ucat': 'new', 'lastsearch': 'iphone'},
          'position': 'atf'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[1000, 300], [970, 250], [728, 90]]
          }
        },
        'adUnitCode': '/19968336/header-bid-tag1',
        'transactionId': 'c116413c-9e3f-401a-bee1-d56aec29a1d4',
        'sizes': [[1000, 300], [970, 250], [728, 90]],
        'bidId': '3bd4ebb1c900e2',
        'bidderRequestId': '1be65d7958826a',
        'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
      }
    ],
    'auctionStart': 1519149536560,
    'timeout': 5000,
    'start': 1519149562216
  },
  BID_RESPONSE: [
    BID,
    BID2
  ],
  AUCTION_END: {
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
  },
  BID_WON: [
    Object.assign({}, BID, {
      'status': 'rendered'
    }),
    Object.assign({}, BID2, {
      'status': 'rendered'
    })
  ],
  BIDDER_DONE: {
    'bidderCode': 'rubicon',
    'bids': [
      BID,
      Object.assign({}, BID2, {
        'serverResponseTimeMs': 42,
      })
    ]
  },
  BID_TIMEOUT: [
    {
      'bidId': '2ecff0db240757',
      'bidder': 'rubicon',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
    }
  ]
};

describe('Appier Prebid Analytic', function () {
  const affiliateId = 'WhctHaViHtI';
  const configId = 'd9cc9a9b-e9b2-40ed-a17c-f1c9a8a4b29c';
  const serverUrl = 'https://analytics.server.url/v1';
  const autoPick = 'none';

  let xhr;
  let requests;

  let auctionId = '0ea14159-2058-4b87-a966-9d7652176a56';
  let timeout = 1000;
  let auctionStart = Date.now();

  let bidder = 'bidder1';
  let bidAdUnit = 'div_with_bid';
  let noBidAdUnit = 'div_no_bid';
  let bidAfterTimeoutAdUnit = 'div_after_timeout';

  let auctionInit = {
    timestamp: auctionStart,
    auctionId: auctionId,
    timeout: timeout
  };

  let bidRequested = {
    auctionId: auctionId,
    bidderCode: bidder,
    bids: [
      {
        adUnitCode: bidAdUnit,
        auctionId: auctionId,
        bidder: bidder,
        startTime: auctionStart + 50,
      },
      {
        adUnitCode: bidAfterTimeoutAdUnit,
        auctionId: auctionId,
        bidder: bidder,
        startTime: auctionStart + 70,
      },
      {
        adUnitCode: noBidAdUnit,
        auctionId: auctionId,
        bidder: bidder,
        startTime: auctionStart + 90,
      }
    ],
    start: auctionStart,
    timeout: timeout
  };

  let bidAdjustmentWithBid = {
    ad: 'html',
    adUnitCode: bidAdUnit,
    auctionId: auctionId,
    bidder: bidder,
    bidderCode: bidder,
    cpm: 1.01,
    currency: 'USD',
    requestTimestamp: auctionStart + 50,
    responseTimestamp: auctionStart + 50 + 421,
    status: 'rendered',
    statusMessage: 'Bid available',
    timeToRespond: 421,
  };

  let bidAdjustmentAfterTimeout = {
    ad: 'html',
    adUnitCode: bidAfterTimeoutAdUnit,
    auctionId: auctionId,
    bidder: bidder,
    bidderCode: bidder,
    cpm: 2.02,
    currency: 'USD',
    requestTimestamp: auctionStart + 70,
    responseTimestamp: auctionStart + 70 + 6141,
    status: 'rendered',
    statusMessage: 'Bid available',
    timeToRespond: 6141,
  };

  let bidAdjustmentNoBid = {
    ad: 'html',
    adUnitCode: noBidAdUnit,
    auctionId: auctionId,
    bidder: bidder,
    bidderCode: bidder,
    cpm: 0,
    currency: 'USD',
    requestTimestamp: auctionStart + 90,
    responseTimestamp: auctionStart + 90 + 215,
    status: 'rendered',
    statusMessage: 'Bid available',
    timeToRespond: 215,
  };

  let bidResponseWithBid = bidAdjustmentWithBid;

  let auctionEnd = {
    auctionId: auctionId
  };

  let bidTimeout = [
    {
      adUnitCode: bidAfterTimeoutAdUnit,
      auctionId: auctionId,
      bidder: bidder,
      timeout: timeout
    }
  ];

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
      // events.emit(constants.EVENTS.BID_ADJUSTMENT, MOCK.BID_ADJUSTMENT);
      events.emit(constants.EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE);
      // events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentNoBid);
      // events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeout);
      events.emit(constants.EVENTS.AUCTION_END, MOCK.AUCTION_END);
      events.emit(constants.EVENTS.BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(constants.EVENTS.BID_WON, MOCK.BID_WON);
      const cache = appierAnalyticsAdapter.getCacheManager();
      console.log(JSON.stringify(cache));
    });
  });

  // describe('should build and send events correctly', function () {
  //   beforeEach(function () {
  //     requests = [];
  //     sinon.stub(events, 'getEvents').returns([]);
  //   });
  //   afterEach(function () {
  //     appierAnalyticsAdapter.disableAnalytics();
  //     events.getEvents.restore();
  //   });
  //   it('should send prepared events to backend', function () {
  //     appierAnalyticsAdapter.enableAnalytics({
  //       provider: 'appierAnalytics',
  //       options: {
  //         publisherId: publisherId,
  //         configServer: appierConfigServerUrl,
  //         server: appierEventServerUrl
  //       }
  //     });
  //
  //     expect(requests.length).to.equal(1);
  //     expect(requests[0].url).to.equal('//' + appierConfigServerUrl + '/c?publisherId=' + publisherId + '&host=localhost');
  //     requests[0].respond(200, {'Content-Type': 'application/json'}, '{"a": 1, "i": 1, "bat": 1}');
  //
  //     events.emit(constants.EVENTS.AUCTION_INIT, auctionInit);
  //     events.emit(constants.EVENTS.BID_REQUESTED, bidRequested);
  //     events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentWithBid);
  //     events.emit(constants.EVENTS.BID_RESPONSE, bidResponseWithBid);
  //     events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentNoBid);
  //     events.emit(constants.EVENTS.BID_RESPONSE, bidResponseNoBid);
  //     events.emit(constants.EVENTS.BID_TIMEOUT, bidTimeout);
  //     events.emit(constants.EVENTS.AUCTION_END, auctionEnd);
  //     events.emit(constants.EVENTS.BID_ADJUSTMENT, bidAdjustmentAfterTimeout);
  //     events.emit(constants.EVENTS.BID_RESPONSE, bidResponseAfterTimeout);
  //     events.emit(constants.EVENTS.BIDDER_DONE, bidderDone);
  //     events.emit(constants.EVENTS.BID_WON, bidWon);
  //
  //     expect(requests.length).to.equal(4);
  //
  //     expect(requests[1].url).to.equal('//' + appierEventServerUrl + '/a?publisherId=' + publisherId + '&host=localhost');
  //     expect(requests[2].url).to.equal('//' + appierEventServerUrl + '/bat?publisherId=' + publisherId + '&host=localhost');
  //     expect(requests[3].url).to.equal('//' + appierEventServerUrl + '/i?publisherId=' + publisherId + '&host=localhost');
  //
  //     let auction = JSON.parse(requests[1].requestBody);
  //     expect(auction).to.include.all.keys('event', 'eventName', 'options', 'data');
  //     expect(auction.event).to.equal('a');
  //
  //     expect(auction.data).to.include.all.keys('id', 'start', 'finish', 'timeout', 'adUnits');
  //     expect(auction.data.id).to.equal(auctionId);
  //     expect(auction.data.timeout).to.equal(timeout);
  //
  //     expect(auction.data.adUnits).to.include.all.keys(bidAdUnit, bidAfterTimeoutAdUnit, noBidAdUnit);
  //     expect(auction.data.adUnits[bidAdUnit].bidders).to.have.property(bidder);
  //     expect(auction.data.adUnits[bidAfterTimeoutAdUnit].bidders).to.have.property(bidder);
  //     expect(auction.data.adUnits[noBidAdUnit].bidders).to.have.property(bidder);
  //
  //     expect(auction.data.adUnits[bidAdUnit].bidders[bidder].status).to.equal('bid');
  //     expect(auction.data.adUnits[bidAfterTimeoutAdUnit].bidders[bidder].status).to.equal('timeout');
  //     expect(auction.data.adUnits[noBidAdUnit].bidders[bidder].status).to.equal('noBid');
  //
  //     let bidAfterTimeout = JSON.parse(requests[2].requestBody);
  //     expect(bidAfterTimeout).to.include.all.keys('event', 'eventName', 'options', 'data');
  //     expect(bidAfterTimeout.event).to.equal('bat');
  //
  //     expect(bidAfterTimeout.data).to.include.all.keys('start', 'finish', 'mediaType', 'adUnit', 'bidder', 'cpm', 'size', 'auction');
  //     expect(bidAfterTimeout.data.adUnit).to.equal(bidAfterTimeoutAdUnit);
  //     expect(bidAfterTimeout.data.bidder).to.equal(bidder);
  //     expect(bidAfterTimeout.data.cpm).to.equal(bidAdjustmentAfterTimeout.cpm);
  //
  //     let impression = JSON.parse(requests[3].requestBody);
  //     expect(impression).to.include.all.keys('event', 'eventName', 'options', 'data');
  //     expect(impression.event).to.equal('i');
  //
  //     expect(impression.data).to.include.all.keys('mediaType', 'adUnit', 'bidder', 'cpm', 'size', 'auction', 'isNew');
  //     expect(impression.data.adUnit).to.equal(bidAdUnit);
  //     expect(impression.data.bidder).to.equal(bidder);
  //     expect(impression.data.cpm).to.equal(bidAdjustmentWithBid.cpm);
  //   });
  // });

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
