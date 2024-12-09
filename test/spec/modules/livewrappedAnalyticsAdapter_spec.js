import livewrappedAnalyticsAdapter, { BID_WON_TIMEOUT } from 'modules/livewrappedAnalyticsAdapter.js';
import { AD_RENDER_FAILED_REASON, EVENTS, STATUS } from 'src/constants.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import { setConfig } from 'modules/currency.js';

let events = require('src/events');
let utils = require('src/utils');
let adapterManager = require('src/adapterManager').default;

const {
  AUCTION_INIT,
  AUCTION_END,
  BID_REQUESTED,
  BID_RESPONSE,
  BIDDER_DONE,
  BID_WON,
  BID_TIMEOUT,
  SET_TARGETING,
  AD_RENDER_FAILED
} = EVENTS;

const BID1 = {
  width: 980,
  height: 240,
  cpm: 1.1,
  originalCpm: 12.0,
  currency: 'USD',
  originalCurrency: 'FOO',
  timeToRespond: 200,
  bidId: '2ecff0db240757',
  requestId: '2ecff0db240757',
  adId: '2ecff0db240757',
  auctionId: '25c6d7f5-699a-4bfc-87c9-996f915341fa',
  mediaType: 'banner',
  meta: {
    data: 'value1'
  },
  dealId: 'dealid',
  getStatusCode() {
    return STATUS.GOOD;
  }
};

const BID2 = Object.assign({}, BID1, {
  width: 300,
  height: 250,
  cpm: 2.2,
  originalCpm: 23.0,
  currency: 'USD',
  originalCurrency: 'FOO',
  timeToRespond: 300,
  bidId: '3ecff0db240757',
  requestId: '3ecff0db240757',
  adId: '3ecff0db240757',
  meta: {
    data: 'value2'
  },
  dealId: undefined
});

const BID3 = {
  bidId: '4ecff0db240757',
  requestId: '4ecff0db240757',
  adId: '4ecff0db240757',
  auctionId: '25c6d7f5-699a-4bfc-87c9-996f915341fa',
  mediaType: 'banner',
  getStatusCode() {
    return STATUS.GOOD;
  }
};

const MOCK = {
  AUCTION_INIT: {
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
  },
  BID_REQUESTED: {
    'bidder': 'livewrapped',
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
    'bidderRequestId': '1be65d7958826a',
    'bids': [
      {
        'bidder': 'livewrapped',
        'adUnitCode': 'panorama_d_1',
        'bidId': '2ecff0db240757',
      },
      {
        'bidder': 'livewrapped',
        'adUnitCode': 'box_d_1',
        'bidId': '3ecff0db240757',
      },
      {
        'bidder': 'livewrapped',
        'adUnitCode': 'box_d_2',
        'bidId': '4ecff0db240757',
      }
    ],
    'start': 1519149562216
  },
  BID_RESPONSE: [
    BID1,
    BID2
  ],
  AUCTION_END: {
  },
  BID_WON: [
    Object.assign({}, BID1, {
      'status': 'rendered',
      'requestId': '2ecff0db240757'
    }),
    Object.assign({}, BID2, {
      'status': 'rendered',
      'requestId': '3ecff0db240757'
    })
  ],
  BIDDER_DONE: {
    'bidderCode': 'livewrapped',
    'bids': [
      BID1,
      BID2,
      BID3
    ]
  },
  BID_TIMEOUT: [
    {
      'bidId': '2ecff0db240757',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
    }
  ],
  AD_RENDER_FAILED: [
    {
      'bidId': '2ecff0db240757',
      'reason': AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
      'message': 'message',
      'bid': BID1
    }
  ]
};

