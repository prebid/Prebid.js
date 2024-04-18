import konduitAnalyticsAdapter from 'modules/konduitAnalyticsAdapter';
import { expect } from 'chai';
import { config } from '../../../src/config.js';
import { server } from 'test/mocks/xhr.js';
import { EVENTS } from 'src/constants.js';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;

const eventsData = {
  [EVENTS.AUCTION_INIT]: {
    'auctionId': 'test_auction_id',
    'timestamp': Date.now(),
    'auctionStatus': 'inProgress',
    'adUnitCodes': ['video-test'],
    'timeout': 700
  },
  [EVENTS.BID_REQUESTED]: {
    'bidderCode': 'test_bidder_code',
    'time': Date.now(),
    'bids': [{
      'transactionId': 'test_transaction_id',
      'adUnitCode': 'video-test',
      'bidId': 'test_bid_id',
      'sizes': '640x480',
      'params': { 'testParam': 'test_param' }
    }]
  },
  [EVENTS.NO_BID]: {
    'bidderCode': 'test_bidder_code2',
    'transactionId': 'test_transaction_id',
    'adUnitCode': 'video-test',
    'bidId': 'test_bid_id'
  },
  [EVENTS.BID_RESPONSE]: {
    'bidderCode': 'test_bidder_code',
    'adUnitCode': 'video-test',
    'statusMessage': 'Bid available',
    'mediaType': 'video',
    'renderedSize': '640x480',
    'cpm': 0.5,
    'currency': 'USD',
    'netRevenue': true,
    'timeToRespond': 124,
    'requestId': 'test_request_id',
    'creativeId': 144876543
  },
  [EVENTS.AUCTION_END]: {
    'auctionId': 'test_auction_id',
    'timestamp': Date.now(),
    'auctionEnd': Date.now() + 400,
    'auctionStatus': 'completed',
    'adUnitCodes': ['video-test'],
    'timeout': 700
  },
  [EVENTS.BID_WON]: {
    'bidderCode': 'test_bidder_code',
    'adUnitCode': 'video-test',
    'statusMessage': 'Bid available',
    'mediaType': 'video',
    'renderedSize': '640x480',
    'cpm': 0.5,
    'currency': 'USD',
    'netRevenue': true,
    'timeToRespond': 124,
    'requestId': 'test_request_id',
    'creativeId': 144876543
  },
};

describe(`Konduit Analytics Adapter`, () => {
  const konduitId = 'test';

  beforeEach(function () {
    sinon.spy(konduitAnalyticsAdapter, 'track');
    sinon.stub(events, 'getEvents').returns([]);
    config.setConfig({ konduit: { konduitId } });
  });

  afterEach(function () {
    events.getEvents.restore();
    konduitAnalyticsAdapter.track.restore();
    konduitAnalyticsAdapter.disableAnalytics();
  });

  it(`should add all events to an aggregatedEvents queue
   inside konduitAnalyticsAdapter.context and send a request with correct data`, function () {
    server.respondWith(JSON.stringify({ key: 'test' }));

    adapterManager.registerAnalyticsAdapter({
      code: 'konduit',
      adapter: konduitAnalyticsAdapter
    });

    adapterManager.enableAnalytics({
      provider: 'konduit',
    });

    expect(konduitAnalyticsAdapter.context).to.be.an('object');
    expect(konduitAnalyticsAdapter.context.aggregatedEvents).to.be.an('array');

    const eventTypes = [
      EVENTS.AUCTION_INIT,
      EVENTS.BID_REQUESTED,
      EVENTS.NO_BID,
      EVENTS.BID_RESPONSE,
      EVENTS.BID_WON,
      EVENTS.AUCTION_END,
    ];
    const args = eventTypes.map(eventType => eventsData[eventType]);

    eventTypes.forEach((eventType, i) => {
      events.emit(eventType, args[i]);
    });

    server.respond();

    expect(konduitAnalyticsAdapter.context.aggregatedEvents.length).to.be.equal(6);
    expect(server.requests[0].url).to.match(/http(s):\/\/\w*\.konduit\.me\/analytics-initial-event/);

    const requestBody = JSON.parse(server.requests[0].requestBody);
    expect(requestBody.konduitId).to.be.equal(konduitId);
    expect(requestBody.prebidVersion).to.be.equal('$prebid.version$');
    expect(requestBody.environment).to.be.an('object');
  });
});
