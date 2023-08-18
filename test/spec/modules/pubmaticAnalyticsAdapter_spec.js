import pubmaticAnalyticsAdapter from 'modules/pubmaticAnalyticsAdapter.js';
import adapterManager from 'src/adapterManager.js';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config.js';
import {
  setConfig,
  addBidResponseHook,
} from 'modules/currency.js';

let events = require('src/events');
let ajax = require('src/ajax');
let utils = require('src/utils');

const DEFAULT_USER_AGENT = window.navigator.userAgent;
const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.5 Mobile/15E148 Safari/604.1';
const setUADefault = () => { window.navigator.__defineGetter__('userAgent', function () { return DEFAULT_USER_AGENT }) };
const setUAMobile = () => { window.navigator.__defineGetter__('userAgent', function () { return MOBILE_USER_AGENT }) };
const setUANull = () => { window.navigator.__defineGetter__('userAgent', function () { return null }) };

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
  'partnerImpId': 'partnerImpressionID-1',
  'adId': 'fake_ad_id',
  'source': 's2s',
  'requestId': '2ecff0db240757',
  'currency': 'USD',
  'creativeId': '3571560',
  'cpm': 1.22752,
  'originalCpm': 1.22752,
  'originalCurrency': 'USD',
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
    'hb_source': 'server'
  },
  getStatusCode() {
    return 1;
  }
};

