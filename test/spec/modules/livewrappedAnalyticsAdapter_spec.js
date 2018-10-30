import livewrappedAnalyticsAdapter, { BID_WON_TIMEOUT } from 'modules/livewrappedAnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config';

let events = require('src/events');
let adaptermanager = require('src/adaptermanager');

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
  },
  STATUS: {
    GOOD
  }
} = CONSTANTS;

const BID1 = {
  width: 980,
  height: 240,
  cpm: 1.1,
  timeToRespond: 200,
  bidId: '2ecff0db240757',
  adId: '2ecff0db240757',
  auctionId: '25c6d7f5-699a-4bfc-87c9-996f915341fa',
  getStatusCode() {
    return CONSTANTS.STATUS.GOOD;
  }
};

const BID2 = Object.assign({}, BID1, {
  width: 300,
  height: 250,
  cpm: 2.2,
  timeToRespond: 300,
  bidId: '3ecff0db240757',
  adId: '3ecff0db240757',
});

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
      'status': 'rendered'
    }),
    Object.assign({}, BID2, {
      'status': 'rendered'
    })
  ],
  BIDDER_DONE: {
    'bidderCode': 'livewrapped',
    'bids': [
      BID1,
      BID2
    ]
  },
  BID_TIMEOUT: [
    {
      'bidId': '2ecff0db240757',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
    }
  ]
};

const ANALYTICS_MESSAGE = {
  publisherId: 'CC411485-42BC-4F92-8389-42C503EE38D7',
  requests: [
    {
      adUnit: 'panorama_d_1',
      bidder: 'livewrapped',
      timeStamp: 1519149562216
    },
    {
      adUnit: 'box_d_1',
      bidder: 'livewrapped',
      timeStamp: 1519149562216
    }
  ],
  responses: [
    {
      timeStamp: 1519149562216,
      adUnit: 'panorama_d_1',
      bidder: 'livewrapped',
      width: 980,
      height: 240,
      cpm: 1.1,
      ttr: 200,
      IsBid: true
    },
    {
      timeStamp: 1519149562216,
      adUnit: 'box_d_1',
      bidder: 'livewrapped',
      width: 300,
      height: 250,
      cpm: 2.2,
      ttr: 300,
      IsBid: true
    }
  ],
  timeouts: [],
  wins: [
    {
      timeStamp: 1519149562216,
      adUnit: 'panorama_d_1',
      bidder: 'livewrapped',
      width: 980,
      height: 240,
      cpm: 1.1
    },
    {
      timeStamp: 1519149562216,
      adUnit: 'box_d_1',
      bidder: 'livewrapped',
      width: 300,
      height: 250,
      cpm: 2.2
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

describe('Livewrapped analytics adapter', function () {
  let sandbox;
  let xhr;
  let requests;
  let clock;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    xhr = sandbox.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);

    sandbox.stub(events, 'getEvents').returns([]);

    clock = sandbox.useFakeTimers(1519767013781);
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  describe('when handling events', function () {
    adaptermanager.registerAnalyticsAdapter({
      code: 'livewrapped',
      adapter: livewrappedAnalyticsAdapter
    });

    beforeEach(function () {
      adaptermanager.enableAnalytics({
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

      expect(requests.length).to.equal(1);
      let request = requests[0];

      expect(request.url).to.equal('//lwadm.com/analytics/10');

      let message = JSON.parse(request.requestBody);

      expect(message).to.deep.equal(ANALYTICS_MESSAGE);
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

      clock.tick(BID_WON_TIMEOUT + 1000);

      events.emit(BID_WON, MOCK.BID_WON[1]);

      expect(requests.length).to.equal(2);

      let message = JSON.parse(requests[0].requestBody);
      expect(message.wins.length).to.equal(1);
      expect(message.requests).to.deep.equal(ANALYTICS_MESSAGE.requests);
      expect(message.wins[0]).to.deep.equal(ANALYTICS_MESSAGE.wins[0]);

      message = JSON.parse(requests[1].requestBody);
      expect(message.wins.length).to.equal(1);
      expect(message.wins[0]).to.deep.equal(ANALYTICS_MESSAGE.wins[1]);
    });

    it('should properly mark bids as timed out', function () {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_TIMEOUT, MOCK.BID_TIMEOUT);
      events.emit(AUCTION_END, MOCK.AUCTION_END);

      clock.tick(BID_WON_TIMEOUT + 1000);

      expect(requests.length).to.equal(1);

      let message = JSON.parse(requests[0].requestBody);
      expect(message.timeouts.length).to.equal(1);
      expect(message.timeouts[0].bidder).to.equal('livewrapped');
      expect(message.timeouts[0].adUnit).to.equal('panorama_d_1');
    });
  });
});
