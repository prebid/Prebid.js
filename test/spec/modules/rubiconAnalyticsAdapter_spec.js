import rubiconAnalyticsAdapter, { SEND_TIMEOUT, parseBidResponse } from 'modules/rubiconAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config';

import {
  setConfig,
  addBidResponseHook,
} from 'modules/currency';

let Ajv = require('ajv');
let schema = require('./rubiconAnalyticsSchema.json');
let ajv = new Ajv({
  allErrors: true
});

let validator = ajv.compile(schema);

function validate(message) {
  validator(message);
  expect(validator.errors).to.deep.equal(null);
}

// using es6 "import * as events from 'src/events'" causes the events.getEvents stub not to work...
let events = require('src/events');
let ajax = require('src/ajax');
let utils = require('src/utils');

const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BIDDER_DONE,
    BID_WON,
    BID_TIMEOUT,
    SET_TARGETING
  }
} = CONSTANTS;

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
  seatBidId: 'aaaa-bbbb-cccc-dddd',
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
        'seatBidId': 'aaaa-bbbb-cccc-dddd',
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

const ANALYTICS_MESSAGE = {
  'eventTimeMillis': 1519767013781,
  'integration': 'pbjs',
  'version': '$prebid.version$',
  'referrerUri': 'http://www.test.com/page.html',
  'auctions': [
    {
      'clientTimeoutMillis': 3000,
      'serverTimeoutMillis': 1000,
      'accountId': 1001,
      'samplingFactor': 1,
      'adUnits': [
        {
          'adUnitCode': '/19968336/header-bid-tag-0',
          'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
          'videoAdFormat': 'outstream',
          'mediaTypes': [
            'video'
          ],
          'dimensions': [
            {
              'width': 640,
              'height': 480
            }
          ],
          'status': 'success',
          'accountId': 1001,
          'siteId': 70608,
          'zoneId': 335918,
          'adserverTargeting': {
            'hb_bidder': 'rubicon',
            'hb_adid': '2ecff0db240757',
            'hb_pb': '1.200',
            'hb_size': '640x480',
            'hb_source': 'client'
          },
          'bids': [
            {
              'bidder': 'rubicon',
              'bidId': '2ecff0db240757',
              'status': 'success',
              'source': 'client',
              'clientLatencyMillis': 3214,
              'params': {
                'accountId': '1001',
                'siteId': '70608',
                'zoneId': '335918'
              },
              'bidResponse': {
                'bidPriceUSD': 1.22752,
                'dimensions': {
                  'width': 640,
                  'height': 480
                },
                'mediaType': 'video'
              }
            }
          ]
        },
        {
          'adUnitCode': '/19968336/header-bid-tag1',
          'transactionId': 'c116413c-9e3f-401a-bee1-d56aec29a1d4',
          'mediaTypes': [
            'banner'
          ],
          'dimensions': [
            {
              'width': 1000,
              'height': 300
            },
            {
              'width': 970,
              'height': 250
            },
            {
              'width': 728,
              'height': 90
            }
          ],
          'status': 'success',
          'adserverTargeting': {
            'hb_bidder': 'rubicon',
            'hb_adid': '3bd4ebb1c900e2',
            'hb_pb': '1.500',
            'hb_size': '728x90',
            'hb_source': 'server'
          },
          'bids': [
            {
              'bidder': 'rubicon',
              'bidId': 'aaaa-bbbb-cccc-dddd',
              'status': 'success',
              'source': 'server',
              'clientLatencyMillis': 3214,
              'serverLatencyMillis': 42,
              'params': {
                'accountId': '14062',
                'siteId': '70608',
                'zoneId': '335918'
              },
              'bidResponse': {
                'bidPriceUSD': 1.52,
                'dimensions': {
                  'width': 728,
                  'height': 90
                },
                'mediaType': 'banner'
              }
            }
          ]
        }
      ]
    }
  ],
  'bidsWon': [
    {
      'bidder': 'rubicon',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'bidId': '2ecff0db240757',
      'status': 'success',
      'source': 'client',
      'clientLatencyMillis': 3214,
      'samplingFactor': 1,
      'accountId': 1001,
      'siteId': 70608,
      'zoneId': 335918,
      'params': {
        'accountId': '1001',
        'siteId': '70608',
        'zoneId': '335918'
      },
      'videoAdFormat': 'outstream',
      'mediaTypes': [
        'video'
      ],
      'adserverTargeting': {
        'hb_bidder': 'rubicon',
        'hb_adid': '2ecff0db240757',
        'hb_pb': '1.200',
        'hb_size': '640x480',
        'hb_source': 'client'
      },
      'bidResponse': {
        'bidPriceUSD': 1.22752,
        'dimensions': {
          'width': 640,
          'height': 480
        },
        'mediaType': 'video'
      },
      'bidwonStatus': 'success'
    },
    {
      'bidder': 'rubicon',
      'transactionId': 'c116413c-9e3f-401a-bee1-d56aec29a1d4',
      'adUnitCode': '/19968336/header-bid-tag1',
      'bidId': 'aaaa-bbbb-cccc-dddd',
      'status': 'success',
      'source': 'server',
      'clientLatencyMillis': 3214,
      'serverLatencyMillis': 42,
      'samplingFactor': 1,
      'accountId': 1001,
      'params': {
        'accountId': '14062',
        'siteId': '70608',
        'zoneId': '335918'
      },
      'mediaTypes': [
        'banner'
      ],
      'adserverTargeting': {
        'hb_bidder': 'rubicon',
        'hb_adid': '3bd4ebb1c900e2',
        'hb_pb': '1.500',
        'hb_size': '728x90',
        'hb_source': 'server'
      },
      'bidResponse': {
        'bidPriceUSD': 1.52,
        'dimensions': {
          'width': 728,
          'height': 90
        },
        'mediaType': 'banner'
      },
      'bidwonStatus': 'success'
    }
  ],
  'wrapperName': '10000_fakewrapper_test'
};

