import rubiconAnalyticsAdapter, {
  SEND_TIMEOUT,
  parseBidResponse,
  getHostNameFromReferer,
  storage,
  rubiConf,
} from 'modules/rubiconAnalyticsAdapter.js';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import * as mockGpt from '../integration/faker/googletag.js';
import {
  setConfig,
  addBidResponseHook,
} from 'modules/currency.js';

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

let events = require('src/events.js');
let utils = require('src/utils.js');

const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BIDDER_DONE,
    BID_WON,
    BID_TIMEOUT,
    SET_TARGETING,
    BILLABLE_EVENT
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

const BID3 = Object.assign({}, BID, {
  adUnitCode: '/19968336/siderail-tag1',
  bidId: '5fg6hyy4r879f0',
  adId: 'fake_ad_id',
  requestId: '5fg6hyy4r879f0',
  width: 300,
  height: 250,
  mediaType: 'banner',
  cpm: 2.01,
  source: 'server',
  seatBidId: 'aaaa-bbbb-cccc-dddd',
  rubiconTargeting: {
    'rpfl_elemid': '/19968336/siderail-tag1',
    'rpfl_14062': '15_tier0200'
  },
  adserverTargeting: {
    'hb_bidder': 'rubicon',
    'hb_adid': '5fg6hyy4r879f0',
    'hb_pb': '2.00',
    'hb_size': '300x250',
    'hb_source': 'server'
  }
});

const BID4 = Object.assign({}, BID, {
  adUnitCode: '/19968336/header-bid-tag1',
  bidId: '3bd4ebb1c900e2',
  adId: 'fake_ad_id',
  requestId: '3bd4ebb1c900e2',
  width: 728,
  height: 90,
  mediaType: 'banner',
  cpm: 1.52,
  source: 'server',
  pbsBidId: 'zzzz-yyyy-xxxx-wwww',
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

const floorMinRequest = {
  'bidder': 'rubicon',
  'params': {
    'accountId': '14062',
    'siteId': '70608',
    'zoneId': '335918',
    'userId': '12346',
    'keywords': ['a', 'b', 'c'],
    'inventory': { 'rating': '4-star', 'prodtype': 'tech' },
    'visitor': { 'ucat': 'new', 'lastsearch': 'iphone' },
    'position': 'atf'
  },
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250]]
    }
  },
  'adUnitCode': '/19968336/siderail-tag1',
  'transactionId': 'c435626g-9e3f-401a-bee1-d56aec29a1d4',
  'sizes': [[300, 250]],
  'bidId': '5fg6hyy4r879f0',
  'bidderRequestId': '1be65d7958826a',
  'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
};