const ANALYTICS_MESSAGE = {
  publisherId: 'CC411485-42BC-4F92-8389-42C503EE38D7',
  gdpr: [{}],
  auctionIds: ['25c6d7f5-699a-4bfc-87c9-996f915341fa'],
  bidAdUnits: [
    {
      adUnit: 'panorama_d_1',
      adUnitId: 'adunitid',
      timeStamp: 1519149562216
    },
    {
      adUnit: 'box_d_1',
      adUnitId: 'adunitid',
      timeStamp: 1519149562216
    }
  ],
  requests: [
    {
      adUnit: 'panorama_d_1',
      adUnitId: 'adunitid',
      bidder: 'livewrapped',
      timeStamp: 1519149562216,
      gdpr: 0,
      auctionId: 0
    },
    {
      adUnit: 'box_d_1',
      adUnitId: 'adunitid',
      bidder: 'livewrapped',
      timeStamp: 1519149562216,
      gdpr: 0,
      auctionId: 0
    },
    {
      adUnit: 'box_d_2',
      adUnitId: 'adunitid',
      bidder: 'livewrapped',
      timeStamp: 1519149562216,
      gdpr: 0,
      auctionId: 0
    }
  ],
  responses: [
    {
      timeStamp: 1519149562216,
      adUnit: 'panorama_d_1',
      adUnitId: 'adunitid',
      bidder: 'livewrapped',
      width: 980,
      height: 240,
      cpm: 1.1,
      orgCpm: 120,
      ttr: 200,
      IsBid: true,
      mediaType: 1,
      gdpr: 0,
      auctionId: 0,
      meta: {
        data: 'value1'
      }
    },
    {
      timeStamp: 1519149562216,
      adUnit: 'box_d_1',
      adUnitId: 'adunitid',
      bidder: 'livewrapped',
      width: 300,
      height: 250,
      cpm: 2.2,
      orgCpm: 230,
      ttr: 300,
      IsBid: true,
      mediaType: 1,
      gdpr: 0,
      auctionId: 0,
      meta: {
        data: 'value2'
      }
    },
    {
      timeStamp: 1519149562216,
      adUnit: 'box_d_2',
      adUnitId: 'adunitid',
      bidder: 'livewrapped',
      ttr: 200,
      IsBid: false,
      gdpr: 0,
      auctionId: 0
    }
  ],
  timeouts: [],
  wins: [
    {
      timeStamp: 1519149562216,
      adUnit: 'panorama_d_1',
      adUnitId: 'adunitid',
      bidder: 'livewrapped',
      width: 980,
      height: 240,
      cpm: 1.1,
      orgCpm: 120,
      mediaType: 1,
      gdpr: 0,
      auctionId: 0,
      meta: {
        data: 'value1'
      },
      dealId: 'dealid'
    },
    {
      timeStamp: 1519149562216,
      adUnit: 'box_d_1',
      adUnitId: 'adunitid',
      bidder: 'livewrapped',
      width: 300,
      height: 250,
      cpm: 2.2,
      orgCpm: 230,
      mediaType: 1,
      gdpr: 0,
      auctionId: 0,
      meta: {
        data: 'value2'
      }
    }
  ],
  rf: [
    {
      timeStamp: 1519149562216,
      adUnit: 'panorama_d_1',
      adUnitId: 'adunitid',
      bidder: 'livewrapped',
      auctionId: 0,
      rsn: AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
      msg: 'message'
    },
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
  events.emit(AD_RENDER_FAILED, MOCK.AD_RENDER_FAILED[0]);
}

describe('Livewrapped analytics adapter', function () {
  let sandbox;
  let clock;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    let element = {
      getAttribute: function() {
        return 'adunitid';
      }
    }
    sandbox.stub(events, 'getEvents').returns([]);
    sandbox.stub(utils, 'timestamp').returns(1519149562416);
    sandbox.stub(document, 'getElementById').returns(element);

    clock = sandbox.useFakeTimers(1519767013781);
    setConfig({
      adServerCurrency: 'USD',
      rates: {
        USD: {
          FOO: 0.1
        }
      }
    });
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  describe('when handling events', function () {
    adapterManager.registerAnalyticsAdapter({
      code: 'livewrapped',
      adapter: livewrappedAnalyticsAdapter
    });

    beforeEach(function () {
      adapterManager.enableAnalytics({
        provider: 'livewrapped',
        options: {
          publisherId: 'CC411485-42BC-4F92-8389-42C503EE38D7'
        }
      });
    });

    afterEach(function () {
      livewrappedAnalyticsAdapter.disableAnalytics();
    });

    it('should build a batched message from prebid events', function () {
      performStandardAuction();

      clock.tick(BID_WON_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];

      expect(request.url).to.equal('https://lwadm.com/analytics/10');

      let message = JSON.parse(request.requestBody);

      expect(message).to.deep.equal(ANALYTICS_MESSAGE);
    });

    it('should send batched message without BID_WON AND AD_RENDER_FAILED if necessary and further BID_WON and AD_RENDER_FAILED events individually', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BIDDER_DONE, MOCK.BIDDER_DONE);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(SET_TARGETING, MOCK.SET_TARGETING);
      events.emit(BID_WON, MOCK.BID_WON[0]);

      clock.tick(BID_WON_TIMEOUT + 1000);

      events.emit(BID_WON, MOCK.BID_WON[1]);
      events.emit(AD_RENDER_FAILED, MOCK.AD_RENDER_FAILED[0]);

      expect(server.requests.length).to.equal(3);

      let message = JSON.parse(server.requests[0].requestBody);
      expect(message.wins.length).to.equal(1);
      expect(message.requests).to.deep.equal(ANALYTICS_MESSAGE.requests);
      expect(message.wins[0]).to.deep.equal(ANALYTICS_MESSAGE.wins[0]);

      message = JSON.parse(server.requests[1].requestBody);
      expect(message.wins.length).to.equal(1);
      expect(message.wins[0]).to.deep.equal(ANALYTICS_MESSAGE.wins[1]);

      message = JSON.parse(server.requests[2].requestBody);
      expect(message.rf.length).to.equal(1);
      expect(message.rf[0]).to.deep.equal(ANALYTICS_MESSAGE.rf[0]);
    });

    it('should properly mark bids as timed out', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_TIMEOUT, MOCK.BID_TIMEOUT);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      clock.tick(BID_WON_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);

      let message = JSON.parse(server.requests[0].requestBody);
      expect(message.timeouts.length).to.equal(1);
      expect(message.timeouts[0].bidder).to.equal('livewrapped');
      expect(message.timeouts[0].adUnit).to.equal('panorama_d_1');
    });

    it('should forward GDPR data', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, {
        'bidder': 'livewrapped',
        'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
        'bidderRequestId': '1be65d7958826a',
        'bids': [
          {
            'bidder': 'livewrapped',
            'adUnitCode': 'panorama_d_1',
            'bidId': '2ecff0db240757',
          },
          {
            'bidder': 'livewrapped',
            'adUnitCode': 'box_d_1',
            'bidId': '3ecff0db240757',
          }
        ],
        'start': 1519149562216,
        'gdprConsent': {
          'gdprApplies': true,
          'consentString': 'consentstring'
        }
      },
      );

      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      clock.tick(BID_WON_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);

      expect(message.gdpr.length).to.equal(1);
      expect(message.gdpr[0].gdprApplies).to.equal(true);
      expect(message.gdpr[0].gdprConsent).to.equal('consentstring');
      expect(message.requests.length).to.equal(2);
      expect(message.requests[0].gdpr).to.equal(0);
      expect(message.requests[1].gdpr).to.equal(0);

      expect(message.responses.length).to.equal(1);
      expect(message.responses[0].gdpr).to.equal(0);

      expect(message.wins.length).to.equal(1);
      expect(message.wins[0].gdpr).to.equal(0);
    });

    it('should forward floor data', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, {
        'bidder': 'livewrapped',
        'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
        'bidderRequestId': '1be65d7958826a',
        'bids': [
          {
            'bidder': 'livewrapped',
            'adUnitCode': 'panorama_d_1',
            'bidId': '2ecff0db240757'
          }
        ],
        'start': 1519149562216
      });

      events.emit(BID_RESPONSE, Object.assign({},
        MOCK.BID_RESPONSE[0],
        {
          'floorData': {
            'floorValue': 1.1,
            'floorCurrency': 'FOO'
          }
        }));
      events.emit(BID_WON, Object.assign({},
        MOCK.BID_WON[0],
        {
          'floorData': {
            'floorValue': 1.1,
            'floorCurrency': 'FOO'
          }
        }));
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      clock.tick(BID_WON_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);

      expect(message.gdpr.length).to.equal(1);

      expect(message.responses.length).to.equal(1);
      expect(message.responses[0].floor).to.equal(1.1);
      expect(message.responses[0].floorCur).to.equal('FOO');

      expect(message.wins.length).to.equal(1);
      expect(message.wins[0].floor).to.equal(1.1);
      expect(message.wins[0].floorCur).to.equal('FOO');
    });

    it('should forward Livewrapped floor data', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, {
        'bidder': 'livewrapped',
        'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
        'bidderRequestId': '1be65d7958826a',
        'bids': [
          {
            'bidder': 'livewrapped',
            'adUnitCode': 'panorama_d_1',
            'bidId': '2ecff0db240757',
            'lwflr': {
              'flr': 1.1
            }
          },
          {
            'bidder': 'livewrapped',
            'adUnitCode': 'box_d_1',
            'bidId': '3ecff0db240757',
            'lwflr': {
              'flr': 1.1,
              'bflrs': {'livewrapped': 2.2}
            }
          }
        ],
        'start': 1519149562216
      });

      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(BID_WON, MOCK.BID_WON[0]);
      events.emit(BID_WON, MOCK.BID_WON[1]);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      clock.tick(BID_WON_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);

      expect(message.gdpr.length).to.equal(1);

      expect(message.responses.length).to.equal(2);
      expect(message.responses[0].floor).to.equal(1.1);
      expect(message.responses[1].floor).to.equal(2.2);

      expect(message.wins.length).to.equal(2);
      expect(message.wins[0].floor).to.equal(1.1);
      expect(message.wins[1].floor).to.equal(2.2);
    });

    it('should forward runner-up data as given by Livewrapped wrapper', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);

      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_WON, Object.assign({},
        MOCK.BID_WON[0],
        {
          'rUp': 'rUpObject'
        }));
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      clock.tick(BID_WON_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);

      expect(message.wins.length).to.equal(1);
      expect(message.wins[0].rUp).to.equal('rUpObject');
    });
  });

  describe('when given other endpoint', function () {
    adapterManager.registerAnalyticsAdapter({
      code: 'livewrapped',
      adapter: livewrappedAnalyticsAdapter
    });

    beforeEach(function () {
      adapterManager.enableAnalytics({
        provider: 'livewrapped',
        options: {
          publisherId: 'CC411485-42BC-4F92-8389-42C503EE38D7',
          endpoint: 'https://whitelabeled.com/analytics/10'
        }
      });
    });

    afterEach(function () {
      livewrappedAnalyticsAdapter.disableAnalytics();
    });

    it('should call the endpoint', function () {
      performStandardAuction();

      clock.tick(BID_WON_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];

      expect(request.url).to.equal('https://whitelabeled.com/analytics/10');
    });
  });

  describe('when given extended options', function () {
    adapterManager.registerAnalyticsAdapter({
      code: 'livewrapped',
      adapter: livewrappedAnalyticsAdapter
    });

    beforeEach(function () {
      adapterManager.enableAnalytics({
        provider: 'livewrapped',
        options: {
          publisherId: 'CC411485-42BC-4F92-8389-42C503EE38D7',
          ext: {
            testparam: 123
          }
        }
      });
    });

    afterEach(function () {
      livewrappedAnalyticsAdapter.disableAnalytics();
    });

    it('should forward the extended options', function () {
      performStandardAuction();

      clock.tick(BID_WON_TIMEOUT + 1000);

      expect(server.requests.length).to.equal(1);
      let request = server.requests[0];
      let message = JSON.parse(request.requestBody);

      expect(message.ext).to.not.equal(null);
      expect(message.ext.testparam).to.equal(123);
    });
  });
});
