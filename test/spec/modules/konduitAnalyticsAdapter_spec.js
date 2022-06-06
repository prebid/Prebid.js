import konduitAnalyticsAdapter from 'modules/konduitAnalyticsAdapter';
import { expect } from 'chai';
import { config } from '../../../src/config.js';
import { server } from 'test/mocks/xhr.js';
let events = require('src/events');
let adapterManager = require('src/adapterManager').default;
let CONSTANTS = require('src/constants.json');

const eventsData = {
  [CONSTANTS.EVENTS.AUCTION_INIT]: {
    'auctionId': 'test_auction_id',
    'timestamp': Date.now(),
    'auctionStatus': 'inProgress',
    'adUnitCodes': ['video-test'],
    'timeout': 700
  },
  [CONSTANTS.EVENTS.BID_REQUESTED]: {
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
  [CONSTANTS.EVENTS.NO_BID]: {
    'bidderCode': 'test_bidder_code2',
    'transactionId': 'test_transaction_id',
    'adUnitCode': 'video-test',
    'bidId': 'test_bid_id'
  },
  [CONSTANTS.EVENTS.BID_RESPONSE]: {
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
  [CONSTANTS.EVENTS.AUCTION_END]: {
    'auctionId': 'test_auction_id',
    'timestamp': Date.now(),
    'auctionEnd': Date.now() + 400,
    'auctionStatus': 'completed',
    'adUnitCodes': ['video-test'],
    'timeout': 700
  },
  [CONSTANTS.EVENTS.BID_WON]: {
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
      CONSTANTS.EVENTS.AUCTION_INIT,
      CONSTANTS.EVENTS.BID_REQUESTED,
      CONSTANTS.EVENTS.NO_BID,
      CONSTANTS.EVENTS.BID_RESPONSE,
      CONSTANTS.EVENTS.BID_WON,
      CONSTANTS.EVENTS.AUCTION_END,
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
    sinon.assert.callCount(konduitAnalyticsAdapter.track, 6);
  });
});
