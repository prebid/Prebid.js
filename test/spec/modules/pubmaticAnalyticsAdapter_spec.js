import pubmaticAnalyticsAdapter from 'modules/pubmaticAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config';
import {
  setConfig,
  addBidResponseHook,
} from 'modules/currency';

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
  'bidder': 'pubmatic',
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
    'hb_bidder': 'pubmatic',
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
  adUnitCode: '/19968336/header-bid-tag-1',
  bidId: '3bd4ebb1c900e2',
  adId: 'fake_ad_id',
  requestId: '3bd4ebb1c900e2',
  width: 728,
  height: 90,
  mediaType: 'banner',
  cpm: 1.52,
  source: 'server',
  seatBidId: 'aaaa-bbbb-cccc-dddd',
  adserverTargeting: {
    'hb_bidder': 'pubmatic',
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
      'code': '/19968336/header-bid-tag-1',
      'sizes': [[640, 480]],
      'bids': [ {
        'bidder': 'pubmatic',
        'params': {
          'publisherId': '1001'
        }
      } ],
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014'
    }
    ],
    'adUnitCodes': ['/19968336/header-bid-tag-1'],
    'bidderRequests': [ {
      'bidderCode': 'pubmatic',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
      'bidderRequestId': '1be65d7958826a',
      'bids': [ {
        'bidder': 'pubmatic',
        'params': {
          'publisherId': '1001'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[640, 480]]
          }
        },
        'adUnitCode': '/19968336/header-bid-tag-1',
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
    'timeout': 3000
  },
  BID_REQUESTED: {
    'bidder': 'pubmatic',
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
    'bidderRequestId': '1be65d7958826a',
    'bids': [
      {
        'bidder': 'pubmatic',
        'params': {
          'publisherId': '1001',
          'video': {
            'minduration': 30,
            'skippable': true
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
        'bidder': 'pubmatic',
        'params': {
          'publisherId': '1001'
        },
        'mediaTypes': {
          'banner': {
            'sizes': [[1000, 300], [970, 250], [728, 90]]
          }
        },
        'adUnitCode': '/19968336/header-bid-tag-1',
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
    'bidderCode': 'pubmatic',
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
      'bidder': 'pubmatic',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
    }
  ]
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

function getLoggerJsonFromRequest(requestBody) {
  return JSON.parse(decodeURIComponent(requestBody.split('json=')[1]));
}

describe('pubmatic analytics adapter', function () {
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
      }
    })
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  it('should require publisherId', function () {
    sandbox.stub(utils, 'logError');
    pubmaticAnalyticsAdapter.enableAnalytics({
      options: {}
    });
    expect(utils.logError.called).to.equal(true);
  });

  describe('when handling events', function() {
    beforeEach(function () {
      pubmaticAnalyticsAdapter.enableAnalytics({
        options: {
          publisherId: 9999,
          profileId: 1111,
          profileVersionId: 20
        }
      });
    });

    afterEach(function () {
      pubmaticAnalyticsAdapter.disableAnalytics();
    });

    // test cases
    // - Logger: best case consists all
    // -- dealId, dealChannel
    // -- mi: matched impression
    // -- defaultBids flag
    // -- kgpv case w/w/o
    // - Logger: Currency conversion
    // - Logger: mark post-time-out bids
    // - Tracker: bid details
    // - Tracker: w/o profileId, profileVersionId
    // - Tracker: Currency conversion

    it('logger: best case', function() {
      performStandardAuction();
      clock.tick(3000 + 1000); // read from the const
      expect(requests.length).to.equal(1);
      let request = requests[0];
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      console.log(JSON.stringify(data));
      expect(data.pubid).to.equal('9999');
      expect(data.pid).to.equal('1111');
      expect(data.pdvid).to.equal('20');
      expect(data.iid).to.equal('25c6d7f5-699a-4bfc-87c9-996f915341fa');
      expect(data.to).to.equal('3000');
      expect(data.purl).to.equal('http://www.test.com/page.html');
      expect(data.tst).to.equal(1519767016781);
      expect(data.s).to.be.an('array');
      expect(data.s.length).to.equal(2);
      // slot 1
      expect(data.s[0].sn).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].sz).to.deep.equal(['640x480']);
      expect(data.s[0].ps).to.be.an('array');
      expect(data.s[0].ps.length).to.equal(1);
      expect(data.s[0].ps[0].pn).to.equal('pubmatic');
      expect(data.s[0].ps[0].bidid).to.equal('2ecff0db240757');
      expect(data.s[0].ps[0].db).to.equal(0);
      expect(data.s[0].ps[0].kgpv).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].ps[0].psz).to.equal('640x480');
      expect(data.s[0].ps[0].eg).to.equal(1.23);
      expect(data.s[0].ps[0].en).to.equal(1.23);
      expect(data.s[0].ps[0].di).to.equal('');
      expect(data.s[0].ps[0].dc).to.equal('');
      expect(data.s[0].ps[0].l1).to.equal(3214);
      expect(data.s[0].ps[0].l2).to.equal(0);
      expect(data.s[0].ps[0].ss).to.equal(0);
      expect(data.s[0].ps[0].t).to.equal(0);
      expect(data.s[0].ps[0].wb).to.equal(1);
      expect(data.s[0].ps[0].af).to.equal('video');
      expect(data.s[0].ps[0].ocpm).to.equal(1.23);
      expect(data.s[0].ps[0].ocry).to.equal('USD');
      // slot 2
      expect(data.s[1].sn).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].sz).to.deep.equal(['1000x300', '970x250', '728x90']);
      expect(data.s[1].ps).to.be.an('array');
      expect(data.s[1].ps.length).to.equal(1);
      expect(data.s[1].ps[0].pn).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1.52);
      expect(data.s[1].ps[0].en).to.equal(1.52);
      expect(data.s[1].ps[0].di).to.equal('');
      expect(data.s[1].ps[0].dc).to.equal('');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(1);
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(1.52);
      expect(data.s[1].ps[0].ocry).to.equal('USD');
    });
  })
});
