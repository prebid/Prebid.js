import { expect } from 'chai';
import adaptermanager from 'src/adaptermanager';
import * as ajax from 'src/ajax';
import * as utils from 'src/utils';
import rubiconAnalyticsAdapter from 'modules/rubiconAnalyticsAdapter';
import _ from 'lodash';
import CONSTANTS from 'src/constants.json';

// using es6 "import * as events from 'src/events'" causes the events.getEvents stub not to work...
let events = require('src/events');

const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BID_WON,
    SET_TARGETING
  }
} = CONSTANTS;

const BID = {
  'bidder': 'rubicon',
  'width': 728,
  'height': 90,
  'statusMessage': 'Bid available',
  'adId': '2ecff0db240757',
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
  'auctionId': 'ff188d5a-82d0-4a6e-95c1-03563992a1c8',
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
  'size': '728x90',
  'adserverTargeting': {
    'hb_bidder': 'rubicon',
    'hb_adid': '2ecff0db240757',
    'hb_pb': '1.20',
    'hb_size': '728x90',
    'hb_source': 'client'
  }
};

const MOCK = {
  AUCTION_INIT: {
    'timestamp': 1519149536560,
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
    'timeout': 5000
  },
  BID_REQUESTED: {
    'bidder': 'rubicon',
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa',
    'bidderRequestId': '1be65d7958826a',
    'bids': [
      {
        'bidder': 'rubicon',
        'params': {
          'accountId': '14062',
          'siteId': '70608',
          'zoneId': '335918',
          'userId': '12346',
          'keywords': ['a', 'b', 'c'],
          'inventory': 'test',
          'visitor': {'ucat': 'new', 'lastsearch': 'iphone'},
          'position': 'btf'
        },
        'mediaType': 'banner',
        'adUnitCode': '/19968336/header-bid-tag-0',
        'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
        'sizes': [[1000, 300], [970, 250], [728, 90]],
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
    Object.assign({}, BID, {
      adUnitCode: '/19968336/header-bid-tag1',
      adId: '3bd4ebb1c900e2',
      requestId: '3bd4ebb1c900e2',
      rubiconTargeting: {
        'rpfl_elemid': '/19968336/header-bid-tag1',
        'rpfl_14062': '2_tier0100'
      },
      adserverTargeting: {
        'hb_bidder': 'rubicon',
        'hb_adid': '3bd4ebb1c900e2',
        'hb_pb': '1.20',
        'hb_size': '728x90',
        'hb_source': 'client'
      }
    })
  ],
  AUCTION_END: {
    'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
  },
  BID_WON: Object.assign({}, BID, {
    'status': 'rendered'
  }),
  BID_TIMEOUT: [
    {
      'bidId': '2ecff0db240757',
      'bidder': 'rubicon',
      'adUnitCode': '/19968336/header-bid-tag-0',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
    },
    {
      'bidId': '3bd4ebb1c900e2',
      'bidder': 'rubicon',
      'adUnitCode': '/19968336/header-bid-tag1',
      'auctionId': '25c6d7f5-699a-4bfc-87c9-996f915341fa'
    }
  ]
};

const ANALYTICS_MESSAGE = {
  eventTimeMillis: /\d+/,
  integration: 'pbjs',
  version: '$prebid.version$',
  referrerUri: 'http://test.com/page.html',
  domain: 'test.com',
  client: {
    deviceClass: 'mobile'
  },
  auctions: [{
    clientTimeoutMillis: 3000,
    serverTimeoutMillis: 3000,
    serverAccountId: 1001,
    adUnits: [{
      adUnitCode: '/19968336/header-bid-tag-0',
      mediaTypes: ['banner'],
      dimensions: [{
        width: 1000,
        height: 300
      }, {
        width: 970,
        height: 250
      }, {
        width: 728,
        height: 90
      }],
      bids: [{
        bidder: 'rubicon',
        transactionId: 'ca4af27a-6d02-4f90-949d-d5541fa12014',
        bidId: '2ecff0db240757',
        status: 'success',
        source: 'client',
        params: {
          accountId: '14062',
          siteId: '70608',
          zoneId: '335918',
        },
        clientLatencyMillis: 1000,
        bidResponse: {
          dimensions: {
            width: 728,
            height: 90
          },
          cpm: 1.22752,
          currency: 'USD',
          adserverTargeting: {
            hb_bidder: 'rubicon',
            hb_adid: '2ecff0db240757',
            hb_pb: '1.20',
            hb_size: '728x90',
            hb_source: 'client'
          }
        }
      }, {
        bidder: 'rubicon',
        transactionId: 'ca4af27a-6d02-4f90-949d-d5541fa12014',
        bidId: '3bd4ebb1c900e2',
        status: 'success',
        source: 'client',
        params: {
          accountId: '14062',
          siteId: '70608',
          zoneId: '335918',
        },
        clientLatencyMillis: 1000,
        bidResponse: {
          dimensions: {
            width: 728,
            height: 90
          },
          cpm: 1.5,
          currency: 'USD',
          adserverTargeting: {
            hb_bidder: 'rubicon',
            hb_adid: '3bd4ebb1c900e2',
            hb_pb: '1.50',
            hb_size: '728x90',
            hb_source: 'client'
          }
        }
      }]
    }]
  }],
  bidsWon: [
    '2ecff0db240757'
  ]
};

describe('rubicon analytics adapter', () => {
  let sandbox,
    ajaxStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.stub(events, 'getEvents').returns([]);
    ajaxStub = sandbox.stub(ajax, 'ajax');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should be configurable', () => {
    // TODO: determine configuration
  });

  describe('when handling events', () => {
    beforeEach(() => {
      rubiconAnalyticsAdapter.enableAnalytics();
    });

    afterEach(() => {
      rubiconAnalyticsAdapter.disableAnalytics();
    });

    it.skip('should build a batched message from prebid events', () => {
      events.emit(AUCTION_INIT, MOCK.AUCTION_INIT);
      events.emit(BID_REQUESTED, MOCK.BID_REQUESTED);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[0]);
      events.emit(BID_RESPONSE, MOCK.BID_RESPONSE[1]);
      events.emit(AUCTION_END, MOCK.AUCTION_END);
      events.emit(BID_WON, MOCK.BID_WON);

      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal(rubiconAnalyticsAdapter.getUrl());

      let message = JSON.parse(ajaxStub.firstCall.args[2]);

      expect(message).to.include(_.pick(ANALYTICS_MESSAGE, [
        'integration',
        'version',
        'referrerUri',
        'domain'
      ]));
    });

    it('should send batched message without BID_WON if necessary', () => {

    });

    it('should send BID_WON events individually if batched message it belong to was already sent', () => {

    });

    it('should properly mark bids as timed out', () => {

    });
  });
});