function performStandardAuction() {
  events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
  events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
  events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
  events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
  events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
  events.emit(AUCTION_END, MOCK.AUCTION_END);
  events.emit(SET_TARGETING, MOCK.SET_TARGETING);
  events.emit(BID_WON, MOCK.BID_WON[0]);
  events.emit(BID_WON, MOCK.BID_WON[1]);
}

describe('rubicon analytics adapter', function () {
  let sandbox;
  let xhr;
  let requests;
  let oldScreen;
  let clock;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    xhr = sandbox.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);

    sandbox.stub(events, 'getEvents').returns([]);

    sandbox.stub(utils, 'getTopWindowUrl').returns('http://www.test.com/page.html');

    clock = sandbox.useFakeTimers(1519767013781);

    config.setConfig({
      s2sConfig: {
        timeout: 1000,
        accountId: 10000,
      },
      rubicon: {
        wrapperName: '10000_fakewrapper_test'
      }
    })
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  it('should require accountId', function () {
    sandbox.stub(utils, 'logError');

    rubiconAnalyticsAdapter.enableAnalytics({
      options: {
        endpoint: '//localhost:9999/event'
      }
    });

    expect(utils.logError.called).to.equal(true);
  });

  it('should require endpoint', function () {
    sandbox.stub(utils, 'logError');

    rubiconAnalyticsAdapter.enableAnalytics({
      options: {
        accountId: 1001
      }
    });

    expect(utils.logError.called).to.equal(true);
  });

  describe('sampling', function () {
    beforeEach(function () {
      sandbox.stub(Math, 'random').returns(0.08);
      sandbox.stub(utils, 'logError');
    });

    afterEach(function () {
      rubiconAnalyticsAdapter.disableAnalytics();
    });

    describe('with options.samplingFactor', function () {
      it('should sample', function () {
        rubiconAnalyticsAdapter.enableAnalytics({
          options: {
            endpoint: '//localhost:9999/event',
            accountId: 1001,
            samplingFactor: 10
          }
        });

        performStandardAuction();

        expect(requests.length).to.equal(1);
      });

      it('should unsample', function () {
        rubiconAnalyticsAdapter.enableAnalytics({
          options: {
            endpoint: '//localhost:9999/event',
            accountId: 1001,
            samplingFactor: 20
          }
        });

        performStandardAuction();

        expect(requests.length).to.equal(0);
      });

      it('should throw errors for invalid samplingFactor', function () {
        rubiconAnalyticsAdapter.enableAnalytics({
          options: {
            endpoint: '//localhost:9999/event',
            accountId: 1001,
            samplingFactor: 30
          }
        });

        performStandardAuction();

        expect(requests.length).to.equal(0);
        expect(utils.logError.called).to.equal(true);
      });
    });
    describe('with options.sampling', function () {
      it('should sample', function () {
        rubiconAnalyticsAdapter.enableAnalytics({
          options: {
            endpoint: '//localhost:9999/event',
            accountId: 1001,
            sampling: 0.1
          }
        });

        performStandardAuction();

        expect(requests.length).to.equal(1);
      });

      it('should unsample', function () {
        rubiconAnalyticsAdapter.enableAnalytics({
          options: {
            endpoint: '//localhost:9999/event',
            accountId: 1001,
            sampling: 0.05
          }
        });

        performStandardAuction();

        expect(requests.length).to.equal(0);
      });

      it('should throw errors for invalid samplingFactor', function () {
        rubiconAnalyticsAdapter.enableAnalytics({
          options: {
            endpoint: '//localhost:9999/event',
            accountId: 1001,
            sampling: 1 / 30
          }
        });

        performStandardAuction();

        expect(requests.length).to.equal(0);
        expect(utils.logError.called).to.equal(true);
      });
    });
  });

  describe('when handling events', function () {
    beforeEach(function () {
      rubiconAnalyticsAdapter.enableAnalytics({
        options: {
          endpoint: '//localhost:9999/event',
          accountId: 1001
        }
      });
    });

    afterEach(function () {
      rubiconAnalyticsAdapter.disableAnalytics();
    });

    it('should build a batched message from prebid events', function () {
      performStandardAuction();

      expect(requests.length).to.equal(1);
      let request = requests[0];

      expect(request.url).to.equal('//localhost:9999/event');

      let message = JSON.parse(request.requestBody);
      validate(message);

      expect(message).to.deep.equal(ANALYTICS_MESSAGE);
    });

    it('should pick the highest cpm bid if more than one bid per bidRequestId', function () {
      // Only want one bid request in our mock auction
      let bidRequested = utils.deepClone(MOCK.BID_REQUESTED);
      bidRequested.bids.shift();
      let auctionInit = utils.deepClone(MOCK.AUCTION_INIT);
      auctionInit.adUnits.shift();

      // clone the mock bidResponse and duplicate
      let duplicateResponse1 = utils.deepClone(BID2);
      duplicateResponse1.cpm = 1.0;
      duplicateResponse1.adserverTargeting.hb_pb = '1.0';
      duplicateResponse1.adserverTargeting.hb_adid = '1111';
      let duplicateResponse2 = utils.deepClone(BID2);
      duplicateResponse2.cpm = 5.5;
      duplicateResponse2.adserverTargeting.hb_pb = '5.5';
      duplicateResponse2.adserverTargeting.hb_adid = '5555';
      let duplicateResponse3 = utils.deepClone(BID2);
      duplicateResponse3.cpm = 0.1;
      duplicateResponse3.adserverTargeting.hb_pb = '0.1';
      duplicateResponse3.adserverTargeting.hb_adid = '3333';

      const setTargeting = {
        [duplicateResponse2.adUnitCode]: duplicateResponse2.adserverTargeting
      };

      const bidWon = Object.assign({}, duplicateResponse2, {
        'status': 'rendered'
      });

      // spoof the auction with just our duplicates
      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, bidRequested);
      events.emit(BID_RESPONSE, duplicateResponse1);
      events.emit(BID_RESPONSE, duplicateResponse2);
      events.emit(BID_RESPONSE, duplicateResponse3);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, setTargeting);
      events.emit(BID_WON, bidWon);

      let message = JSON.parse(requests[0].requestBody);
      validate(message);
      expect(message.auctions[0].adUnits[0].bids[0].bidResponse.bidPriceUSD).to.equal(5.5);
      expect(message.auctions[0].adUnits[0].adserverTargeting.hb_pb).to.equal('5.5');
      expect(message.auctions[0].adUnits[0].adserverTargeting.hb_adid).to.equal('5555');
      expect(message.bidsWon.length).to.equal(1);
      expect(message.bidsWon[0].bidResponse.bidPriceUSD).to.equal(5.5);
      expect(message.bidsWon[0].adserverTargeting.hb_pb).to.equal('5.5');
      expect(message.bidsWon[0].adserverTargeting.hb_adid).to.equal('5555');
    });

    it('should send batched message without BID_WON if necessary and further BID_WON events individually', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);

      clock.tick(SEND_TIMEOUT + 1000);

      events.emit(BID_WON, MOCK.BID_WON[1]);

      expect(requests.length).to.equal(2);

      let message = JSON.parse(requests[0].requestBody);
      validate(message);
      expect(message.bidsWon.length).to.equal(1);
      expect(message.auctions).to.deep.equal(ANALYTICS_MESSAGE.auctions);
      expect(message.bidsWon[0]).to.deep.equal(ANALYTICS_MESSAGE.bidsWon[0]);

      message = JSON.parse(requests[1].requestBody);
      validate(message);
      expect(message.bidsWon.length).to.equal(1);
      expect(message).to.not.have.property('auctions');
      expect(message.bidsWon[0]).to.deep.equal(ANALYTICS_MESSAGE.bidsWon[1]);
    });

    it('should properly mark bids as timed out', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_TIMEOUT, MOCK.BID_TIMEOUT);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      clock.tick(SEND_TIMEOUT + 1000);

      expect(requests.length).to.equal(1);

      let message = JSON.parse(requests[0].requestBody);
      validate(message);
      let timedOutBid = message.auctions[0].adUnits[0].bids[0];
      expect(timedOutBid.status).to.equal('error');
      expect(timedOutBid.error.code).to.equal('timeout-error');
      expect(timedOutBid).to.not.have.property('bidResponse');
    });

    it('should successfully convert bid price to USD in parseBidResponse', function () {
      // Set the rates
      setConfig({
        adServerCurrency: 'JPY',
        rates: {
          USD: {
            JPY: 100
          }
        }
      });

      // set our bid response to JPY
      const bidCopy = utils.deepClone(BID2);
      bidCopy.currency = 'JPY';
      bidCopy.cpm = 100;

      // Now add the bidResponse hook which hooks on the currenct conversion function onto the bid response
      let innerBid;
      addBidResponseHook(function(adCodeId, bid) {
        innerBid = bid;
      }, 'elementId', bidCopy);

      // Use the rubi analytics parseBidResponse Function to get the resulting cpm from the bid response!
      const bidResponseObj = parseBidResponse(innerBid);
      expect(bidResponseObj).to.have.property('bidPriceUSD');
      expect(bidResponseObj.bidPriceUSD).to.equal(1.0);
    });
  });

  describe('config with integration type', () => {
    it('should use the integration type provided in the config instead of the default', () => {
      sandbox.stub(config, 'getConfig').callsFake(function (key) {
        const config = {
          'rubicon.int_type': 'testType'
        };
        return config[key];
      });

      rubiconAnalyticsAdapter.enableAnalytics({
        options: {
          endpoint: '//localhost:9999/event',
          accountId: 1001
        }
      });

      performStandardAuction();

      expect(requests.length).to.equal(1);
      const request = requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.integration).to.equal('testType');

      rubiconAnalyticsAdapter.disableAnalytics();
    });
  });
});