const BID2 = Object.assign({}, BID, {
  adUnitCode: '/19968336/header-bid-tag-1',
  bidId: '3bd4ebb1c900e2',
  partnerImpId: 'partnerImpressionID-2',
  adId: 'fake_ad_id_2',
  requestId: '3bd4ebb1c900e2',
  width: 728,
  height: 90,
  mediaType: 'banner',
  cpm: 1.52,
  originalCpm: 1.52,
  dealId: 'the-deal-id',
  dealChannel: 'PMP',
  mi: 'matched-impression',
  seatBidId: 'aaaa-bbbb-cccc-dddd',
  adserverTargeting: {
    'hb_bidder': 'pubmatic',
    'hb_adid': '3bd4ebb1c900e2',
    'hb_pb': '1.500',
    'hb_size': '728x90',
    'hb_source': 'server'
  },
  meta: {
    advertiserDomains: ['example.com']
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
          'publisherId': '1001',
          'kgpv': 'this-is-a-kgpv'
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
        'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
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
        'adapterCode': 'pubmatic',
        'bidderCode': 'pubmatic',
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
        'adapterCode': 'pubmatic',
        'bidderCode': 'pubmatic',
        'params': {
          'publisherId': '1001',
          'kgpv': 'this-is-a-kgpv'
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
    'start': 1519149562216,
    'refererInfo': {
      'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    },
    'gdprConsent': {
      'consentString': 'here-goes-gdpr-consent-string',
      'gdprApplies': true
    }
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
      'bidId': '3bd4ebb1c900e2',
      'bidder': 'pubmatic',
      'adUnitCode': '/19968336/header-bid-tag-1',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
    }
  ]
};

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
    setUADefault();
    sandbox = sinon.sandbox.create();

    xhr = sandbox.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);

    sandbox.stub(events, 'getEvents').returns([]);

    clock = sandbox.useFakeTimers(1519767013781);

    config.setConfig({
      s2sConfig: {
        timeout: 1000,
        accountId: 10000,
        bidders: ['pubmatic']
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

    it('Logger: best case + win tracker', function() {
      this.timeout(5000)

      sandbox.stub($$PREBID_GLOBAL$$, 'getHighestCpmBids').callsFake((key) => {
        return [MOCK.BID_RESPONSE[0], MOCK.BID_RESPONSE[1]]
      });

      config.setConfig({
        testGroupId: 15
      });

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.pubid).to.equal('9999');
      expect(data.pid).to.equal('1111');
      expect(data.pdvid).to.equal('20');
      expect(data.iid).to.equal('25c6d7f5-699a-4bfc-87c9-996f915341fa');
      expect(data.to).to.equal('3000');
      expect(data.purl).to.equal('http://www.test.com/page.html');
      expect(data.orig).to.equal('www.test.com');
      expect(data.tst).to.equal(1519767016);
      expect(data.tgid).to.equal(15);
      expect(data.s).to.be.an('array');
      expect(data.s.length).to.equal(2);
      // slot 1
      expect(data.s[0].sn).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].sz).to.deep.equal(['640x480']);
      expect(data.s[0].ps).to.be.an('array');
      expect(data.s[0].ps.length).to.equal(1);
      expect(data.s[0].ps[0].pn).to.equal('pubmatic');
      expect(data.s[0].ps[0].bc).to.equal('pubmatic');
      expect(data.s[0].ps[0].bidid).to.equal('2ecff0db240757');
      expect(data.s[0].ps[0].piid).to.equal('partnerImpressionID-1');
      expect(data.s[0].ps[0].db).to.equal(0);
      expect(data.s[0].ps[0].kgpv).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].ps[0].kgpsv).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].ps[0].psz).to.equal('640x480');
      expect(data.s[0].ps[0].eg).to.equal(1.23);
      expect(data.s[0].ps[0].en).to.equal(1.23);
      expect(data.s[0].ps[0].di).to.equal('');
      expect(data.s[0].ps[0].dc).to.equal('');
      expect(data.s[0].ps[0].l1).to.equal(3214);
      expect(data.s[0].ps[0].l2).to.equal(0);
      expect(data.s[0].ps[0].ss).to.equal(1);
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
      expect(data.s[0].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].piid).to.equal('partnerImpressionID-2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1.52);
      expect(data.s[1].ps[0].en).to.equal(1.52);
      expect(data.s[1].ps[0].di).to.equal('the-deal-id');
      expect(data.s[1].ps[0].dc).to.equal('PMP');
      expect(data.s[1].ps[0].mi).to.equal('matched-impression');
      expect(data.s[1].ps[0].adv).to.equal('example.com');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(1);
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(1.52);
      expect(data.s[1].ps[0].ocry).to.equal('USD');

      // tracker slot1
      let firstTracker = requests[0].url;
      expect(firstTracker.split('?')[0]).to.equal('https://t.pubmatic.com/wt');
      data = {};
      firstTracker.split('?')[1].split('&').map(e => e.split('=')).forEach(e => data[e[0]] = e[1]);
      expect(data.pubid).to.equal('9999');
      expect(decodeURIComponent(data.purl)).to.equal('http://www.test.com/page.html');
      expect(data.tst).to.equal('1519767014');
      expect(data.iid).to.equal('25c6d7f5-699a-4bfc-87c9-996f915341fa');
      expect(data.bidid).to.equal('2ecff0db240757');
      expect(data.pid).to.equal('1111');
      expect(data.pdvid).to.equal('20');
      expect(decodeURIComponent(data.slot)).to.equal('/19968336/header-bid-tag-0');
      expect(decodeURIComponent(data.kgpv)).to.equal('/19968336/header-bid-tag-0');
      expect(data.pn).to.equal('pubmatic');
      expect(data.bc).to.equal('pubmatic');
      expect(data.eg).to.equal('1.23');
      expect(data.en).to.equal('1.23');
      expect(data.piid).to.equal('partnerImpressionID-1');
    });

    it('bidCpmAdjustment: USD: Logger: best case + win tracker', function() {
      const bidCopy = utils.deepClone(BID);
      bidCopy.cpm = bidCopy.originalCpm * 2; //  bidCpmAdjustment => bidCpm * 2
      this.timeout(5000)

      sandbox.stub($$PREBID_GLOBAL$$, 'getHighestCpmBids').callsFake((key) => {
        return [bidCopy, MOCK.BID_RESPONSE[1]]
      });

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, bidCopy);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BID_RESPONSE, bidCopy);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.pubid).to.equal('9999');
      expect(data.pid).to.equal('1111');
      expect(data.s).to.be.an('array');
      expect(data.s.length).to.equal(2);
      expect(data.tgid).to.equal(0);
      // slot 1
      expect(data.s[0].sn).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].sz).to.deep.equal(['640x480']);
      expect(data.s[0].ps).to.be.an('array');
      expect(data.s[0].ps.length).to.equal(1);
      expect(data.s[0].ps[0].pn).to.equal('pubmatic');
      expect(data.s[0].ps[0].bc).to.equal('pubmatic');
      expect(data.s[0].ps[0].bidid).to.equal('2ecff0db240757');
      expect(data.s[0].ps[0].kgpv).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].ps[0].eg).to.equal(1.23);
      expect(data.s[0].ps[0].en).to.equal(2.46);
      expect(data.s[0].ps[0].wb).to.equal(1);
      expect(data.s[0].ps[0].af).to.equal('video');
      expect(data.s[0].ps[0].ocpm).to.equal(1.23);
      expect(data.s[0].ps[0].ocry).to.equal('USD');
      // tracker slot1
      let firstTracker = requests[0].url;
      expect(firstTracker.split('?')[0]).to.equal('https://t.pubmatic.com/wt');
      data = {};
      firstTracker.split('?')[1].split('&').map(e => e.split('=')).forEach(e => data[e[0]] = e[1]);
      expect(data.pubid).to.equal('9999');
      expect(data.tst).to.equal('1519767014');
      expect(data.iid).to.equal('25c6d7f5-699a-4bfc-87c9-996f915341fa');
      expect(data.eg).to.equal('1.23');
      expect(data.en).to.equal('2.46');
    });

    it('bidCpmAdjustment: JPY: Logger: best case + win tracker', function() {
      config.setConfig({
        testGroupId: 25
      });

      setConfig({
        adServerCurrency: 'JPY',
        rates: {
          USD: {
            JPY: 100
          }
        }
      });
      const bidCopy = utils.deepClone(BID);
      bidCopy.originalCpm = 100;
      bidCopy.originalCurrency = 'JPY';
      bidCopy.currency = 'JPY';
      bidCopy.cpm = bidCopy.originalCpm * 2; //  bidCpmAdjustment => bidCpm * 2

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      // events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, bidCopy);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BID_RESPONSE, bidCopy);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.pubid).to.equal('9999');
      expect(data.pid).to.equal('1111');
      expect(data.tgid).to.equal(0);// test group id should be between 0-15 else set to 0
      expect(data.s).to.be.an('array');
      expect(data.s.length).to.equal(2);
      // slot 1
      expect(data.s[0].sn).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].sz).to.deep.equal(['640x480']);
      expect(data.s[0].ps).to.be.an('array');
      expect(data.s[0].ps.length).to.equal(1);
      expect(data.s[0].ps[0].pn).to.equal('pubmatic');
      expect(data.s[0].ps[0].bc).to.equal('pubmatic');
      expect(data.s[0].ps[0].bidid).to.equal('2ecff0db240757');
      expect(data.s[0].ps[0].kgpv).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].ps[0].eg).to.equal(1);
      expect(data.s[0].ps[0].en).to.equal(200);
      expect(data.s[0].ps[0].wb).to.equal(0); // bidPriceUSD is not getting set as currency module is not added, so unable to set wb to 1
      expect(data.s[0].ps[0].af).to.equal('video');
      expect(data.s[0].ps[0].ocpm).to.equal(100);
      expect(data.s[0].ps[0].ocry).to.equal('JPY');
      // tracker slot1
      let firstTracker = requests[0].url;
      expect(firstTracker.split('?')[0]).to.equal('https://t.pubmatic.com/wt');
      data = {};
      firstTracker.split('?')[1].split('&').map(e => e.split('=')).forEach(e => data[e[0]] = e[1]);
      expect(data.pubid).to.equal('9999');
      expect(data.tst).to.equal('1519767014');
      expect(data.iid).to.equal('25c6d7f5-699a-4bfc-87c9-996f915341fa');
      expect(data.eg).to.equal('1');
      expect(data.en).to.equal('200'); // bidPriceUSD is not getting set as currency module is not added
    });

    it('Logger: when bid is not submitted, default bid status 1 check: pubmatic set as s2s', function() {
      config.setConfig({
        testGroupId: '25'
      });

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(2); // 1 logger and 1 win-tracker
      let request = requests[1]; // logger is executed late, trackers execute first
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.tgid).to.equal(0);// test group id should be an INT between 0-15 else set to 0
      expect(data.s[1].sn).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].sz).to.deep.equal(['1000x300', '970x250', '728x90']);
      expect(data.s[1].ps).to.be.an('array');
      expect(data.s[1].ps.length).to.equal(1);
      expect(data.s[1].ps[0].pn).to.equal('pubmatic');
      expect(data.s[0].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].db).to.equal(1);
      expect(data.s[1].ps[0].kgpv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('0x0');
      expect(data.s[1].ps[0].eg).to.equal(0);
      expect(data.s[1].ps[0].en).to.equal(0);
      expect(data.s[1].ps[0].di).to.equal('');
      expect(data.s[1].ps[0].dc).to.equal('');
      expect(data.s[1].ps[0].mi).to.equal(undefined);
      expect(data.s[1].ps[0].l1).to.equal(0);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(0);
      expect(data.s[1].ps[0].af).to.equal(undefined);
      expect(data.s[1].ps[0].ocpm).to.equal(0);
      expect(data.s[1].ps[0].ocry).to.equal('USD');
    });

    it('Logger: post-timeout check without bid response', function() {
      // db = 1 and t = 1 means bidder did NOT respond with a bid but we got a timeout notification
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_TIMEOUT, MOCK.BID_TIMEOUT);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      clock.tick(2000 + 1000);

      expect(requests.length).to.equal(1); // 1 logger and 0 win-tracker
      let request = requests[0];
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.s[1].sn).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].sz).to.deep.equal(['1000x300', '970x250', '728x90']);
      expect(data.s[1].ps).to.be.an('array');
      expect(data.s[1].ps.length).to.equal(1);
      expect(data.s[1].ps[0].pn).to.equal('pubmatic');
      expect(data.s[0].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].db).to.equal(1);
      expect(data.s[1].ps[0].kgpv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('0x0');
      expect(data.s[1].ps[0].eg).to.equal(0);
      expect(data.s[1].ps[0].en).to.equal(0);
      expect(data.s[1].ps[0].di).to.equal('');
      expect(data.s[1].ps[0].dc).to.equal('');
      expect(data.s[1].ps[0].mi).to.equal(undefined);
      expect(data.s[1].ps[0].l1).to.equal(0);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(1);
      expect(data.s[1].ps[0].wb).to.equal(0);
      expect(data.s[1].ps[0].af).to.equal(undefined);
      expect(data.s[1].ps[0].ocpm).to.equal(0);
      expect(data.s[1].ps[0].ocry).to.equal('USD');
    });

    it('Logger: post-timeout check with bid response', function() {
      // db = 1 and t = 1 means bidder did NOT respond with a bid but we got a timeout notification

      sandbox.stub($$PREBID_GLOBAL$$, 'getHighestCpmBids').callsFake((key) => {
        return [MOCK.BID_RESPONSE[1]]
      });

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BID_TIMEOUT, MOCK.BID_TIMEOUT);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      clock.tick(2000 + 1000);

      expect(requests.length).to.equal(1); // 1 logger and 0 win-tracker
      let request = requests[0];
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.s[1].sn).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].sz).to.deep.equal(['1000x300', '970x250', '728x90']);
      expect(data.s[1].ps).to.be.an('array');
      expect(data.s[1].ps.length).to.equal(1);
      expect(data.s[1].ps[0].pn).to.equal('pubmatic');
      expect(data.s[1].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1.52);
      expect(data.s[1].ps[0].en).to.equal(1.52);
      expect(data.s[1].ps[0].di).to.equal('the-deal-id');
      expect(data.s[1].ps[0].dc).to.equal('PMP');
      expect(data.s[1].ps[0].mi).to.equal('matched-impression');
      expect(data.s[1].ps[0].adv).to.equal('example.com');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(1);
      expect(data.s[1].ps[0].wb).to.equal(1); // todo
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(1.52);
      expect(data.s[1].ps[0].ocry).to.equal('USD');
    });

    it('Logger: currency conversion check', function() {
      setUANull();
      setConfig({
        adServerCurrency: 'JPY',
        rates: {
          USD: {
            JPY: 100
          }
        }
      });
      const bidCopy = utils.deepClone(BID2);
      bidCopy.currency = 'JPY';
      bidCopy.cpm = 100;
      bidCopy.originalCpm = 100;
      bidCopy.originalCurrency = 'JPY';

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, bidCopy);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.s[1].sn).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].sz).to.deep.equal(['1000x300', '970x250', '728x90']);
      expect(data.s[1].ps).to.be.an('array');
      expect(data.s[1].ps.length).to.equal(1);
      expect(data.s[1].ps[0].pn).to.equal('pubmatic');
      expect(data.s[1].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1);
      expect(data.s[1].ps[0].en).to.equal(100);
      expect(data.s[1].ps[0].di).to.equal('the-deal-id');
      expect(data.s[1].ps[0].dc).to.equal('PMP');
      expect(data.s[1].ps[0].mi).to.equal('matched-impression');
      expect(data.s[1].ps[0].adv).to.equal('example.com');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(0); // bidPriceUSD is not getting set as currency module is not added, so unable to set wb to 1
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(100);
      expect(data.s[1].ps[0].ocry).to.equal('JPY');
      expect(data.dvc).to.deep.equal({'plt': 3});
    });

    it('Logger: regexPattern in bid.params', function() {
      setUAMobile();
      const BID_REQUESTED_COPY = utils.deepClone(MOCK.BID_REQUESTED);
      BID_REQUESTED_COPY.bids[1].params.regexPattern = '*';
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, BID_REQUESTED_COPY);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, BID2);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.s[1].sn).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].sz).to.deep.equal(['1000x300', '970x250', '728x90']);
      expect(data.s[1].ps).to.be.an('array');
      expect(data.s[1].ps.length).to.equal(1);
      expect(data.s[1].ps[0].pn).to.equal('pubmatic');
      expect(data.s[1].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('*');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1.52);
      expect(data.s[1].ps[0].en).to.equal(1.52);
      expect(data.s[1].ps[0].di).to.equal('the-deal-id');
      expect(data.s[1].ps[0].dc).to.equal('PMP');
      expect(data.s[1].ps[0].mi).to.equal('matched-impression');
      expect(data.s[1].ps[0].adv).to.equal('example.com');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(0); // bidPriceUSD is not getting set as currency module is not added, so unable to set wb to 1
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(1.52);
      expect(data.s[1].ps[0].ocry).to.equal('USD');
      expect(data.dvc).to.deep.equal({'plt': 2});
      // respective tracker slot
      let firstTracker = requests[1].url;
      expect(firstTracker.split('?')[0]).to.equal('https://t.pubmatic.com/wt');
      data = {};
      firstTracker.split('?')[1].split('&').map(e => e.split('=')).forEach(e => data[e[0]] = e[1]);
      expect(data.kgpv).to.equal('*');
    });

    it('Logger: regexPattern in bid.bidResponse and url in adomain', function() {
      const BID2_COPY = utils.deepClone(BID2);
      BID2_COPY.regexPattern = '*';
      BID2_COPY.meta.advertiserDomains = ['https://www.example.com/abc/223']
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, BID2_COPY);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, Object.assign({}, BID2_COPY, {
        'status': 'rendered'
      }));

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.s[1].sn).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].sz).to.deep.equal(['1000x300', '970x250', '728x90']);
      expect(data.s[1].ps).to.be.an('array');
      expect(data.s[1].ps.length).to.equal(1);
      expect(data.s[1].ps[0].pn).to.equal('pubmatic');
      expect(data.s[1].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('*');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1.52);
      expect(data.s[1].ps[0].en).to.equal(1.52);
      expect(data.s[1].ps[0].di).to.equal('the-deal-id');
      expect(data.s[1].ps[0].dc).to.equal('PMP');
      expect(data.s[1].ps[0].mi).to.equal('matched-impression');
      expect(data.s[1].ps[0].adv).to.equal('example.com');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(0); // bidPriceUSD is not getting set as currency module is not added, so unable to set wb to 1
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(1.52);
      expect(data.s[1].ps[0].ocry).to.equal('USD');
      expect(data.dvc).to.deep.equal({'plt': 1});
      // respective tracker slot
      let firstTracker = requests[1].url;
      expect(firstTracker.split('?')[0]).to.equal('https://t.pubmatic.com/wt');
      data = {};
      firstTracker.split('?')[1].split('&').map(e => e.split('=')).forEach(e => data[e[0]] = e[1]);
      expect(data.kgpv).to.equal('*');
    });

    it('Logger: regexPattern in bid.params', function() {
      const BID_REQUESTED_COPY = utils.deepClone(MOCK.BID_REQUESTED);
      BID_REQUESTED_COPY.bids[1].params.regexPattern = '*';
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, BID_REQUESTED_COPY);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, BID2);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.s[1].sn).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].sz).to.deep.equal(['1000x300', '970x250', '728x90']);
      expect(data.s[1].ps).to.be.an('array');
      expect(data.s[1].ps.length).to.equal(1);
      expect(data.s[1].ps[0].pn).to.equal('pubmatic');
      expect(data.s[1].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('*');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1.52);
      expect(data.s[1].ps[0].en).to.equal(1.52);
      expect(data.s[1].ps[0].di).to.equal('the-deal-id');
      expect(data.s[1].ps[0].dc).to.equal('PMP');
      expect(data.s[1].ps[0].mi).to.equal('matched-impression');
      expect(data.s[1].ps[0].adv).to.equal('example.com');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(0); // bidPriceUSD is not getting set as currency module is not added, so unable to set wb to 1
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(1.52);
      expect(data.s[1].ps[0].ocry).to.equal('USD');
      // respective tracker slot
      let firstTracker = requests[1].url;
      expect(firstTracker.split('?')[0]).to.equal('https://t.pubmatic.com/wt');
      data = {};
      firstTracker.split('?')[1].split('&').map(e => e.split('=')).forEach(e => data[e[0]] = e[1]);
      expect(data.kgpv).to.equal('*');
    });

    it('Logger: regexPattern in bid.bidResponse', function() {
      const BID2_COPY = utils.deepClone(BID2);
      BID2_COPY.regexPattern = '*';
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, BID2_COPY);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, Object.assign({}, BID2_COPY, {
        'status': 'rendered'
      }));

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.s[1].sn).to.equal('/19968336/header-bid-tag-1');
      expect(data.s[1].sz).to.deep.equal(['1000x300', '970x250', '728x90']);
      expect(data.s[1].ps).to.be.an('array');
      expect(data.s[1].ps.length).to.equal(1);
      expect(data.s[1].ps[0].pn).to.equal('pubmatic');
      expect(data.s[1].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('*');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1.52);
      expect(data.s[1].ps[0].en).to.equal(1.52);
      expect(data.s[1].ps[0].di).to.equal('the-deal-id');
      expect(data.s[1].ps[0].dc).to.equal('PMP');
      expect(data.s[1].ps[0].mi).to.equal('matched-impression');
      expect(data.s[1].ps[0].adv).to.equal('example.com');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(0); // bidPriceUSD is not getting set as currency module is not added, so unable to set wb to 1
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(1.52);
      expect(data.s[1].ps[0].ocry).to.equal('USD');
      // respective tracker slot
      let firstTracker = requests[1].url;
      expect(firstTracker.split('?')[0]).to.equal('https://t.pubmatic.com/wt');
      data = {};
      firstTracker.split('?')[1].split('&').map(e => e.split('=')).forEach(e => data[e[0]] = e[1]);
      expect(data.kgpv).to.equal('*');
    });

    it('Logger: best case + win tracker in case of Bidder Aliases', function() {
      MOCK.BID_REQUESTED['bids'][0]['bidder'] = 'pubmatic_alias';
      MOCK.BID_REQUESTED['bids'][0]['bidderCode'] = 'pubmatic_alias';
      adapterManager.aliasRegistry['pubmatic_alias'] = 'pubmatic';

      sandbox.stub($$PREBID_GLOBAL$$, 'getHighestCpmBids').callsFake((key) => {
        return [MOCK.BID_RESPONSE[0], MOCK.BID_RESPONSE[1]]
      });

      config.setConfig({
        testGroupId: 15
      });

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.pubid).to.equal('9999');
      expect(data.pid).to.equal('1111');
      expect(data.pdvid).to.equal('20');
      expect(data.iid).to.equal('25c6d7f5-699a-4bfc-87c9-996f915341fa');
      expect(data.to).to.equal('3000');
      expect(data.purl).to.equal('http://www.test.com/page.html');
      expect(data.orig).to.equal('www.test.com');
      expect(data.tst).to.equal(1519767016);
      expect(data.tgid).to.equal(15);
      expect(data.s).to.be.an('array');
      expect(data.s.length).to.equal(2);

      // slot 1
      expect(data.s[0].sn).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].sz).to.deep.equal(['640x480']);
      expect(data.s[0].ps).to.be.an('array');
      expect(data.s[0].ps.length).to.equal(1);
      expect(data.s[0].ps[0].pn).to.equal('pubmatic');
      expect(data.s[0].ps[0].bc).to.equal('pubmatic_alias');
      expect(data.s[0].ps[0].bidid).to.equal('2ecff0db240757');
      expect(data.s[0].ps[0].piid).to.equal('partnerImpressionID-1');
      expect(data.s[0].ps[0].db).to.equal(0);
      expect(data.s[0].ps[0].kgpv).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].ps[0].kgpsv).to.equal('/19968336/header-bid-tag-0');
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
      expect(data.s[1].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].piid).to.equal('partnerImpressionID-2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1.52);
      expect(data.s[1].ps[0].en).to.equal(1.52);
      expect(data.s[1].ps[0].di).to.equal('the-deal-id');
      expect(data.s[1].ps[0].dc).to.equal('PMP');
      expect(data.s[1].ps[0].mi).to.equal('matched-impression');
      expect(data.s[1].ps[0].adv).to.equal('example.com');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(1);
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(1.52);
      expect(data.s[1].ps[0].ocry).to.equal('USD');

      // tracker slot1
      let firstTracker = requests[0].url;
      expect(firstTracker.split('?')[0]).to.equal('https://t.pubmatic.com/wt');
      data = {};
      firstTracker.split('?')[1].split('&').map(e => e.split('=')).forEach(e => data[e[0]] = e[1]);
      expect(data.pubid).to.equal('9999');
      expect(decodeURIComponent(data.purl)).to.equal('http://www.test.com/page.html');
      expect(data.tst).to.equal('1519767014');
      expect(data.iid).to.equal('25c6d7f5-699a-4bfc-87c9-996f915341fa');
      expect(data.bidid).to.equal('2ecff0db240757');
      expect(data.pid).to.equal('1111');
      expect(data.pdvid).to.equal('20');
      expect(decodeURIComponent(data.slot)).to.equal('/19968336/header-bid-tag-0');
      expect(decodeURIComponent(data.kgpv)).to.equal('/19968336/header-bid-tag-0');
      expect(data.pn).to.equal('pubmatic');
      expect(data.bc).to.equal('pubmatic_alias');
      expect(data.eg).to.equal('1.23');
      expect(data.en).to.equal('1.23');
      expect(data.piid).to.equal('partnerImpressionID-1');
    });

    it('Logger: best case + win tracker in case of GroupM as alternate bidder', function() {
      MOCK.BID_REQUESTED['bids'][0]['bidderCode'] = 'groupm';
      sandbox.stub($$PREBID_GLOBAL$$, 'getHighestCpmBids').callsFake((key) => {
        return [MOCK.BID_RESPONSE[0], MOCK.BID_RESPONSE[1]]
      });

      config.setConfig({
        testGroupId: 15
      });

      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);

      clock.tick(2000 + 1000);
      expect(requests.length).to.equal(3); // 1 logger and 2 win-tracker
      let request = requests[2]; // logger is executed late, trackers execute first
      expect(request.url).to.equal('https://t.pubmatic.com/wl?pubid=9999');
      let data = getLoggerJsonFromRequest(request.requestBody);
      expect(data.pubid).to.equal('9999');
      expect(data.pid).to.equal('1111');
      expect(data.pdvid).to.equal('20');
      expect(data.iid).to.equal('25c6d7f5-699a-4bfc-87c9-996f915341fa');
      expect(data.to).to.equal('3000');
      expect(data.purl).to.equal('http://www.test.com/page.html');
      expect(data.orig).to.equal('www.test.com');
      expect(data.tst).to.equal(1519767016);
      expect(data.tgid).to.equal(15);
      expect(data.s).to.be.an('array');
      expect(data.s.length).to.equal(2);

      // slot 1
      expect(data.s[0].sn).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].sz).to.deep.equal(['640x480']);
      expect(data.s[0].ps).to.be.an('array');
      expect(data.s[0].ps.length).to.equal(1);
      expect(data.s[0].ps[0].pn).to.equal('pubmatic');
      expect(data.s[0].ps[0].bc).to.equal('groupm');
      expect(data.s[0].ps[0].bidid).to.equal('2ecff0db240757');
      expect(data.s[0].ps[0].piid).to.equal('partnerImpressionID-1');
      expect(data.s[0].ps[0].db).to.equal(0);
      expect(data.s[0].ps[0].kgpv).to.equal('/19968336/header-bid-tag-0');
      expect(data.s[0].ps[0].kgpsv).to.equal('/19968336/header-bid-tag-0');
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
      expect(data.s[1].ps[0].bc).to.equal('pubmatic');
      expect(data.s[1].ps[0].bidid).to.equal('3bd4ebb1c900e2');
      expect(data.s[1].ps[0].piid).to.equal('partnerImpressionID-2');
      expect(data.s[1].ps[0].db).to.equal(0);
      expect(data.s[1].ps[0].kgpv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].kgpsv).to.equal('this-is-a-kgpv');
      expect(data.s[1].ps[0].psz).to.equal('728x90');
      expect(data.s[1].ps[0].eg).to.equal(1.52);
      expect(data.s[1].ps[0].en).to.equal(1.52);
      expect(data.s[1].ps[0].di).to.equal('the-deal-id');
      expect(data.s[1].ps[0].dc).to.equal('PMP');
      expect(data.s[1].ps[0].mi).to.equal('matched-impression');
      expect(data.s[1].ps[0].adv).to.equal('example.com');
      expect(data.s[1].ps[0].l1).to.equal(3214);
      expect(data.s[1].ps[0].l2).to.equal(0);
      expect(data.s[1].ps[0].ss).to.equal(1);
      expect(data.s[1].ps[0].t).to.equal(0);
      expect(data.s[1].ps[0].wb).to.equal(1);
      expect(data.s[1].ps[0].af).to.equal('banner');
      expect(data.s[1].ps[0].ocpm).to.equal(1.52);
      expect(data.s[1].ps[0].ocry).to.equal('USD');

      // tracker slot1
      let firstTracker = requests[0].url;
      expect(firstTracker.split('?')[0]).to.equal('https://t.pubmatic.com/wt');
      data = {};
      firstTracker.split('?')[1].split('&').map(e => e.split('=')).forEach(e => data[e[0]] = e[1]);
      expect(data.pubid).to.equal('9999');
      expect(decodeURIComponent(data.purl)).to.equal('http://www.test.com/page.html');
      expect(data.tst).to.equal('1519767014');
      expect(data.iid).to.equal('25c6d7f5-699a-4bfc-87c9-996f915341fa');
      expect(data.bidid).to.equal('2ecff0db240757');
      expect(data.pid).to.equal('1111');
      expect(data.pdvid).to.equal('20');
      expect(decodeURIComponent(data.slot)).to.equal('/19968336/header-bid-tag-0');
      expect(decodeURIComponent(data.kgpv)).to.equal('/19968336/header-bid-tag-0');
      expect(data.pn).to.equal('pubmatic');
      expect(data.bc).to.equal('groupm');
      expect(data.eg).to.equal('1.23');
      expect(data.en).to.equal('1.23');
      expect(data.piid).to.equal('partnerImpressionID-1');
    });
  });
});