const MOCK = {
  SET_TARGETING: {
    [BID.adUnitCode]: BID.adserverTargeting,
    [BID2.adUnitCode]: BID2.adserverTargeting,
    [BID3.adUnitCode]: BID3.adserverTargeting
  },
  AUCTION_INIT: {
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
    'timestamp': 1519767010567,
    'auctionStatus': 'inProgress',
    'adUnits': [{
      'code': '/19968336/header-bid-tag1',
      'sizes': [[640, 480]],
      'bids': [{
        'bidder': 'rubicon',
        'params': {
          'accountId': 1001, 'siteId': 113932, 'zoneId': 535512
        }
      }],
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014'
    }
    ],
    'adUnitCodes': ['/19968336/header-bid-tag1'],
    'bidderRequests': [{
      'bidderCode': 'rubicon',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
      'bidderRequestId': '1be65d7958826a',
      'bids': [{
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
        'page': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
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
    'bidderCode': 'rubicon',
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
          'visitor': { 'ucat': 'new', 'lastsearch': 'iphone' },
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
        'mediaTypes': {
          'video': {
            'context': 'instream',
            'playerSize': [640, 480]
          }
        },
        'adUnitCode': '/19968336/header-bid-tag-0',
        'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
        'sizes': [[640, 480]],
        'bidId': '2ecff0db240757',
        'bidderRequestId': '1be65d7958826a',
        'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
        'src': 'client'
      },
      {
        'bidder': 'rubicon',
        'params': {
          'accountId': '14062',
          'siteId': '70608',
          'zoneId': '335918',
          'userId': '12346',
          'keywords': ['a', 'b', 'c'],
          'inventory': { 'rating': '4-star', 'prodtype': 'tech' },
          'visitor': { 'ucat': 'new', 'lastsearch': 'iphone' },
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
        'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
        'src': 's2s'
      }
    ],
    'auctionStart': 1519149536560,
    'timeout': 5000,
    'start': 1519149562216,
    'refererInfo': {
      'page': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    }
  },
  BID_RESPONSE: [
    BID,
    BID2,
    BID3
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
    }),
    Object.assign({}, BID3, {
      'status': 'rendered'
    })
  ],
  BIDDER_DONE: {
    'bidderCode': 'rubicon',
    'serverResponseTimeMs': 42,
    'bids': [
      BID,
      Object.assign({}, BID2, {
        'serverResponseTimeMs': 42,
      }),
      Object.assign({}, BID3, {
        'serverResponseTimeMs': 55,
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

const STUBBED_UUID = '12345678-1234-1234-1234-123456789abc';

const ANALYTICS_MESSAGE = {
  'channel': 'web',
  'integration': 'pbjs',
  'version': '$prebid.version$',
  'referrerUri': 'http://www.test.com/page.html',
  'session': {
    'expires': 1519788613781,
    'id': STUBBED_UUID,
    'start': 1519767013781
  },
  'timestamps': {
    'auctionEnded': 1519767013781,
    'eventTime': 1519767013781,
    'prebidLoaded': rubiconAnalyticsAdapter.MODULE_INITIALIZED_TIME
  },
  'trigger': 'allBidWons',
  'referrerHostname': 'www.test.com',
  'auctions': [
    {

      'auctionEnd': 1519767013781,
      'auctionStart': 1519767010567,
      'bidderOrder': ['rubicon'],
      'requestId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
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
  'wrapper': {
    'name': '10000_fakewrapper_test'
  }
};

function performStandardAuction(gptEvents, auctionId = MOCK.AUCTION_INIT.auctionId) {
  events.emit(AUCTION_INIT, { ...MOCK.AUCTION_INIT, auctionId });
  events.emit(BID_REQUESTED, { ...MOCK.BID_REQUESTED, auctionId });
  events.emit(BID_RESPONSE, { ...MOCK.BID_RESPONSE[0], auctionId });
  events.emit(BID_RESPONSE, { ...MOCK.BID_RESPONSE[1], auctionId });
  events.emit(BIDDER_DONE, { ...MOCK.BIDDER_DONE, auctionId });
  events.emit(AUCTION_END, { ...MOCK.AUCTION_END, auctionId });

  if (gptEvents && gptEvents.length) {
    gptEvents.forEach(gptEvent => mockGpt.emitEvent(gptEvent.eventName, gptEvent.params));
  }

  events.emit(SET_TARGETING, { ...MOCK.SET_TARGETING, auctionId });
  events.emit(BID_WON, { ...MOCK.BID_WON[0], auctionId });
  events.emit(BID_WON, { ...MOCK.BID_WON[1], auctionId });
}

describe('rubicon analytics adapter', function () {
  let sandbox;
  let clock;
  let getDataFromLocalStorageStub, setDataInLocalStorageStub, localStorageIsEnabledStub;
  beforeEach(function () {
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    setDataInLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
    localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
    mockGpt.disable();
    sandbox = sinon.sandbox.create();

    localStorageIsEnabledStub.returns(true);

    sandbox.stub(events, 'getEvents').returns([]);

    sandbox.stub(utils, 'generateUUID').returns(STUBBED_UUID);

    clock = sandbox.useFakeTimers(1519767013781);

    rubiconAnalyticsAdapter.referrerHostname = '';

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
    mockGpt.enable();
    getDataFromLocalStorageStub.restore();
    setDataInLocalStorageStub.restore();
    localStorageIsEnabledStub.restore();
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

  describe('config subscribe', function () {
    it('should update the pvid if user asks', function () {
      expect(utils.generateUUID.called).to.equal(false);
      config.setConfig({ rubicon: { updatePageView: true } });
      expect(utils.generateUUID.called).to.equal(true);
    });
    it('should merge in and preserve older set configs', function () {
      config.setConfig({
        rubicon: {
          wrapperName: '1001_general',
          int_type: 'dmpbjs',
          fpkvs: {
            source: 'fb'
          }
        }
      });
      expect(rubiConf).to.deep.equal({
        analyticsEventDelay: 0,
        dmBilling: {
          enabled: false,
          vendors: [],
          waitForAuction: true
        },
        pvid: '12345678',
        wrapperName: '1001_general',
        int_type: 'dmpbjs',
        fpkvs: {
          source: 'fb'
        },
        updatePageView: true
      });

      // update it with stuff
      config.setConfig({
        rubicon: {
          fpkvs: {
            link: 'email'
          }
        }
      });
      expect(rubiConf).to.deep.equal({
        analyticsEventDelay: 0,
        dmBilling: {
          enabled: false,
          vendors: [],
          waitForAuction: true
        },
        pvid: '12345678',
        wrapperName: '1001_general',
        int_type: 'dmpbjs',
        fpkvs: {
          source: 'fb',
          link: 'email'
        },
        updatePageView: true
      });

      // overwriting specific edge keys should update them
      config.setConfig({
        rubicon: {
          fpkvs: {
            link: 'iMessage',
            source: 'twitter'
          }
        }
      });
      expect(rubiConf).to.deep.equal({
        analyticsEventDelay: 0,
        dmBilling: {
          enabled: false,
          vendors: [],
          waitForAuction: true
        },
        pvid: '12345678',
        wrapperName: '1001_general',
        int_type: 'dmpbjs',
        fpkvs: {
          link: 'iMessage',
          source: 'twitter'
        },
        updatePageView: true
      });
    });
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

        expect(server.requests.length).to.equal(1);
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

        expect(server.requests.length).to.equal(0);
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

        expect(server.requests.length).to.equal(0);
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

        expect(server.requests.length).to.equal(1);
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

        expect(server.requests.length).to.equal(0);
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

        expect(server.requests.length).to.equal(0);
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

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];

      expect(request.url).to.equal('//localhost:9999/event');

      let message = JSON.parse(request.requestBody);
      validate(message);

      expect(message).to.deep.equal(ANALYTICS_MESSAGE);
    });

    it('should pass along bidderOrder correctly', function () {
      const appnexusBid = utils.deepClone(MOCK.BID_REQUESTED);
      appnexusBid.bidderCode = 'appnexus';
      const pubmaticBid = utils.deepClone(MOCK.BID_REQUESTED);
      pubmaticBid.bidderCode = 'pubmatic';
      const indexBid = utils.deepClone(MOCK.BID_REQUESTED);
      indexBid.bidderCode = 'ix';
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, pubmaticBid);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_REQUESTED, indexBid);
      events.emit(BID_REQUESTED, appnexusBid);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      clock.tick(SEND_TIMEOUT + 1000);

      let message = JSON.parse(server.requests[0].requestBody);
      expect(message.auctions[0].bidderOrder).to.deep.equal([
        'pubmatic',
        'rubicon',
        'ix',
        'appnexus'
      ]);
    });

    it('should pass along user ids', function () {
      let auctionInit = utils.deepClone(MOCK.AUCTION_INIT);
      auctionInit.bidderRequests[0].bids[0].userId = {
        criteoId: 'sadfe4334',
        lotamePanoramaId: 'asdf3gf4eg',
        pubcid: 'dsfa4545-svgdfs5',
        sharedId: { id1: 'asdf', id2: 'sadf4344' }
      };

      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];

      let message = JSON.parse(request.requestBody);
      validate(message);

      expect(message.auctions[0].user).to.deep.equal({
        ids: [
          { provider: 'criteoId', 'hasId': true },
          { provider: 'lotamePanoramaId', 'hasId': true },
          { provider: 'pubcid', 'hasId': true },
          { provider: 'sharedId', 'hasId': true },
        ]
      });
    });

    it('should handle bidResponse dimensions correctly', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

      // mock bid response with playerWidth and playerHeight (NO width and height)
      let bidResponse1 = utils.deepClone(MOCK.BID_RESPONSE[0]);
      delete bidResponse1.width;
      delete bidResponse1.height;
      bidResponse1.playerWidth = 640;
      bidResponse1.playerHeight = 480;

      // mock bid response with no width height or playerwidth playerheight
      let bidResponse2 = utils.deepClone(MOCK.BID_RESPONSE[1]);
      delete bidResponse2.width;
      delete bidResponse2.height;
      delete bidResponse2.playerWidth;
      delete bidResponse2.playerHeight;

      events.emit(BID_RESPONSE, bidResponse1);
      events.emit(BID_RESPONSE, bidResponse2);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      expect(message.auctions[0].adUnits[0].bids[0].bidResponse.dimensions).to.deep.equal({
        width: 640,
        height: 480
      });
      expect(message.auctions[0].adUnits[1].bids[0].bidResponse.dimensions).to.equal(undefined);
    });

    it('should pass along adomians correctly', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

      // 1 adomains
      let bidResponse1 = utils.deepClone(MOCK.BID_RESPONSE[0]);
      bidResponse1.meta = {
        advertiserDomains: ['magnite.com']
      }

      // two adomains
      let bidResponse2 = utils.deepClone(MOCK.BID_RESPONSE[1]);
      bidResponse2.meta = {
        advertiserDomains: ['prebid.org', 'magnite.com']
      }

      // make sure we only pass max 10 adomains
      bidResponse2.meta.advertiserDomains = [...bidResponse2.meta.advertiserDomains, ...bidResponse2.meta.advertiserDomains, ...bidResponse2.meta.advertiserDomains, ...bidResponse2.meta.advertiserDomains, ...bidResponse2.meta.advertiserDomains, ...bidResponse2.meta.advertiserDomains, ...bidResponse2.meta.advertiserDomains]

      events.emit(BID_RESPONSE, bidResponse1);
      events.emit(BID_RESPONSE, bidResponse2);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      expect(message.auctions[0].adUnits[0].bids[0].bidResponse.adomains).to.deep.equal(['magnite.com']);
      expect(message.auctions[0].adUnits[1].bids[0].bidResponse.adomains).to.deep.equal(['prebid.org', 'magnite.com', 'prebid.org', 'magnite.com', 'prebid.org', 'magnite.com', 'prebid.org', 'magnite.com', 'prebid.org', 'magnite.com']);
    });

    it('should NOT pass along adomians correctly when edge cases', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

      // empty => nothing
      let bidResponse1 = utils.deepClone(MOCK.BID_RESPONSE[0]);
      bidResponse1.meta = {
        advertiserDomains: []
      }

      // not array => nothing
      let bidResponse2 = utils.deepClone(MOCK.BID_RESPONSE[1]);
      bidResponse2.meta = {
        advertiserDomains: 'prebid.org'
      }

      events.emit(BID_RESPONSE, bidResponse1);
      events.emit(BID_RESPONSE, bidResponse2);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      expect(message.auctions[0].adUnits[0].bids[0].bidResponse.adomains).to.be.undefined;
      expect(message.auctions[0].adUnits[1].bids[0].bidResponse.adomains).to.be.undefined;
    });

    it('should NOT pass along adomians with other edge cases', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

      // should filter out non string values and pass valid ones
      let bidResponse1 = utils.deepClone(MOCK.BID_RESPONSE[0]);
      bidResponse1.meta = {
        advertiserDomains: [123, 'prebid.org', false, true, [], 'magnite.com', {}]
      }

      // array of arrays (as seen when passed by kargo bid adapter)
      let bidResponse2 = utils.deepClone(MOCK.BID_RESPONSE[1]);
      bidResponse2.meta = {
        advertiserDomains: [['prebid.org']]
      }

      events.emit(BID_RESPONSE, bidResponse1);
      events.emit(BID_RESPONSE, bidResponse2);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      expect(message.auctions[0].adUnits[0].bids[0].bidResponse.adomains).to.deep.equal(['prebid.org', 'magnite.com']);
      expect(message.auctions[0].adUnits[1].bids[0].bidResponse.adomains).to.be.undefined;
    });

    it('should not pass empty adServerTargeting values', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      const mockTargeting = utils.deepClone(MOCK.SET_TARGETING);
      mockTargeting['/19968336/header-bid-tag-0'].hb_test = '';
      mockTargeting['/19968336/header-bid-tag1'].hb_test = 'NOT_EMPTY';
      events.emit(SET_TARGETING, mockTargeting);

      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      expect(message.auctions[0].adUnits[0].adserverTargeting.hb_test).to.be.undefined;
      expect(message.auctions[0].adUnits[1].adserverTargeting.hb_test).to.equal('NOT_EMPTY');
    });

    function performFloorAuction(provider) {
      let auctionInit = utils.deepClone(MOCK.AUCTION_INIT);
      auctionInit.bidderRequests[0].bids[0].floorData = {
        skipped: false,
        modelVersion: 'someModelName',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 15,
        fetchStatus: 'error',
        floorProvider: provider
      };
      let flooredResponse = {
        ...BID,
        floorData: {
          floorValue: 4,
          floorRule: '12345/sports|video',
          floorCurrency: 'USD',
          cpmAfterAdjustments: 2.1,
          enforcements: {
            enforceJS: true,
            enforcePBS: false,
            floorDeals: false,
            bidAdjustment: true
          },
          matchedFields: {
            gptSlot: '12345/sports',
            mediaType: 'video'
          }
        },
        status: 'bidRejected',
        cpm: 0,
        getStatusCode() {
          return 2;
        }
      };

      let notFlooredResponse = {
        ...BID2,
        floorData: {
          floorValue: 1,
          floorRule: '12345/news|banner',
          floorCurrency: 'USD',
          cpmAfterAdjustments: 1.55,
          enforcements: {
            enforceJS: true,
            enforcePBS: false,
            floorDeals: false,
            bidAdjustment: true
          },
          matchedFields: {
            gptSlot: '12345/news',
            mediaType: 'banner'
          }
        }
      };

      let floorMinResponse = {
        ...BID3,
        floorData: {
          floorValue: 1.5,
          floorRuleValue: 1,
          floorRule: '12345/entertainment|banner',
          floorCurrency: 'USD',
          cpmAfterAdjustments: 2.00,
          enforcements: {
            enforceJS: true,
            enforcePBS: false,
            floorDeals: false,
            bidAdjustment: true
          },
          matchedFields: {
            gptSlot: '12345/entertainment',
            mediaType: 'banner'
          }
        }
      };

      let bidRequest = utils.deepClone(MOCK.BID_REQUESTED);
      bidRequest.bids.push(floorMinRequest)

      // spoof the auction with just our duplicates
      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, bidRequest);
      events.emit(BID_RESPONSE, flooredResponse);
      events.emit(BID_RESPONSE, notFlooredResponse);
      events.emit(BID_RESPONSE, floorMinResponse);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[1]);
      events.emit(BID_WON, MOCK.BID_WON[2]);
      clock.tick(SEND_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      return message;
    }

    it('should capture price floor information correctly', function () {
      let message = performFloorAuction('rubicon');

      // verify our floor stuff is passed
      // top level floor info
      expect(message.auctions[0].floors).to.deep.equal({
        location: 'setConfig',
        modelName: 'someModelName',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        skipped: false,
        enforcement: true,
        dealsEnforced: false,
        skipRate: 15,
        fetchStatus: 'error',
        provider: 'rubicon'
      });
      // first adUnit's adSlot
      expect(message.auctions[0].adUnits[0].gam.adSlot).to.equal('12345/sports');
      // since no other bids, we set adUnit status to no-bid
      expect(message.auctions[0].adUnits[0].status).to.equal('no-bid');
      // first adUnits bid is rejected
      expect(message.auctions[0].adUnits[0].bids[0].status).to.equal('rejected-ipf');
      expect(message.auctions[0].adUnits[0].bids[0].bidResponse.floorValue).to.equal(4);
      // if bid rejected should take cpmAfterAdjustments val
      expect(message.auctions[0].adUnits[0].bids[0].bidResponse.bidPriceUSD).to.equal(2.1);

      // second adUnit's adSlot
      expect(message.auctions[0].adUnits[1].gam.adSlot).to.equal('12345/news');
      // top level adUnit status is success
      expect(message.auctions[0].adUnits[1].status).to.equal('success');
      // second adUnits bid is success
      expect(message.auctions[0].adUnits[1].bids[0].status).to.equal('success');
      expect(message.auctions[0].adUnits[1].bids[0].bidResponse.floorValue).to.equal(1);
      expect(message.auctions[0].adUnits[1].bids[0].bidResponse.bidPriceUSD).to.equal(1.52);

      // second adUnit's adSlot
      expect(message.auctions[0].adUnits[2].gam.adSlot).to.equal('12345/entertainment');
      // top level adUnit status is success
      expect(message.auctions[0].adUnits[2].status).to.equal('success');
      // second adUnits bid is success
      expect(message.auctions[0].adUnits[2].bids[0].status).to.equal('success');
      expect(message.auctions[0].adUnits[2].bids[0].bidResponse.floorValue).to.equal(1.5);
      expect(message.auctions[0].adUnits[2].bids[0].bidResponse.floorRuleValue).to.equal(1);
      expect(message.auctions[0].adUnits[2].bids[0].bidResponse.bidPriceUSD).to.equal(2.01);
    });

    it('should still send floor info if provider is not rubicon', function () {
      let message = performFloorAuction('randomProvider');

      // verify our floor stuff is passed
      // top level floor info
      expect(message.auctions[0].floors).to.deep.equal({
        location: 'setConfig',
        modelName: 'someModelName',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        skipped: false,
        enforcement: true,
        dealsEnforced: false,
        skipRate: 15,
        fetchStatus: 'error',
        provider: 'randomProvider'
      });
      // first adUnit's adSlot
      expect(message.auctions[0].adUnits[0].gam.adSlot).to.equal('12345/sports');
      // since no other bids, we set adUnit status to no-bid
      expect(message.auctions[0].adUnits[0].status).to.equal('no-bid');
      // first adUnits bid is rejected
      expect(message.auctions[0].adUnits[0].bids[0].status).to.equal('rejected-ipf');
      expect(message.auctions[0].adUnits[0].bids[0].bidResponse.floorValue).to.equal(4);
      // if bid rejected should take cpmAfterAdjustments val
      expect(message.auctions[0].adUnits[0].bids[0].bidResponse.bidPriceUSD).to.equal(2.1);

      // second adUnit's adSlot
      expect(message.auctions[0].adUnits[1].gam.adSlot).to.equal('12345/news');
      // top level adUnit status is success
      expect(message.auctions[0].adUnits[1].status).to.equal('success');
      // second adUnits bid is success
      expect(message.auctions[0].adUnits[1].bids[0].status).to.equal('success');
      expect(message.auctions[0].adUnits[1].bids[0].bidResponse.floorValue).to.equal(1);
      expect(message.auctions[0].adUnits[1].bids[0].bidResponse.bidPriceUSD).to.equal(1.52);

      // second adUnit's adSlot
      expect(message.auctions[0].adUnits[2].gam.adSlot).to.equal('12345/entertainment');
      // top level adUnit status is success
      expect(message.auctions[0].adUnits[2].status).to.equal('success');
      // second adUnits bid is success
      expect(message.auctions[0].adUnits[2].bids[0].status).to.equal('success');
      expect(message.auctions[0].adUnits[2].bids[0].bidResponse.floorValue).to.equal(1.5);
      expect(message.auctions[0].adUnits[2].bids[0].bidResponse.floorRuleValue).to.equal(1);
      expect(message.auctions[0].adUnits[2].bids[0].bidResponse.bidPriceUSD).to.equal(2.01);
    });

    describe('with session handling', function () {
      const expectedPvid = STUBBED_UUID.slice(0, 8);
      beforeEach(function () {
        config.setConfig({ rubicon: { updatePageView: true } });
      });

      it('should not log any session data if local storage is not enabled', function () {
        localStorageIsEnabledStub.returns(false);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        delete expectedMessage.session;
        delete expectedMessage.fpkvs;

        performStandardAuction();

        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];

        expect(request.url).to.equal('//localhost:9999/event');

        let message = JSON.parse(request.requestBody);
        validate(message);

        expect(message).to.deep.equal(expectedMessage);
      });

      it('should should pass along custom rubicon kv and pvid when defined', function () {
        config.setConfig({
          rubicon: {
            fpkvs: {
              source: 'fb',
              link: 'email'
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session.pvid = STUBBED_UUID.slice(0, 8);
        expectedMessage.fpkvs = [
          { key: 'source', value: 'fb' },
          { key: 'link', value: 'email' }
        ]
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should convert kvs to strings before sending', function () {
        config.setConfig({
          rubicon: {
            fpkvs: {
              number: 24,
              boolean: false,
              string: 'hello',
              array: ['one', 2, 'three'],
              object: { one: 'two' }
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session.pvid = STUBBED_UUID.slice(0, 8);
        expectedMessage.fpkvs = [
          { key: 'number', value: '24' },
          { key: 'boolean', value: 'false' },
          { key: 'string', value: 'hello' },
          { key: 'array', value: 'one,2,three' },
          { key: 'object', value: '[object Object]' }
        ]
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should use the query utm param rubicon kv value and pass updated kv and pvid when defined', function () {
        sandbox.stub(utils, 'getWindowLocation').returns({ 'search': '?utm_source=other', 'pbjs_debug': 'true' });

        config.setConfig({
          rubicon: {
            fpkvs: {
              source: 'fb',
              link: 'email'
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session.pvid = STUBBED_UUID.slice(0, 8);
        expectedMessage.fpkvs = [
          { key: 'source', value: 'other' },
          { key: 'link', value: 'email' }
        ]

        message.fpkvs.sort((left, right) => left.key < right.key);
        expectedMessage.fpkvs.sort((left, right) => left.key < right.key);

        expect(message).to.deep.equal(expectedMessage);
      });

      it('should pick up existing localStorage and use its values', function () {
        // set some localStorage
        let inputlocalStorage = {
          id: '987654',
          start: 1519766113781, // 15 mins before "now"
          expires: 1519787713781, // six hours later
          lastSeen: 1519766113781,
          fpkvs: { source: 'tw' }
        };
        getDataFromLocalStorageStub.withArgs('rpaSession').returns(btoa(JSON.stringify(inputlocalStorage)));

        config.setConfig({
          rubicon: {
            fpkvs: {
              link: 'email' // should merge this with what is in the localStorage!
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session = {
          id: '987654',
          start: 1519766113781,
          expires: 1519787713781,
          pvid: expectedPvid
        }
        expectedMessage.fpkvs = [
          { key: 'source', value: 'tw' },
          { key: 'link', value: 'email' }
        ]
        expect(message).to.deep.equal(expectedMessage);

        let calledWith;
        try {
          calledWith = JSON.parse(atob(setDataInLocalStorageStub.getCall(0).args[1]));
        } catch (e) {
          calledWith = {};
        }

        expect(calledWith).to.deep.equal({
          id: '987654', // should have stayed same
          start: 1519766113781, // should have stayed same
          expires: 1519787713781, // should have stayed same
          lastSeen: 1519767013781, // lastSeen updated to our "now"
          fpkvs: { source: 'tw', link: 'email' }, // link merged in
          pvid: expectedPvid // new pvid stored
        });
      });

      it('should overwrite matching localstorge value and use its remaining values', function () {
        sandbox.stub(utils, 'getWindowLocation').returns({ 'search': '?utm_source=fb&utm_click=dog' });

        // set some localStorage
        let inputlocalStorage = {
          id: '987654',
          start: 1519766113781, // 15 mins before "now"
          expires: 1519787713781, // six hours later
          lastSeen: 1519766113781,
          fpkvs: { source: 'tw', link: 'email' }
        };
        getDataFromLocalStorageStub.withArgs('rpaSession').returns(btoa(JSON.stringify(inputlocalStorage)));

        config.setConfig({
          rubicon: {
            fpkvs: {
              link: 'email' // should merge this with what is in the localStorage!
            }
          }
        });
        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.session = {
          id: '987654',
          start: 1519766113781,
          expires: 1519787713781,
          pvid: expectedPvid
        }
        expectedMessage.fpkvs = [
          { key: 'source', value: 'fb' },
          { key: 'link', value: 'email' },
          { key: 'click', value: 'dog' }
        ]

        message.fpkvs.sort((left, right) => left.key < right.key);
        expectedMessage.fpkvs.sort((left, right) => left.key < right.key);

        expect(message).to.deep.equal(expectedMessage);

        let calledWith;
        try {
          calledWith = JSON.parse(atob(setDataInLocalStorageStub.getCall(0).args[1]));
        } catch (e) {
          calledWith = {};
        }

        expect(calledWith).to.deep.equal({
          id: '987654', // should have stayed same
          start: 1519766113781, // should have stayed same
          expires: 1519787713781, // should have stayed same
          lastSeen: 1519767013781, // lastSeen updated to our "now"
          fpkvs: { source: 'fb', link: 'email', click: 'dog' }, // link merged in
          pvid: expectedPvid // new pvid stored
        });
      });

      it('should throw out session if lastSeen > 30 mins ago and create new one', function () {
        // set some localStorage
        let inputlocalStorage = {
          id: '987654',
          start: 1519764313781, // 45 mins before "now"
          expires: 1519785913781, // six hours later
          lastSeen: 1519764313781, // 45 mins before "now"
          fpkvs: { source: 'tw' }
        };
        getDataFromLocalStorageStub.withArgs('rpaSession').returns(btoa(JSON.stringify(inputlocalStorage)));

        config.setConfig({
          rubicon: {
            fpkvs: {
              link: 'email' // should merge this with what is in the localStorage!
            }
          }
        });

        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        // session should match what is already in ANALYTICS_MESSAGE, just need to add pvid
        expectedMessage.session.pvid = expectedPvid;

        // the saved fpkvs should have been thrown out since session expired
        expectedMessage.fpkvs = [
          { key: 'link', value: 'email' }
        ]
        expect(message).to.deep.equal(expectedMessage);

        let calledWith;
        try {
          calledWith = JSON.parse(atob(setDataInLocalStorageStub.getCall(0).args[1]));
        } catch (e) {
          calledWith = {};
        }

        expect(calledWith).to.deep.equal({
          id: STUBBED_UUID, // should have stayed same
          start: 1519767013781, // should have stayed same
          expires: 1519788613781, // should have stayed same
          lastSeen: 1519767013781, // lastSeen updated to our "now"
          fpkvs: { link: 'email' }, // link merged in
          pvid: expectedPvid // new pvid stored
        });
      });

      it('should throw out session if past expires time and create new one', function () {
        // set some localStorage
        let inputlocalStorage = {
          id: '987654',
          start: 1519745353781, // 6 hours before "expires"
          expires: 1519766953781, // little more than six hours ago
          lastSeen: 1519767008781, // 5 seconds ago
          fpkvs: { source: 'tw' }
        };
        getDataFromLocalStorageStub.withArgs('rpaSession').returns(btoa(JSON.stringify(inputlocalStorage)));

        config.setConfig({
          rubicon: {
            fpkvs: {
              link: 'email' // should merge this with what is in the localStorage!
            }
          }
        });

        performStandardAuction();
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        // session should match what is already in ANALYTICS_MESSAGE, just need to add pvid
        expectedMessage.session.pvid = expectedPvid;

        // the saved fpkvs should have been thrown out since session expired
        expectedMessage.fpkvs = [
          { key: 'link', value: 'email' }
        ]
        expect(message).to.deep.equal(expectedMessage);

        let calledWith;
        try {
          calledWith = JSON.parse(atob(setDataInLocalStorageStub.getCall(0).args[1]));
        } catch (e) {
          calledWith = {};
        }

        expect(calledWith).to.deep.equal({
          id: STUBBED_UUID, // should have stayed same
          start: 1519767013781, // should have stayed same
          expires: 1519788613781, // should have stayed same
          lastSeen: 1519767013781, // lastSeen updated to our "now"
          fpkvs: { link: 'email' }, // link merged in
          pvid: expectedPvid // new pvid stored
        });
      });
    });
    describe('with googletag enabled', function () {
      let gptSlot0, gptSlot1;
      let gptSlotRenderEnded0, gptSlotRenderEnded1;
      beforeEach(function () {
        mockGpt.enable();
        gptSlot0 = mockGpt.makeSlot({ code: '/19968336/header-bid-tag-0' });
        gptSlotRenderEnded0 = {
          eventName: 'slotRenderEnded',
          params: {
            slot: gptSlot0,
            isEmpty: false,
            advertiserId: 1111,
            sourceAgnosticCreativeId: 2222,
            sourceAgnosticLineItemId: 3333
          }
        };

        gptSlot1 = mockGpt.makeSlot({ code: '/19968336/header-bid-tag1' });
        gptSlotRenderEnded1 = {
          eventName: 'slotRenderEnded',
          params: {
            slot: gptSlot1,
            isEmpty: false,
            advertiserId: 4444,
            sourceAgnosticCreativeId: 5555,
            sourceAgnosticLineItemId: 6666
          }
        };
      });

      afterEach(function () {
        mockGpt.disable();
      });

      it('should add necessary gam information if gpt is enabled and slotRender event emmited', function () {
        performStandardAuction([gptSlotRenderEnded0, gptSlotRenderEnded1]);
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.auctions[0].adUnits[0].gam = {
          advertiserId: 1111,
          creativeId: 2222,
          lineItemId: 3333,
          adSlot: '/19968336/header-bid-tag-0'
        };
        expectedMessage.auctions[0].adUnits[1].gam = {
          advertiserId: 4444,
          creativeId: 5555,
          lineItemId: 6666,
          adSlot: '/19968336/header-bid-tag1'
        };
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should handle empty gam renders', function () {
        performStandardAuction([gptSlotRenderEnded0, {
          eventName: 'slotRenderEnded',
          params: {
            slot: gptSlot1,
            isEmpty: true
          }
        }]);
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.auctions[0].adUnits[0].gam = {
          advertiserId: 1111,
          creativeId: 2222,
          lineItemId: 3333,
          adSlot: '/19968336/header-bid-tag-0'
        };
        expectedMessage.auctions[0].adUnits[1].gam = {
          isSlotEmpty: true,
          adSlot: '/19968336/header-bid-tag1'
        };
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should still add gam ids if falsy', function () {
        performStandardAuction([gptSlotRenderEnded0, {
          eventName: 'slotRenderEnded',
          params: {
            slot: gptSlot1,
            isEmpty: false,
            advertiserId: 0,
            sourceAgnosticCreativeId: 0,
            sourceAgnosticLineItemId: 0
          }
        }]);
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.auctions[0].adUnits[0].gam = {
          advertiserId: 1111,
          creativeId: 2222,
          lineItemId: 3333,
          adSlot: '/19968336/header-bid-tag-0'
        };
        expectedMessage.auctions[0].adUnits[1].gam = {
          advertiserId: 0,
          creativeId: 0,
          lineItemId: 0,
          adSlot: '/19968336/header-bid-tag1'
        };
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should pick backup Ids if no sourceAgnostic available first', function () {
        performStandardAuction([gptSlotRenderEnded0, {
          eventName: 'slotRenderEnded',
          params: {
            slot: gptSlot1,
            isEmpty: false,
            advertiserId: 0,
            lineItemId: 1234,
            creativeId: 5678
          }
        }]);
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.auctions[0].adUnits[0].gam = {
          advertiserId: 1111,
          creativeId: 2222,
          lineItemId: 3333,
          adSlot: '/19968336/header-bid-tag-0'
        };
        expectedMessage.auctions[0].adUnits[1].gam = {
          advertiserId: 0,
          creativeId: 5678,
          lineItemId: 1234,
          adSlot: '/19968336/header-bid-tag1'
        };
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should correctly set adUnit for associated slots', function () {
        performStandardAuction([gptSlotRenderEnded0, gptSlotRenderEnded1]);
        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        expectedMessage.auctions[0].adUnits[0].gam = {
          advertiserId: 1111,
          creativeId: 2222,
          lineItemId: 3333,
          adSlot: '/19968336/header-bid-tag-0'
        };
        expectedMessage.auctions[0].adUnits[1].gam = {
          advertiserId: 4444,
          creativeId: 5555,
          lineItemId: 6666,
          adSlot: '/19968336/header-bid-tag1'
        };
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should only mark the first gam data not all matches', function () {
        config.setConfig({
          rubicon: {
            waitForGamSlots: true
          }
        });
        performStandardAuction();
        performStandardAuction([gptSlotRenderEnded0, gptSlotRenderEnded1], '32d332de-123a-32dg-2345-cefef3423324');

        // tick the clock and both should fire
        clock.tick(3000);

        expect(server.requests.length).to.equal(2);

        // first one should have GAM data
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);

        // trigger should be gam since all adunits had associated gam render
        expect(message.trigger).to.be.equal('gam');
        expect(message.auctions[0].adUnits[0].gam).to.deep.equal({
          advertiserId: 1111,
          creativeId: 2222,
          lineItemId: 3333,
          adSlot: '/19968336/header-bid-tag-0'
        });
        expect(message.auctions[0].adUnits[1].gam).to.deep.equal({
          advertiserId: 4444,
          creativeId: 5555,
          lineItemId: 6666,
          adSlot: '/19968336/header-bid-tag1'
        });

        // second one should NOT have gam data
        request = server.requests[1];
        message = JSON.parse(request.requestBody);
        validate(message);

        // trigger should be auctionEnd
        expect(message.trigger).to.be.equal('auctionEnd');
        expect(message.auctions[0].adUnits[0].gam).to.be.undefined;
        expect(message.auctions[0].adUnits[1].gam).to.be.undefined;
      });

      it('should send request when waitForGamSlots is present but no bidWons are sent', function () {
        config.setConfig({
          rubicon: {
            waitForGamSlots: true,
          }
        });
        events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
        events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
        events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
        events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
        events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
        events.emit(AUCTION_END, MOCK.AUCTION_END);
        events.emit(SET_TARGETING, MOCK.SET_TARGETING);

        // should send if just slotRenderEnded is emmitted for both
        mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);
        mockGpt.emitEvent(gptSlotRenderEnded1.eventName, gptSlotRenderEnded1.params);

        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);

        let expectedMessage = utils.deepClone(ANALYTICS_MESSAGE);
        delete expectedMessage.bidsWon; // should not be any of these
        expectedMessage.auctions[0].adUnits[0].gam = {
          advertiserId: 1111,
          creativeId: 2222,
          lineItemId: 3333,
          adSlot: '/19968336/header-bid-tag-0'
        };
        expectedMessage.auctions[0].adUnits[1].gam = {
          advertiserId: 4444,
          creativeId: 5555,
          lineItemId: 6666,
          adSlot: '/19968336/header-bid-tag1'
        };
        expectedMessage.trigger = 'gam';
        expect(message).to.deep.equal(expectedMessage);
      });

      it('should delay the event call depending on analyticsEventDelay config', function () {
        config.setConfig({
          rubicon: {
            waitForGamSlots: true,
            analyticsEventDelay: 2000
          }
        });
        events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
        events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
        events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
        events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
        events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
        events.emit(AUCTION_END, MOCK.AUCTION_END);
        events.emit(SET_TARGETING, MOCK.SET_TARGETING);

        // should send if just slotRenderEnded is emmitted for both
        mockGpt.emitEvent(gptSlotRenderEnded0.eventName, gptSlotRenderEnded0.params);
        mockGpt.emitEvent(gptSlotRenderEnded1.eventName, gptSlotRenderEnded1.params);

        // Should not be sent until delay
        expect(server.requests.length).to.equal(0);

        // tick the clock and it should fire
        clock.tick(2000);

        expect(server.requests.length).to.equal(1);
        let request = server.requests[0];
        let message = JSON.parse(request.requestBody);
        validate(message);
        let expectedGam0 = {
          advertiserId: 1111,
          creativeId: 2222,
          lineItemId: 3333,
          adSlot: '/19968336/header-bid-tag-0'
        };
        let expectedGam1 = {
          advertiserId: 4444,
          creativeId: 5555,
          lineItemId: 6666,
          adSlot: '/19968336/header-bid-tag1'
        };
        expect(expectedGam0).to.deep.equal(message.auctions[0].adUnits[0].gam);
        expect(expectedGam1).to.deep.equal(message.auctions[0].adUnits[1].gam);
      });
    });

    it('should correctly overwrite bidId if seatBidId is on the bidResponse', function () {
      // Only want one bid request in our mock auction
      let bidRequested = utils.deepClone(MOCK.BID_REQUESTED);
      bidRequested.bids.shift();
      let auctionInit = utils.deepClone(MOCK.AUCTION_INIT);
      auctionInit.adUnits.shift();

      // clone the mock bidResponse and duplicate
      let seatBidResponse = utils.deepClone(BID2);
      seatBidResponse.seatBidId = 'abc-123-do-re-me';

      const setTargeting = {
        [seatBidResponse.adUnitCode]: seatBidResponse.adserverTargeting
      };

      const bidWon = Object.assign({}, seatBidResponse, {
        'status': 'rendered'
      });

      // spoof the auction with just our duplicates
      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, bidRequested);
      events.emit(BID_RESPONSE, seatBidResponse);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, setTargeting);
      events.emit(BID_WON, bidWon);

      let message = JSON.parse(server.requests[0].requestBody);

      validate(message);
      expect(message.auctions[0].adUnits[0].bids[0].bidId).to.equal('abc-123-do-re-me');
      expect(message.bidsWon[0].bidId).to.equal('abc-123-do-re-me');
    });

    it('should correctly overwrite bidId if pbsBidId is on the bidResponse', function () {
      // Only want one bid request in our mock auction
      let bidRequested = utils.deepClone(MOCK.BID_REQUESTED);
      bidRequested.bids.shift();
      let auctionInit = utils.deepClone(MOCK.AUCTION_INIT);
      auctionInit.adUnits.shift();

      // clone the mock bidResponse and duplicate
      let seatBidResponse = utils.deepClone(BID4);

      const setTargeting = {
        [seatBidResponse.adUnitCode]: seatBidResponse.adserverTargeting
      };

      const bidWon = Object.assign({}, seatBidResponse, {
        'status': 'rendered'
      });

      // spoof the auction with just our duplicates
      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, bidRequested);
      events.emit(BID_RESPONSE, seatBidResponse);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, setTargeting);
      events.emit(BID_WON, bidWon);

      let message = JSON.parse(server.requests[0].requestBody);

      validate(message);
      expect(message.auctions[0].adUnits[0].bids[0].bidId).to.equal('zzzz-yyyy-xxxx-wwww');
      expect(message.bidsWon[0].bidId).to.equal('zzzz-yyyy-xxxx-wwww');
    });

    it('should correctly generate new bidId if it is 0', function () {
      // Only want one bid request in our mock auction
      let bidRequested = utils.deepClone(MOCK.BID_REQUESTED);
      bidRequested.bids.shift();
      let auctionInit = utils.deepClone(MOCK.AUCTION_INIT);
      auctionInit.adUnits.shift();

      // clone the mock bidResponse and duplicate
      let seatBidResponse = utils.deepClone(BID4);
      seatBidResponse.pbsBidId = '0';

      const setTargeting = {
        [seatBidResponse.adUnitCode]: seatBidResponse.adserverTargeting
      };

      const bidWon = Object.assign({}, seatBidResponse, {
        'status': 'rendered'
      });

      // spoof the auction with just our duplicates
      events.emit(AUCTION_INIT, auctionInit);
      events.emit(BID_REQUESTED, bidRequested);
      events.emit(BID_RESPONSE, seatBidResponse);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, setTargeting);
      events.emit(BID_WON, bidWon);

      let message = JSON.parse(server.requests[0].requestBody);

      validate(message);
      expect(message.auctions[0].adUnits[0].bids[0].bidId).to.equal(STUBBED_UUID);
      expect(message.bidsWon[0].bidId).to.equal(STUBBED_UUID);
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

      let message = JSON.parse(server.requests[0].requestBody);
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

      expect(server.requests.length).to.equal(2);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      expect(message.bidsWon.length).to.equal(1);
      expect(message.auctions).to.deep.equal(ANALYTICS_MESSAGE.auctions);
      expect(message.bidsWon[0]).to.deep.equal(ANALYTICS_MESSAGE.bidsWon[0]);

      message = JSON.parse(server.requests[1].requestBody);
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

      expect(server.requests.length).to.equal(1);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      let timedOutBid = message.auctions[0].adUnits[0].bids[0];
      expect(timedOutBid.status).to.equal('error');
      expect(timedOutBid.error.code).to.equal('timeout-error');
      expect(timedOutBid.error.description).to.equal('prebid.js timeout');
      expect(timedOutBid).to.not.have.property('bidResponse');
    });

    it('should pass aupName as pattern', function () {
      let bidRequest = utils.deepClone(MOCK.BID_REQUESTED);
      bidRequest.bids[0].ortb2Imp = {
        ext: {
          data: {
            aupname: '1234/mycoolsite/*&gpt_leaderboard&deviceType=mobile'
          }
        }
      };
      bidRequest.bids[1].ortb2Imp = {
        ext: {
          data: {
            aupname: '1234/mycoolsite/*&gpt_skyscraper&deviceType=mobile'
          }
        }
      };
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, bidRequest);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);

      clock.tick(SEND_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      expect(message.auctions[0].adUnits[0].pattern).to.equal('1234/mycoolsite/*&gpt_leaderboard&deviceType=mobile');
      expect(message.auctions[0].adUnits[1].pattern).to.equal('1234/mycoolsite/*&gpt_skyscraper&deviceType=mobile');
    });

    it('should pass gpid if defined', function () {
      let bidRequest = utils.deepClone(MOCK.BID_REQUESTED);
      bidRequest.bids[0].ortb2Imp = {
        ext: {
          gpid: '1234/mycoolsite/lowerbox'
        }
      };
      bidRequest.bids[1].ortb2Imp = {
        ext: {
          gpid: '1234/mycoolsite/leaderboard'
        }
      };
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, bidRequest);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);

      clock.tick(SEND_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);
      expect(message.auctions[0].adUnits[0].gpid).to.equal('1234/mycoolsite/lowerbox');
      expect(message.auctions[0].adUnits[1].gpid).to.equal('1234/mycoolsite/leaderboard');
    });

    it('should pass bidderDetail for multibid auctions', function () {
      let bidResponse = utils.deepClone(MOCK.BID_RESPONSE[1]);
      bidResponse.targetingBidder = 'rubi2';
      bidResponse.originalRequestId = bidResponse.requestId;
      bidResponse.requestId = '1a2b3c4d5e6f7g8h9';

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, bidResponse);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);

      clock.tick(SEND_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);

      let message = JSON.parse(server.requests[0].requestBody);
      validate(message);

      expect(message.auctions[0].adUnits[1].bids[1].bidder).to.equal('rubicon');
      expect(message.auctions[0].adUnits[1].bids[1].bidderDetail).to.equal('rubi2');
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
      addBidResponseHook(function (adCodeId, bid) {
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
      config.setConfig({
        rubicon: {
          int_type: 'testType'
        }
      })

      rubiconAnalyticsAdapter.enableAnalytics({
        options: {
          endpoint: '//localhost:9999/event',
          accountId: 1001
        }
      });

      performStandardAuction();

      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.integration).to.equal('testType');

      rubiconAnalyticsAdapter.disableAnalytics();
    });
  });

  describe('billing events integration', () => {
    beforeEach(function () {
      rubiconAnalyticsAdapter.enableAnalytics({
        options: {
          endpoint: '//localhost:9999/event',
          accountId: 1001
        }
      });
      // default dmBilling
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: false,
            vendors: [],
            waitForAuction: true
          }
        }
      })
    });
    afterEach(function () {
      rubiconAnalyticsAdapter.disableAnalytics();
    });
    const basicBillingAuction = (billingEvents = []) => {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

      // emit billing events
      billingEvents.forEach(ev => events.emit(BILLABLE_EVENT, ev));
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);
    }
    it('should ignore billing events when not enabled', () => {
      basicBillingAuction([{
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      }]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.billableEvents).to.be.undefined;
    });
    it('should ignore billing events when enabled but vendor is not whitelisted', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true
          }
        }
      });
      basicBillingAuction([{
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      }]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.billableEvents).to.be.undefined;
    });
    it('should ignore billing events if billingId is not defined or billingId is not a string', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName']
          }
        }
      });
      basicBillingAuction([
        {
          vendor: 'vendorName',
          type: 'auction',
        },
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: true
        },
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: 1233434
        },
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: null
        }
      ]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.billableEvents).to.be.undefined;
    });
    it('should pass along billing event in same payload', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName']
          }
        }
      });
      basicBillingAuction([{
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      }]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message).to.haveOwnProperty('auctions');
      expect(message.billableEvents).to.deep.equal([{
        accountId: 1001,
        vendor: 'vendorName',
        type: 'general', // mapping all events to endpoint as 'general' for now
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      }]);
    });
    it('should pass along multiple billing events but filter out duplicates', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName']
          }
        }
      });
      basicBillingAuction([
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
        },
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: '743db6e3-21f2-44d4-917f-cb3488c6076f'
        },
        {
          vendor: 'vendorName',
          type: 'auction',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
        }
      ]);
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message).to.haveOwnProperty('auctions');
      expect(message.billableEvents).to.deep.equal([
        {
          accountId: 1001,
          vendor: 'vendorName',
          type: 'general',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
        },
        {
          accountId: 1001,
          vendor: 'vendorName',
          type: 'general',
          billingId: '743db6e3-21f2-44d4-917f-cb3488c6076f'
        }
      ]);
    });
    it('should pass along event right away if no pending auction', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName']
          }
        }
      });

      events.emit(BILLABLE_EVENT, {
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      });
      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message).to.not.haveOwnProperty('auctions');
      expect(message.billableEvents).to.deep.equal([
        {
          accountId: 1001,
          vendor: 'vendorName',
          type: 'general',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
        }
      ]);
    });
    it('should pass along event right away if pending auction but not waiting', () => {
      // off by default
      config.setConfig({
        rubicon: {
          dmBilling: {
            enabled: true,
            vendors: ['vendorName'],
            waitForAuction: false
          }
        }
      });
      // should fire right away, and then auction later
      basicBillingAuction([{
        vendor: 'vendorName',
        type: 'auction',
        billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
      }]);
      expect(server.requests.length).to.equal(2);
      const billingRequest = server.requests[0];
      const billingMessage = JSON.parse(billingRequest.requestBody);
      expect(billingMessage).to.not.haveOwnProperty('auctions');
      expect(billingMessage.billableEvents).to.deep.equal([
        {
          accountId: 1001,
          vendor: 'vendorName',
          type: 'general',
          billingId: 'f8558d41-62de-4349-bc7b-2dbee1e69965'
        }
      ]);
      // auction event after
      const auctionRequest = server.requests[1];
      const auctionMessage = JSON.parse(auctionRequest.requestBody);
      // should not double pass events!
      expect(auctionMessage).to.not.haveOwnProperty('billableEvents');
    });
  });

  describe('wrapper details passed in', () => {
    it('should correctly pass in the wrapper details if provided', () => {
      config.setConfig({
        rubicon: {
          wrapperName: '1001_wrapperName_exp.4',
          wrapperFamily: '1001_wrapperName',
          rule_name: 'na-mobile'
        }
      });

      rubiconAnalyticsAdapter.enableAnalytics({
        options: {
          endpoint: '//localhost:9999/event',
          accountId: 1001
        }
      });

      performStandardAuction();

      expect(server.requests.length).to.equal(1);
      const request = server.requests[0];
      const message = JSON.parse(request.requestBody);
      expect(message.wrapper).to.deep.equal({
        name: '1001_wrapperName_exp.4',
        family: '1001_wrapperName',
        rule: 'na-mobile'
      });

      rubiconAnalyticsAdapter.disableAnalytics();
    });
  });

  it('getHostNameFromReferer correctly grabs hostname from an input URL', function () {
    let inputUrl = 'https://www.prebid.org/some/path?pbjs_debug=true';
    expect(getHostNameFromReferer(inputUrl)).to.equal('www.prebid.org');
    inputUrl = 'https://www.prebid.com/some/path?pbjs_debug=true';
    expect(getHostNameFromReferer(inputUrl)).to.equal('www.prebid.com');
    inputUrl = 'https://prebid.org/some/path?pbjs_debug=true';
    expect(getHostNameFromReferer(inputUrl)).to.equal('prebid.org');
    inputUrl = 'http://xn--p8j9a0d9c9a.xn--q9jyb4c/';
    expect(typeof getHostNameFromReferer(inputUrl)).to.equal('string');

    // not non-UTF char's in query / path which break if noDecodeWholeURL not set
    inputUrl = 'https://prebid.org/search_results/%95x%8Em%92%CA/?category=000';
    expect(getHostNameFromReferer(inputUrl)).to.equal('prebid.org');
  });
});
